// The language of the slides: ?lang=en, French by default. Both languages are
// side by side in index.html, and this module, imported first, keeps one:
//   <span lang="fr">…</span><span lang="en">…</span>   a text: the wrapper of
//                                                      the kept one is removed
//   <aside class="notes" lang="fr">                    a whole element
//   data-title="…" data-title-en="…"                   an attribute: "x-en"
//                                                      replaces "x" in English

const LANGS = ['fr', 'en'];
const asked = new URLSearchParams(location.search).get('lang');

export const lang = LANGS.includes(asked) ? asked : 'fr';

/**
 * The text of the current language: t({ fr: 'Salut', en: 'Hello' })
 */
export function t(texts) {
    return texts[lang];
}

/**
 * Reloads the slides in the other language, at the same slide and step.
 */
export function switchLang() {
    const url = new URL(location.href);
    url.searchParams.set('lang', 'fr' === lang ? 'en' : 'fr');
    location.assign(url);
}

document.documentElement.lang = lang;
document.title = t({ fr: 'PHP dans le navigateur · php-wasm-builder', en: 'PHP in the browser · php-wasm-builder' });

for (const element of document.body.querySelectorAll('[lang]')) {
    if (element.lang !== lang) {
        element.remove();
    } else if ('SPAN' === element.tagName && 1 === element.attributes.length) {
        // Only there to hold the text: the CSS of the slides does not expect it
        element.replaceWith(...element.childNodes);
    }
}

for (const element of document.body.querySelectorAll('*')) {
    for (const { name, value } of [...element.attributes]) {
        if (name.endsWith('-en')) {
            if ('en' === lang) {
                element.setAttribute(name.slice(0, -3), value);
            }
            element.removeAttribute(name);
        }
    }
}

for (const button of document.querySelectorAll('[data-switch-lang]')) {
    button.addEventListener('click', switchLang);
}
