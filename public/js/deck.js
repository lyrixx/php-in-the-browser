// The engine of the deck: slides, steps, the line of the talk, the speaker
// notes and the presenter view (?presenter, synced with BroadcastChannel).
//
// In a slide:
//   data-step="2"               shown from step 2 (data-anim: up, pop, drop…)
//   data-until="3"              gone from step 3
//   data-dim="3"                dimmed from step 3
//   data-states="1:a 3:b"       data-state="a" from step 1, "b" from step 3
//   pre[data-lang][data-hl]     highlighted code, "1:2-3 2:5,7" highlights
//                               lines 2 to 3 from step 1, 5 and 7 from step 2
//   data-steps="4" on a slide   its number of steps, when only JS uses them
//
// Keys: → / Space / PageDown next, ← / PageUp previous, Shift+→ next slide,
// Home / End, a number then Enter to go to a slide, N notes, P presenter,
// F fullscreen, B black screen, L the other language, R reset the timer
// (presenter).

import { highlight } from './highlight.js';
import { lang, switchLang, t } from './i18n.js';

const WIDTH = 1600;
const HEIGHT = 900;
// The length of the talk, in minutes
const BUDGET = 20;

const hooks = new Map();

export const deck = {
    slides: [],
    index: 0,
    step: 0,
    /**
     * Called on each step of a slide: fn(step, slide, { entered, forward })
     */
    on(id, fn) {
        hooks.set(id, [...(hooks.get(id) ?? []), fn]);
    },
};

const presenter = new URLSearchParams(location.search).has('presenter');
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('php-wasm-deck') : null;

const root = document.querySelector('.deck');
deck.slides = [...root.querySelectorAll(':scope > .slide')];

for (const [i, slide] of deck.slides.entries()) {
    slide.dataset.index = String(i);
    slide.steps = Number(slide.dataset.steps ?? 0);
    for (const element of slide.querySelectorAll('[data-step], [data-until], [data-dim], [data-states]')) {
        for (const value of [element.dataset.step, element.dataset.until, element.dataset.dim]) {
            if (undefined !== value) {
                slide.steps = Math.max(slide.steps, Number(value));
            }
        }
        for (const key of Object.keys(parseStates(element.dataset.states))) {
            slide.steps = Math.max(slide.steps, Number(key));
        }
    }
    for (const pre of slide.querySelectorAll('pre[data-lang]')) {
        highlight(pre);
        for (const key of Object.keys(parseStates(pre.dataset.hl))) {
            slide.steps = Math.max(slide.steps, Number(key));
        }
    }
}

for (const element of root.querySelectorAll('.riso')) {
    element.dataset.text = element.textContent;
}

/**
 * "1:a 3:b" → { 1: 'a', 3: 'b' }
 */
function parseStates(value) {
    const states = {};
    for (const entry of (value ?? '').trim().split(/\s+/).filter(Boolean)) {
        const [step, ...rest] = entry.split(':');
        states[step] = rest.join(':');
    }

    return states;
}

/**
 * The value of the greatest step that is not after the current one.
 */
function stateAt(states, step) {
    let found;
    for (const [key, value] of Object.entries(states)) {
        if (Number(key) <= step && (undefined === found || Number(key) >= found[0])) {
            found = [Number(key), value];
        }
    }

    return found?.[1];
}

function lines(spec) {
    const numbers = new Set();
    for (const part of (spec ?? '').split(',').filter(Boolean)) {
        const [from, to = from] = part.split('-').map(Number);
        for (let n = from; n <= to; n++) {
            numbers.add(n);
        }
    }

    return numbers;
}

function render(slide, step) {
    for (const element of slide.querySelectorAll('[data-step]')) {
        const at = Number(element.dataset.step);
        element.classList.toggle('is-shown', step >= at);
        element.classList.toggle('is-current', step === at);
    }
    for (const element of slide.querySelectorAll('[data-until]')) {
        element.classList.toggle('is-gone', step >= Number(element.dataset.until));
    }
    for (const element of slide.querySelectorAll('[data-dim]')) {
        element.classList.toggle('is-dimmed', step >= Number(element.dataset.dim));
    }
    for (const element of slide.querySelectorAll('[data-states]')) {
        const state = stateAt(parseStates(element.dataset.states), step);
        if (undefined === state) {
            delete element.dataset.state;
        } else {
            element.dataset.state = state;
        }
    }
    for (const pre of slide.querySelectorAll('pre[data-hl]')) {
        const highlighted = lines(stateAt(parseStates(pre.dataset.hl), step));
        pre.classList.toggle('has-hl', highlighted.size > 0);
        for (const [n, line] of [...pre.querySelectorAll('.line')].entries()) {
            line.classList.toggle('is-hl', highlighted.has(n + 1));
        }
    }

    slide.dataset.at = String(step);
    for (let n = 1; n <= slide.steps; n++) {
        slide.classList.toggle(`s${n}`, step >= n);
    }
}

function go(index, step, { broadcast = true } = {}) {
    index = Math.max(0, Math.min(deck.slides.length - 1, index));
    const slide = deck.slides[index];
    step = Math.max(0, Math.min(slide.steps, step));

    const entered = index !== deck.index || !slide.classList.contains('is-active');
    const forward = index > deck.index || (index === deck.index && step >= deck.step);

    for (const [i, other] of deck.slides.entries()) {
        other.classList.toggle('is-active', i === index);
        other.classList.toggle('is-past', i < index);
    }

    deck.index = index;
    deck.step = step;
    render(slide, step);

    for (const fn of hooks.get(slide.id) ?? []) {
        fn(step, slide, { entered, forward });
    }

    history.replaceState(null, '', `${location.search}#${index + 1}${step > 0 ? `.${step}` : ''}`);
    if (broadcast) {
        channel?.postMessage({ type: 'go', index, step });
    }

    document.dispatchEvent(new CustomEvent('deck:change', { detail: { index, step, slide, entered } }));
}

function next() {
    const slide = deck.slides[deck.index];
    if (deck.step < slide.steps) {
        go(deck.index, deck.step + 1);
    } else if (deck.index < deck.slides.length - 1) {
        go(deck.index + 1, 0);
    }
}

function previous() {
    if (deck.step > 0) {
        go(deck.index, deck.step - 1);
    } else if (deck.index > 0) {
        // The slide before, as it was left: at its last step
        go(deck.index - 1, deck.slides[deck.index - 1].steps);
    }
}

function fromHash() {
    const [index, step] = location.hash.slice(1).split('.').map(Number);

    return [Number.isInteger(index) && index > 0 ? index - 1 : 0, Number.isInteger(step) ? step : 0];
}

/* The canvas, scaled to the window */

function fit() {
    const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
    root.style.setProperty('--scale', String(scale));
}

/* The line of the talk: a station per chapter, and the elephant */

function buildMetro() {
    const metro = document.createElement('div');
    metro.className = 'metro';
    metro.innerHTML = '<div class="metro__track"></div><div class="metro__done"></div>';

    const last = deck.slides.length - 1;
    const position = (i) => `${(i / last) * 100}%`;

    for (const slide of deck.slides.filter((s) => undefined !== s.dataset.station)) {
        const station = document.createElement('div');
        station.className = 'metro__station';
        station.style.left = position(Number(slide.dataset.index));
        station.dataset.index = slide.dataset.index;
        station.innerHTML = `<span>${slide.dataset.station}</span>`;
        metro.append(station);
    }

    const elephant = document.createElement('div');
    elephant.className = 'metro__elephant';
    elephant.textContent = '🐘';
    metro.append(elephant);

    const number = document.createElement('div');
    number.className = 'slide-number';

    root.append(metro, number);

    document.addEventListener('deck:change', ({ detail: { index, slide, entered } }) => {
        metro.classList.toggle('is-hidden', 'none' === slide.dataset.chrome);
        metro.querySelector('.metro__done').style.width = position(index);
        for (const station of metro.querySelectorAll('.metro__station')) {
            station.classList.toggle('is-reached', Number(station.dataset.index) <= index);
        }
        if (entered && elephant.style.left !== position(index)) {
            elephant.classList.remove('is-walking');
            void elephant.offsetWidth;
            elephant.classList.add('is-walking');
        }
        elephant.style.left = position(index);
        number.textContent = `${index + 1} / ${deck.slides.length}`;
    });
}

/* Speaker notes, on the slide (N) */

function buildNotes() {
    const overlay = document.createElement('div');
    overlay.className = 'notes-overlay';
    const blackout = document.createElement('div');
    blackout.className = 'blackout';
    document.body.append(overlay, blackout);

    document.addEventListener('deck:change', ({ detail: { slide } }) => {
        overlay.textContent = notesOf(slide);
    });
}

function notesOf(slide) {
    return (slide.querySelector('.notes')?.textContent ?? '').replace(/^[ \t]+/gm, '').trim();
}

function titleOf(slide) {
    return slide.dataset.title ?? slide.querySelector('h1, h2')?.textContent.replace(/\s+/g, ' ').trim() ?? `Slide ${Number(slide.dataset.index) + 1}`;
}

/* Keyboard, clicker, touch */

let typed = '';

function onKey(event) {
    const target = event.target;
    const editing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    // A clicker sends PageUp / PageDown: they always move, even from the editor
    const clicker = ['PageDown', 'PageUp'].includes(event.key);
    if (editing && !clicker) {
        if ('Escape' === event.key) {
            target.blur();
        }

        return;
    }
    if (editing) {
        target.blur();
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
            if (event.shiftKey && 'ArrowRight' === event.key) {
                go(deck.index + 1, 0);
            } else {
                next();
            }
            break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
        case 'Backspace':
            if (event.shiftKey && 'ArrowLeft' === event.key) {
                go(deck.index - 1, 0);
            } else {
                previous();
            }
            break;
        case 'Home':
            go(0, 0);
            break;
        case 'End':
            go(deck.slides.length - 1, 0);
            break;
        case 'Enter':
            if ('' !== typed) {
                go(Number(typed) - 1, 0);
                typed = '';
            }
            break;
        case 'n':
        case 'N':
            document.body.classList.toggle('show-notes');
            break;
        case 'p':
        case 'P': {
            const url = new URL(location.href);
            url.searchParams.set('presenter', '');
            window.open(url, 'php-wasm-presenter', 'width=1200,height=760');
            break;
        }
        case 'l':
        case 'L':
            switchLang();
            break;
        case 'f':
        case 'F':
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
            break;
        case 'b':
        case 'B':
        case '.':
            document.body.classList.toggle('is-blackout');
            channel?.postMessage({ type: 'blackout', on: document.body.classList.contains('is-blackout') });
            break;
        default:
            if (/^[0-9]$/.test(event.key)) {
                typed += event.key;
            } else {
                return;
            }
            return;
    }

    typed = '';
    event.preventDefault();
}

function onTouch() {
    let start;
    document.addEventListener('touchstart', (event) => {
        start = event.touches[0];
    }, { passive: true });
    document.addEventListener('touchend', (event) => {
        if (!start) {
            return;
        }
        const dx = event.changedTouches[0].clientX - start.clientX;
        const dy = event.changedTouches[0].clientY - start.clientY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            dx < 0 ? next() : previous();
        }
        start = undefined;
    });
}

/* The presenter view */

function startPresenter() {
    root.hidden = true;
    const view = document.createElement('div');
    view.className = 'presenter';
    view.innerHTML = `
        <header>
            <div class="timer">00:00</div>
            <div class="budget"></div>
            <div class="clock"></div>
            <div class="position"></div>
        </header>
        <section>
            <div class="current-title"></div>
            <div class="steps"></div>
            <div class="notes-text"></div>
        </section>
        <section>
            <div class="next"></div>
        </section>
        <footer>${t({
            fr: '→ / Espace : suivant · ← : précédent · Shift+→ : slide suivante · R : remettre le chrono à zéro · B : écran noir · L : English',
            en: '→ / Space: next · ←: previous · Shift+→: next slide · R: reset the timer · B: black screen · L: français',
        })}</footer>
    `;
    document.body.append(view);

    let startedAt;
    const timer = view.querySelector('.timer');
    const budget = view.querySelector('.budget');
    const clock = view.querySelector('.clock');

    const tick = () => {
        const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
        timer.textContent = format(elapsed);
        timer.classList.toggle('is-late', elapsed > BUDGET * 60);
        clock.textContent = new Date().toLocaleTimeString('fr' === lang ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

        // Where the talk should be, from the time of the chapter it is in
        const chapter = deck.slides.slice(0, deck.index + 1).reverse().find((s) => undefined !== s.dataset.time);
        if (startedAt && chapter) {
            const expected = Number(chapter.dataset.time) * 60;
            const drift = elapsed - expected;
            budget.textContent = t({
                fr: `chapitre prévu à ${format(expected)} · ${drift > 60 ? `⚠️ ${format(drift)} de retard` : 'dans les temps ✅'}`,
                en: `chapter planned at ${format(expected)} · ${drift > 60 ? `⚠️ ${format(drift)} late` : 'on time ✅'}`,
            });
        } else {
            budget.textContent = t({
                fr: `${BUDGET} min · le chrono démarre à la première slide suivante`,
                en: `${BUDGET} min · the timer starts on the next slide`,
            });
        }
    };
    setInterval(tick, 500);

    document.addEventListener('deck:change', ({ detail: { index, step, slide } }) => {
        if (!startedAt && (index > 0 || step > 0)) {
            startedAt = Date.now();
        }
        view.querySelector('.current-title').textContent = `${index + 1}. ${titleOf(slide)}`;
        view.querySelector('.position').textContent = `${index + 1} / ${deck.slides.length}`;
        view.querySelector('.steps').innerHTML = Array.from({ length: slide.steps }, (_, n) => `<i class="${n < step ? 'is-done' : ''}"></i>`).join('');
        view.querySelector('.notes-text').textContent = notesOf(slide) || t({ fr: '(pas de notes)', en: '(no notes)' });
        const following = deck.slides[index + 1];
        view.querySelector('.next').innerHTML = step < slide.steps
            ? t({ fr: `Ensuite : <strong>étape ${step + 1} / ${slide.steps}</strong> de cette slide`, en: `Next: <strong>step ${step + 1} / ${slide.steps}</strong> of this slide` })
            : following
                ? t({ fr: `Slide suivante : <strong>${titleOf(following)}</strong>`, en: `Next slide: <strong>${titleOf(following)}</strong>` })
                : t({ fr: '<strong>Fin 🎉</strong>', en: '<strong>The end 🎉</strong>' });
        tick();
    });

    document.addEventListener('keydown', (event) => {
        if ('r' === event.key || 'R' === event.key) {
            startedAt = Date.now();
            tick();
        }
    });
}

function format(seconds) {
    const s = Math.floor(Math.abs(seconds));

    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* Start */

export function start() {
    if (presenter) {
        startPresenter();
    } else {
        fit();
        window.addEventListener('resize', fit);
        buildMetro();
        buildNotes();
        onTouch();
    }

    document.addEventListener('keydown', onKey);
    channel?.addEventListener('message', ({ data }) => {
        if ('go' === data.type) {
            go(data.index, data.step, { broadcast: false });
        }
        if ('blackout' === data.type && !presenter) {
            document.body.classList.toggle('is-blackout', data.on);
        }
    });
    window.addEventListener('hashchange', () => {
        const [index, step] = fromHash();
        if (index !== deck.index || step !== deck.step) {
            go(index, step);
        }
    });

    const [index, step] = fromHash();
    // The first render without transition: the slide is there at once
    root.classList.add('no-transition');
    go(index, step);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-transition')));
}
