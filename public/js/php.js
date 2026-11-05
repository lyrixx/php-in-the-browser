// The PHP of the deck: createPhpInWorker() runs it in a worker, terminated and
// created again when a run takes too long, or aborts the module. Every
// .php-status of the deck says where it is, every [data-php-version] gets its
// version. The build is the one of wasm_stack(), in castor.php: "castor
// wasm:build" writes it in ../build/.

import { t } from './i18n.js';

const TIMEOUT_MS = 4000;
const NOT_RUN = { exitCode: null, stdout: '', stderr: '' };

let runtime;
let version;
let state = 'loading';
let ready;

async function boot() {
    setState('loading');
    try {
        const { createPhpInWorker } = await import('../build/php-web.mjs');
        runtime = await createPhpInWorker();
        ({ stdout: version } = await runtime.runCode('echo PHP_VERSION;'));
        setState('ready');

        return true;
    } catch (error) {
        console.warn('PHP is not loaded, run "castor slides:serve":', error);
        setState('missing');

        return false;
    }
}

function restart() {
    runtime.terminate();
    ready = boot();
}

function setState(next) {
    state = next;
    for (const element of document.querySelectorAll('.php-status')) {
        element.dataset.state = state;
        element.textContent = t({
            fr: {
                loading: 'PHP démarre…',
                ready: `PHP ${version} tourne dans cette page`,
                missing: 'PHP absent : castor slides:serve',
            },
            en: {
                loading: 'PHP is starting…',
                ready: `PHP ${version} runs in this page`,
                missing: 'No PHP: castor slides:serve',
            },
        })[state];
    }
    for (const element of document.querySelectorAll('[data-php-version]')) {
        element.textContent = 'ready' === state ? version : element.dataset.phpVersion;
    }
    document.dispatchEvent(new CustomEvent('php:state', { detail: { state, version } }));
}

export const php = {
    get state() {
        return state;
    },

    get version() {
        return version;
    },

    /**
     * Calls PHP: resolves with what fn(runtime) resolves with, and ms. With
     * missing, timedOut or aborted when PHP did not get to the end.
     */
    async call(fn) {
        if (!(await ready)) {
            return { missing: true, ...NOT_RUN };
        }

        let timer;
        const timeout = new Promise((resolve) => {
            timer = setTimeout(() => resolve({ timedOut: true, ...NOT_RUN }), TIMEOUT_MS);
        });
        const startedAt = performance.now();
        try {
            const result = await Promise.race([fn(runtime), timeout]);
            if (result?.timedOut) {
                restart();

                return result;
            }

            return { ...result, ms: performance.now() - startedAt };
        } catch (error) {
            // The module aborted (a Fiber, all of its stack): what is in its
            // memory can not be trusted anymore, another one is created
            restart();

            return { aborted: true, ...NOT_RUN, stderr: String(error?.message ?? error) };
        } finally {
            clearTimeout(timer);
        }
    },

    /**
     * Runs some code, as php -r does: resolves with { exitCode, stdout,
     * stderr, ms }, see call().
     */
    run(code, { args = [], stdin = '' } = {}) {
        return this.call((runtime) => runtime.runCode(code, { args, stdin }));
    },
};

ready = boot();
