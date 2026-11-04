// The PHP of the deck: it runs in a worker (php-worker.js), killed and created
// again when a run takes too long. Every .php-status of the deck says where it
// is, every [data-php-version] gets its version.

import { t } from './i18n.js';

const TIMEOUT_MS = 4000;

let worker;
let version;
let state = 'loading';
let ready;
let nextId = 0;
const pending = new Map();

function spawn() {
    worker = new Worker(new URL('./php-worker.js', import.meta.url), { type: 'module' });
    ready = new Promise((resolve) => {
        worker.addEventListener('message', function onBoot({ data }) {
            if ('ready' === data.type) {
                version = data.version;
                setState('ready');
                resolve(true);
            } else if ('missing' === data.type) {
                console.warn('PHP is not loaded, run "castor slides:serve":', data.message);
                setState('missing');
                resolve(false);
            } else {
                return;
            }
            worker.removeEventListener('message', onBoot);
        });
    });
    worker.addEventListener('message', ({ data }) => {
        if ('result' !== data.type || !pending.has(data.id)) {
            return;
        }
        pending.get(data.id)(data);
        pending.delete(data.id);
    });
    worker.addEventListener('error', (event) => {
        console.warn('The PHP worker failed:', event.message);
        setState('missing');
    });
    worker.postMessage({ type: 'boot' });
}

function setState(next) {
    state = next;
    for (const element of document.querySelectorAll('.php-status')) {
        element.dataset.state = state;
        element.textContent = t({
            fr: {
                loading: 'PHP démarre…',
                ready: `PHP ${version} tourne dans cette page`,
                missing: 'PHP absent\u00a0: castor slides:serve',
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
     * Runs some code, as php -r does: resolves with { exitCode, stdout,
     * stderr, ms }, with timedOut or aborted when PHP did not get to the end.
     */
    async run(code, { args = [], stdin = '' } = {}) {
        if (!(await ready)) {
            return { missing: true, exitCode: null, stdout: '', stderr: '' };
        }

        const id = ++nextId;

        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                pending.delete(id);
                worker.terminate();
                setState('loading');
                spawn();
                resolve({ timedOut: true, exitCode: null, stdout: '', stderr: '' });
            }, TIMEOUT_MS);
            pending.set(id, (result) => {
                clearTimeout(timer);
                resolve(result);
            });
            worker.postMessage({ id, code, args, stdin });
        });
    },
};

spawn();
setState('loading');
