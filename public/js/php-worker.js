// PHP, in a worker: a run that never ends (while (true) {}) does not freeze
// the deck, php.js terminates the worker instead. The build is the one of
// wasm_stack(), in castor.php: "castor wasm:build" writes it in ../build/.

let php;
let booting = boot();

async function boot() {
    const { default: createPhp } = await import('../build/php-web.mjs');
    php = await createPhp();
    const { stdout } = await php.runCode('echo PHP_VERSION;');

    return stdout;
}

self.addEventListener('message', async ({ data }) => {
    if ('boot' === data.type) {
        try {
            self.postMessage({ type: 'ready', version: await booting });
        } catch (error) {
            self.postMessage({ type: 'missing', message: String(error?.message ?? error) });
        }

        return;
    }

    const { id, code, args = [], stdin = '' } = data;
    try {
        await booting;
        const startedAt = performance.now();
        const result = await php.runCode(code, { args, stdin });
        self.postMessage({ type: 'result', id, ...result, ms: performance.now() - startedAt });
    } catch (error) {
        // The module aborted (a Fiber, all of its memory): what is in its
        // memory can not be trusted anymore, another one is created
        self.postMessage({ type: 'result', id, aborted: true, exitCode: null, stdout: '', stderr: String(error?.message ?? error) });
        booting = boot();
    }
});
