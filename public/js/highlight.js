// A small highlighter, for the code of the slides only: a line at a time, by
// regular expressions. The text of the <pre> is unindented, then split into
// lines (.line) that the steps highlight.

const STRING = String.raw`'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"`;
const NUMBER = String.raw`\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?(?:mb)?\b`;
const CALL = String.raw`\b[A-Za-z_][\w]*(?=\s*\()`;

const words = (list) => String.raw`\b(?:${list.join('|')})\b`;

const LANGUAGES = {
    c: [
        ['c', String.raw`//.*$`],
        ['s', STRING],
        ['k', String.raw`#\w+`],
        ['t', words(['int', 'char', 'void', 'bool', 'const', 'unsigned', 'static', 'struct', 'alignas'])],
        ['k', words(['return', 'if', 'else', 'while', 'for', 'NULL', 'true', 'false'])],
        ['n', NUMBER],
        ['f', CALL],
    ],
    php: [
        ['c', String.raw`//.*$|#(?!\[).*$`],
        ['s', STRING],
        ['k', String.raw`<\?php`],
        ['v', String.raw`\$\w+`],
        ['k', words(['function', 'return', 'use', 'new', 'echo', 'fn', 'match', 'static', 'namespace', 'true', 'false', 'null', 'while', 'foreach', 'as', 'if'])],
        ['t', String.raw`\b[A-Z][A-Za-z]+(?=::)|\b(?:string|int|void|array)\b`],
        ['n', NUMBER],
        ['f', String.raw`(?<=->)\w+|${CALL}`],
    ],
    js: [
        ['c', String.raw`//.*$`],
        ['s', String.raw`${STRING}|\x60(?:\\.|[^\x60\\])*\x60`],
        ['k', words(['import', 'from', 'export', 'default', 'const', 'let', 'await', 'async', 'return', 'new', 'function', 'null', 'true', 'false', 'try', 'finally'])],
        ['n', NUMBER],
        ['f', String.raw`(?<=\.)\w+(?=\s*\()|${CALL}`],
        ['v', String.raw`\b(?:Module|HEAPU8|HEAPU32|php|FS)\b`],
    ],
    sh: [
        ['c', String.raw`(?:^|\s)#.*$`],
        ['p', String.raw`^\$ `],
        ['s', STRING],
        ['v', String.raw`(?<=\s)--?[\w-]+(?:=[^\s]*)?`],
        ['f', String.raw`(?<=^\$ )[\w./-]+|(?<=&& )[\w./-]+`],
    ],
    wat: [
        ['c', String.raw`;;.*$`],
        ['s', STRING],
        ['t', words(['i32', 'i64', 'f32', 'f64'])],
        ['k', words(['module', 'func', 'param', 'result', 'export'])],
        ['f', String.raw`\b(?:local\.get|i32\.add|end)\b`],
        ['n', NUMBER],
    ],
};

const escape = (text) => text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

function highlightLine(line, rules) {
    if (!rules) {
        return escape(line);
    }

    const pattern = new RegExp(rules.map(([, source]) => `(${source})`).join('|'), 'g');
    let html = '';
    let last = 0;
    for (const match of line.matchAll(pattern)) {
        const group = match.slice(1).findIndex((value) => undefined !== value);
        html += escape(line.slice(last, match.index));
        const kind = rules[group][0];
        html += 'p' === kind ? `<span class="prompt">${escape(match[0])}</span>` : `<span class="tok-${kind}">${escape(match[0])}</span>`;
        last = match.index + match[0].length;
    }

    return html + escape(line.slice(last));
}

/**
 * The common indentation and the blank lines around, removed.
 */
export function dedent(text) {
    const all = text.replace(/\t/g, '    ').split('\n');
    while (all.length && '' === all[0].trim()) {
        all.shift();
    }
    while (all.length && '' === all.at(-1).trim()) {
        all.pop();
    }
    const indent = Math.min(...all.filter((l) => '' !== l.trim()).map((l) => l.match(/^ */)[0].length));

    return all.map((l) => l.slice(indent));
}

export function highlight(pre) {
    const rules = LANGUAGES[pre.dataset.lang];
    pre.innerHTML = dedent(pre.textContent)
        .map((line) => `<span class="line">${highlightLine(line, rules) || ' '}</span>`)
        .join('');
}
