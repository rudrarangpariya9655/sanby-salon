import { gsap } from 'gsap';
import { EASE, finePointer, reducedMotion } from './motion.js';

/*
 * Desktop only (mouse / trackpad). The native cursor is never hidden or replaced.
 *  - A thin ring trails the pointer and reacts to what's underneath it:
 *    links and buttons (grows), the before/after slider (stretches sideways),
 *    [data-cursor] zones (a labelled disc — "Drag" on carousels, "View" on the gallery),
 *    and text fields / embedded maps (steps aside).
 *  - A gentle magnetic pull on key buttons marked [data-magnetic].
 */
const INTERACTIVE = 'a[href], button:not(:disabled), select, label[for], [role="slider"], summary';
const TEXT = 'input, textarea, iframe, [contenteditable]';

function cursorRing() {
  const cursor = document.querySelector('[data-cursor-el]');
  const text = cursor?.querySelector('[data-cursor-text]');
  if (!cursor) return;

  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: EASE.out });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: EASE.out });
  let state = '';
  let placed = false;

  const setState = (next, label = '') => {
    if (next === state && (next !== 'label' || text.textContent === label)) return;
    cursor.classList.remove('is-link', 'is-slide', 'is-label', 'is-hidden');
    if (next) cursor.classList.add(`is-${next}`);
    if (label) text.textContent = label;
    state = next;
  };

  // One delegated listener: work out the state from whatever the pointer has just entered.
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const t = e.target;
    const zone = t.closest('[data-cursor]');
    if (t.closest(TEXT)) setState('hidden');
    else if (t.closest('[data-cursor-state="slide"]')) setState('slide');
    else if (zone) setState('label', zone.dataset.cursor);
    else if (t.closest(INTERACTIVE)) setState('link');
    else setState('');
  });

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!placed) {
      // Start exactly under the pointer rather than sliding in from the corner.
      gsap.set(cursor, { x: e.clientX, y: e.clientY });
      placed = true;
    }
    xTo(e.clientX);
    yTo(e.clientY);
    cursor.classList.add('is-on');
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') cursor.classList.add('is-pressed'); });
  window.addEventListener('pointerup', () => cursor.classList.remove('is-pressed'));
}

function magnetic() {
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: EASE.out });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: EASE.out });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.16);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.22);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

export function initPointer() {
  if (!finePointer() || reducedMotion()) return;
  cursorRing();
  magnetic();
}
