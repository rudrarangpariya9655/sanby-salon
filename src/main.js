import '@fontsource-variable/cormorant-garamond/wght.css';
import '@fontsource-variable/cormorant-garamond/wght-italic.css';
import '@fontsource-variable/manrope/wght.css';

import './styles/base.css';
import './styles/components.css';
import './styles/nav-hero.css';
import './styles/sections.css';
import './styles/contact-footer.css';
import './styles/loader.css';

import { initAnimations } from './js/animations.js';
import { runLoader } from './js/loader.js';
import { initNav } from './js/nav.js';
import { initScrollers } from './js/scroller.js';
import { initCompare } from './js/compare.js';
import { initServicePreview } from './js/service-preview.js';
import { initPointer } from './js/pointer.js';
import { initLightboxTriggers } from './js/lightbox-triggers.js';
import { initBookingForm } from './js/booking-form.js';
import { initBackToTop } from './js/back-to-top.js';
import { initStylesRail } from './js/styles-rail.js';
import { initStickyCta } from './js/sticky-cta.js';

clearTimeout(window.__animFallback);

const loaderDone = runLoader();

initNav();
initScrollers();
initStylesRail();
initCompare();
initServicePreview();
initPointer();
initLightboxTriggers();
initBookingForm();
initBackToTop();
initStickyCta();

// Wait for fonts so split-line measurements use the final typeface.
const fontsReady = document.fonts?.ready ?? Promise.resolve();
Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(() => {
  // Set up scroll animations from the top of the page (the loader holds it there).
  if (document.querySelector('[data-loader]')) window.scrollTo({ top: 0, behavior: 'instant' });
  initAnimations(loaderDone);
});
