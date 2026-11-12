// Extracted-handler contracts run without mounted buttons. Use the real UI helper;
// it returns an empty binding when no DOM exists. Browser suites cover actual buttons.
import {showSavingFeedback} from '../pilot/operation-notices.js';
globalThis.showSavingFeedback=showSavingFeedback;
