# PHP in the browser

The slides of a 20 minute talk, in French and in English: how
[php-wasm-builder](https://github.com/lyrixx/php-wasm-builder) compiles the
PHP interpreter to WebAssembly, and how a page uses it. They run PHP live, in
the page: <https://lyrixx.github.io/php-in-the-browser/>, and
<https://lyrixx.github.io/php-in-the-browser/?lang=en> in English.

They are a static page, with no dependency, and they are built as any project
that uses php-wasm-builder (see its "Using it from your own project"):
`castor.php` declares the stack, and GitHub Actions builds it, checks it, and
deploys the slides.

## Run them

It needs Docker and castor, and node for the checks.

```
castor slides:serve
```

It builds PHP in `public/build/` if it is not built yet, then serves the
slides on http://127.0.0.1:8000/. PHP is not built again once it is there: the
slides work without Docker and without network, on the day of the talk.
`castor wasm:build` builds it again, after a change of `wasm_stack()`, and
`castor wasm:smoke` checks that it boots, and runs the code of the slides.

Without `public/build/`, the slides still work: the live outputs show what PHP
printed when they were written.

## Keys

- `→`, `Space`, `PageDown`: next step; `←`, `PageUp`: previous one
- `Shift+→`, `Shift+←`: next or previous slide, without the steps
- a number, then `Enter`: go to that slide; `Home`, `End`
- `P`: the presenter view (timer, notes, next step), synced with the slides
- `N`: the notes, on the slides; `F`: full screen; `B`: black screen
- `L`: the other language, at the same slide and step

The URL keeps the slide and the step: `#25.3` is the step 3 of the slide 25.

## Languages

French by default, English with `?lang=en` (or `L`). Both languages live side
by side in `index.html`, so the slides, their steps and their code are written
once, and a translation sits next to its original:

```html
<h2><span lang="fr">Où tourne PHP ?</span><span lang="en">Where does PHP run?</span></h2>
<aside class="notes" lang="fr">…</aside>
<aside class="notes" lang="en">…</aside>
<section data-title="Merci" data-title-en="Thanks">
```

`js/i18n.js` removes the other language before anything reads the slides, and
`t({ fr, en })` does the same for the texts of the JS. A text without `lang` is
shown in both languages: keep it for code, names and numbers.

## What is where

- `castor.php`: the stack of PHP, and the tasks to build it, check it and serve
  the slides;
- `.github/workflows/pages.yaml`: builds PHP, with the layers cached by GitHub
  Actions, checks it, and deploys `public/` to GitHub Pages;
- `public/index.html`: the slides, and their notes (`<aside class="notes">`);
- `public/js/deck.js`: the engine, see its first comment for the attributes of
  the steps (`data-step`, `data-states`, `data-hl`…);
- `public/js/demos.js`: what the slides do beyond steps: the WebAssembly module
  of 41 bytes, the memory of the module, and PHP itself;
- `public/js/php.js` and `public/js/php-worker.js`: PHP runs in a worker,
  killed after 4 seconds, so that `while (true) {}` does not freeze the slides;
- `public/js/i18n.js`: the language, see above;
- `public/js/typo.js`: the typography (apostrophes, and the no-break spaces of
  French): the slides are written with plain spaces;
- `public/css/deck.css`: the theme and the engine, `public/css/slides.css`:
  each slide;
- `public/fonts/`: Unbounded, Figtree and JetBrains Mono, under the SIL Open
  Font License.
