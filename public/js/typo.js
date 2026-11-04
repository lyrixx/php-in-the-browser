// Typography, on the text of the slides (not on the code): curly apostrophes,
// and in French, a no-break space before ":" and in « », a narrow one before
// ";", "!" and "?". The slides are written with plain spaces.

import { lang } from './i18n.js';

const SKIP = 'pre, code, kbd, textarea, script, style, .mono, .bytes';

/**
 * Typesets the text of an element: the deck once loaded, and what the demos
 * add to it.
 */
export function typeset(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => (node.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent.replace(/(\p{L})'(?=\p{L}|$)/gu, '$1\u2019');
        if ('fr' !== lang) {
            node.textContent = text;
            continue;
        }
        node.textContent = text
            .replace(/ :/g, '\u00a0:')
            .replace(/ ([;!?])/g, '\u202f$1')
            .replace(/\u00ab /g, '\u00ab\u00a0')
            .replace(/ \u00bb/g, '\u00a0\u00bb');
    }
}

typeset(document.querySelector('.deck'));
