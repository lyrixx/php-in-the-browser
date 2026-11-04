// In this order: the language first, it removes the texts of the other one;
// then the typography, the riso copies of deck.js are made of the text it
// fixes. The demos register their hooks before the first slide.
import './i18n.js';
import './typo.js';
import { start } from './deck.js';
import './demos.js';

start();
