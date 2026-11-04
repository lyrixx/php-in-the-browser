// What the slides do beyond showing steps: the WebAssembly module of 41 bytes,
// the memory of the module, and PHP itself, live.

import { deck } from './deck.js';
import { t } from './i18n.js';
import { php } from './php.js';
import { typeset } from './typo.js';

const $ = (selector) => document.querySelector(selector);

/* The line of the talk, on the chapters: where we are */

const stations = deck.slides.filter((slide) => undefined !== slide.dataset.station);
for (const [current, chapter] of stations.entries()) {
    const line = document.createElement('ol');
    line.className = 'chapter__line';
    line.innerHTML = stations
        .map((station, i) => `<li class="${i < current ? 'is-done' : i === current ? 'is-current' : ''}">${station.dataset.station}</li>`)
        .join('');
    chapter.append(line);
}

/*
 * 41 bytes: a whole WebAssembly module, that adds two i32. The file is shown
 * whole, then read a section at a time, byte by byte.
 */

// [bytes, what they say, true for the start that every section shares: its
// number, then its size]
const SECTIONS = [
    {
        badge: '\\0asm', color: 'var(--yellow)',
        name: t({ fr: 'en-tête', en: 'header' }),
        question: t({ fr: 'C\'est bien du WebAssembly ?', en: 'Is it WebAssembly?' }),
        sum: t({ fr: 'oui, version 1', en: 'yes, version 1' }),
        lines: [
            [[0x00, 0x61, 0x73, 0x6d], t({ fr: '<code>"\\0asm"</code> : le « nombre magique »', en: '<code>"\\0asm"</code>: the “magic number”' })],
            [[0x01, 0x00, 0x00, 0x00], 'version 1'],
        ],
    },
    {
        badge: '01', color: '#ff9cc6',
        name: 'types',
        question: t({ fr: 'Quelles signatures ?', en: 'Which signatures?' }),
        sum: t({ fr: 'type 0 = (i32, i32) → i32', en: 'type 0 = (i32, i32) → i32' }),
        lines: [
            [[0x01], t({ fr: 'section n° 1 : les types', en: 'section #1: the types' }), true],
            [[0x07], t({ fr: 'elle fait 7 octets', en: 'it is 7 bytes long' }), true],
            [[0x01], t({ fr: '1 type', en: '1 type' })],
            [[0x60], t({ fr: 'une fonction…', en: 'a function…' })],
            [[0x02, 0x7f, 0x7f], t({ fr: '…qui prend 2 paramètres : <code>i32</code>, <code>i32</code>', en: '…that takes 2 parameters: <code>i32</code>, <code>i32</code>' })],
            [[0x01, 0x7f], t({ fr: '…et renvoie 1 résultat : <code>i32</code>', en: '…and returns 1 result: <code>i32</code>' })],
        ],
    },
    {
        badge: '03', color: '#8fe3c4',
        name: t({ fr: 'fonctions', en: 'functions' }),
        question: t({ fr: 'Quelles fonctions ?', en: 'Which functions?' }),
        sum: t({ fr: 'fonction 0, de type 0', en: 'function 0, of type 0' }),
        lines: [
            [[0x03], t({ fr: 'section n° 3 : les fonctions', en: 'section #3: the functions' }), true],
            [[0x02], t({ fr: 'elle fait 2 octets', en: 'it is 2 bytes long' }), true],
            [[0x01], t({ fr: '1 fonction', en: '1 function' })],
            [[0x00], t({ fr: 'de type 0 : son code est plus loin', en: 'of type 0: its code comes later' })],
        ],
    },
    {
        badge: '07', color: '#a9cbff',
        name: 'exports',
        question: t({ fr: 'Que voit JavaScript ?', en: 'What does JavaScript see?' }),
        sum: t({ fr: '"add" = la fonction 0', en: '"add" = function 0' }),
        lines: [
            [[0x07], t({ fr: 'section n° 7 : les exports', en: 'section #7: the exports' }), true],
            [[0x07], t({ fr: 'elle fait 7 octets', en: 'it is 7 bytes long' }), true],
            [[0x01], t({ fr: '1 export', en: '1 export' })],
            [[0x03, 0x61, 0x64, 0x64], t({ fr: 'un nom de 3 lettres : <code>a</code> <code>d</code> <code>d</code>', en: 'a name of 3 letters: <code>a</code> <code>d</code> <code>d</code>' })],
            [[0x00], t({ fr: 'c\'est une fonction…', en: 'it is a function…' })],
            [[0x00], t({ fr: '…la fonction 0', en: '…function 0' })],
        ],
    },
    {
        badge: '0a', color: '#c2b5ff',
        name: 'code',
        question: t({ fr: 'Que fait la fonction ?', en: 'What does the function do?' }),
        sum: t({ fr: 'la machine à pile', en: 'the stack machine' }),
        lines: [
            [[0x0a], t({ fr: 'section n° 10 : le code', en: 'section #10: the code' }), true],
            [[0x09], t({ fr: 'elle fait 9 octets', en: 'it is 9 bytes long' }), true],
            [[0x01], t({ fr: '1 fonction', en: '1 function' })],
            [[0x07], t({ fr: 'son code fait 7 octets', en: 'its code is 7 bytes long' })],
            [[0x00], t({ fr: 'aucune variable locale', en: 'no local variable' })],
            [[0x20, 0x00], '<code>local.get 0</code>'],
            [[0x20, 0x01], '<code>local.get 1</code>'],
            [[0x6a], '<code>i32.add</code>'],
            [[0x0b], '<code>end</code>'],
        ],
    },
];

const hex = (byte) => byte.toString(16).padStart(2, '0');
const bytesOf = (section) => section.lines.flatMap(([bytes]) => bytes);

const strip = SECTIONS
    .flatMap((section, i) => bytesOf(section).map((byte) => `<i data-states="${i + 1}:on ${i + 2}:done" style="--c: ${section.color}">${hex(byte)}</i>`))
    .join('');

const zooms = SECTIONS.map((section, i) => `
    <div class="b41__zoom" data-step="${i + 1}" data-until="${i + 2}" style="--c: ${section.color}">
        <div class="b41__badge">
            <span class="b41__num bytes">${section.badge}</span>
            <h3>${section.name}</h3>
            <p class="b41__question">${section.question}</p>
            <p class="b41__sum">${section.sum}</p>
        </div>
        <ol class="b41__lines">
            ${section.lines.map(([bytes, text, head], n) => `
                <li class="${head ? 'is-head' : ''}" style="--n: ${n}">
                    <span class="bytes">${bytes.map((byte) => `<i>${hex(byte)}</i>`).join('')}</span>
                    <span>${text}</span>
                </li>
            `).join('')}
        </ol>
    </div>
`).join('');

$('#b41').innerHTML = `
    <div class="b41__file"><span class="mono">add.wasm</span><span class="b41__strip">${strip}</span></div>
    <div class="swap b41__stage">
        <div class="b41__intro" data-until="1">
            <p>${t({ fr: 'Un en-tête, puis des <b>sections</b>, qui commencent toutes pareil :', en: 'A header, then <b>sections</b>, that all start the same way:' })}</p>
            <div class="b41__pattern">${t({ fr: '<i>n°</i><i>taille</i><i>contenu…</i>', en: '<i>#</i><i>size</i><i>content…</i>' })}</div>
            <p class="muted">${t({ fr: 'Lisons-le, section par section.', en: 'Let’s read it, one section at a time.' })}</p>
        </div>
        ${zooms}
    </div>
`;
$('.b41__stage').append($('.b41__run'));
typeset($('#b41'));

const module41 = WebAssembly.compile(new Uint8Array(SECTIONS.flatMap(bytesOf)));

async function add() {
    const { exports } = await WebAssembly.instantiate(await module41);
    const result = $('#b41-result');
    result.textContent = String(exports.add(Number($('#b41-a').value) | 0, Number($('#b41-b').value) | 0));
    result.classList.remove('is-new');
    void result.offsetWidth;
    result.classList.add('is-new');
}

deck.on('bytes', (step) => {
    if (6 === step) {
        add();
    } else {
        $('#b41-result').textContent = '?';
    }
});
for (const input of [$('#b41-a'), $('#b41-b')]) {
    input.addEventListener('input', add);
}

/* The memory of the module: a string copied in it, byte by byte */

const CODE = "echo 'Salut';";
const FIRST_ADDRESS = 1044;
const POINTER = 1048;
const CELLS = 22;

const codeBytes = [...new TextEncoder().encode(CODE), 0];

$('#mem-bytes').innerHTML = codeBytes
    .map((byte, i) => `<span data-step="1" data-dim="3" style="--i: ${i}"><b>${0 === byte ? '\\0' : String.fromCharCode(byte)}</b><small>${hex(byte)}</small></span>`)
    .join('');

const tape = [];
for (let i = 0; i < CELLS; i++) {
    const address = FIRST_ADDRESS + i;
    const used = address - POINTER;
    const inside = used >= 0 && used < codeBytes.length;
    tape.push(`
        <span class="tape__cell" ${inside ? `data-states="2:reserved 3:filled 4:read 5:free" style="--i: ${used}"` : ''}>
            <b>${inside ? `<span class="v">${hex(codeBytes[used])}</span>` : ''}</b>
            <small>${address}</small>
        </span>
    `);
}
$('#mem-tape').innerHTML = `${tape.join('')}<span class="tape__ptr" data-step="2" data-until="5" data-anim="down" style="--at: ${POINTER - FIRST_ADDRESS}">ptr</span>`;

/* PHP, live: the outputs of [data-php-run], once shown */

for (const element of document.querySelectorAll('[data-php-run]')) {
    element.textContent = element.dataset.fallback;
}

function runLive(slide) {
    if ('ready' !== php.state) {
        return;
    }
    for (const element of slide.querySelectorAll('[data-php-run]:not([data-ran])')) {
        const step = element.closest('[data-step]');
        if (step && !step.classList.contains('is-shown')) {
            continue;
        }
        element.dataset.ran = '';
        php.run(element.dataset.phpRun).then((result) => {
            if (result.missing || result.timedOut || result.aborted) {
                delete element.dataset.ran;

                return;
            }
            element.textContent = (result.stdout + result.stderr).trim();
            element.classList.add('is-live');
        });
    }
}

document.addEventListener('deck:change', ({ detail: { slide } }) => runLive(slide));
document.addEventListener('php:state', () => runLive(deck.slides[deck.index]));

/* The API, run for real */

const quote = (value) => JSON.stringify(value);

async function runApi() {
    const output = $('#api-output');
    output.classList.remove('is-error');
    output.textContent = '…';
    const stdin = t({ fr: 'salut', en: 'hello' });
    const result = await php.run('echo ucfirst(file_get_contents("php://stdin")), " ", $argv[1];', { stdin, args: ['🐘'] });
    if (result.missing) {
        output.textContent = `{ exitCode: 0, stdout: "${stdin[0].toUpperCase()}${stdin.slice(1)} 🐘", stderr: "" }`;

        return;
    }
    output.textContent = `{ exitCode: ${result.exitCode}, stdout: ${quote(result.stdout)}, stderr: ${quote(result.stderr)} }`;
    output.insertAdjacentHTML('beforeend', `<span class="output-meta">\n// ${t({
        fr: `en ${result.ms.toFixed(1)} ms : PHP a démarré, exécuté, et s'est arrêté`,
        en: `in ${result.ms.toFixed(1)} ms: PHP started, ran, and stopped`,
    })}</span>`);
}

$('#api-run').addEventListener('click', runApi);
deck.on('api', (step) => {
    if (1 === step) {
        runApi();
    } else {
        $('#api-output').textContent = '{ … }';
    }
});

/* The playground */

const PRESETS = [
    ['👋 ' + t({ fr: 'Salut', en: 'Hello' }), t({
        fr: `echo "Salut depuis ", php_uname(), "\\n";
echo "PHP ", PHP_VERSION, ", ", PHP_INT_SIZE * 8, " bits\\n";
echo mb_strtoupper("éléphant 🐘"), "\\n";`,
        en: `echo "Hello from ", php_uname(), "\\n";
echo "PHP ", PHP_VERSION, ", ", PHP_INT_SIZE * 8, " bits\\n";
echo mb_strtoupper("éléphant 🐘"), "\\n";`,
    })],
    ['🧩 DOM', `$dom = new DOMDocument();
$dom->loadXML('<talk><title>${t({ fr: 'PHP dans le navigateur', en: 'PHP in the browser' })}</title></talk>');

echo $dom->getElementsByTagName('title')->item(0)->textContent;`],
    ['🔌 Extensions', `echo implode(", ", get_loaded_extensions());`],
    ['🔢 32 bits', `var_dump(PHP_INT_MAX);
var_dump(PHP_INT_MAX + 1);`],
    ['🧵 Fiber', `$fiber = new Fiber(fn () => print "${t({ fr: 'Dans la Fiber', en: 'In the Fiber' })}\\n");
$fiber->start();`],
    ['♾️ while (true)', `while (true) {
    // ${t({ fr: 'PHP ne s\'arrêtera pas tout seul', en: 'PHP will not stop on its own' })}
}`],
];

const editor = $('#repl-code');
const presets = $('#repl-presets');

for (const [label, code] of PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'repl__preset';
    button.textContent = label;
    button.addEventListener('click', () => {
        editor.value = code;
        for (const other of presets.children) {
            other.setAttribute('aria-pressed', String(other === button));
        }
        runRepl();
    });
    presets.append(button);
}
editor.value = PRESETS[0][1];
presets.firstElementChild.setAttribute('aria-pressed', 'true');

async function runRepl() {
    const output = $('#repl-output');
    const meta = $('#repl-meta');
    output.classList.remove('is-error');
    output.textContent = '…';
    meta.textContent = '';

    const result = await php.run(editor.value);
    if (result.missing) {
        output.textContent = t({ fr: 'PHP n\'est pas chargé : lancez "castor slides:serve".', en: 'PHP is not loaded: run "castor slides:serve".' });
        output.classList.add('is-error');
    } else if (result.timedOut) {
        output.textContent = t({
            fr: '⏱️ Toujours pas fini au bout de 4 s.\nLe worker est tué, un nouveau PHP démarre.',
            en: '⏱️ Still not done after 4 s.\nThe worker is killed, a new PHP starts.',
        });
        output.classList.add('is-error');
    } else if (result.aborted) {
        output.textContent = `💥 ${result.stderr}\n\n${t({ fr: 'Le module est mort : on en crée un autre.', en: 'The module is dead: a new one is created.' })}`;
        output.classList.add('is-error');
    } else {
        output.textContent = (result.stdout + result.stderr).replace(/^\n+/, '');
        meta.textContent = `exit ${result.exitCode} · ${t({
            fr: `${result.ms.toFixed(1)} ms pour démarrer PHP, exécuter, et l'arrêter`,
            en: `${result.ms.toFixed(1)} ms to start PHP, run, and stop it`,
        })}`;
    }
}

$('#repl-run').addEventListener('click', runRepl);
editor.addEventListener('keydown', (event) => {
    if ('Enter' === event.key && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        runRepl();
    }
});
deck.on('repl', (step, slide, { entered }) => {
    if (entered && '' === $('#repl-output').textContent) {
        runRepl();
    }
});
