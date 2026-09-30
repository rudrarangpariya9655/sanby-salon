import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reducedMotion } from './motion.js';

/* Before / after comparison slider — pointer drag anywhere on the image, plus keyboard on the handle. */
export function initCompare() {
  document.querySelectorAll('[data-compare]').forEach((el) => {
    const handle = el.querySelector('[data-compare-handle]');
    const state = { pos: 50 };

    const set = (pct) => {
      state.pos = Math.min(100, Math.max(0, pct));
      el.style.setProperty('--pos', `${state.pos}%`);
      el.style.setProperty('--p', state.pos.toFixed(2)); // unitless copy: labels fade near the edges in CSS
      handle.setAttribute('aria-valuenow', Math.round(state.pos));
      handle.setAttribute('aria-valuetext', `${Math.round(state.pos)}% before`);
    };

    // The user is always in control: any input cancels the intro hint or a click glide.
    const takeOver = () => gsap.killTweensOf(state);

    const fromEvent = (e) => {
      const r = el.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    };

    let active = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      // On touch, only the handle starts a drag so vertical page scrolling stays natural.
      if (e.pointerType !== 'mouse' && !e.target.closest('[data-compare-handle]')) return;
      active = true;
      takeOver();
      el.classList.add('is-dragging');
      el.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    el.addEventListener('pointermove', (e) => { if (active) fromEvent(e); });
    const end = () => { active = false; el.classList.remove('is-dragging'); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    // Tapping elsewhere on the image (touch) moves the divider there smoothly.
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-compare-handle]')) return;
      const r = el.getBoundingClientRect();
      const pct = ((e.clientX - r.left) / r.width) * 100;
      takeOver();
      if (reducedMotion()) set(pct);
      else gsap.to(state, { pos: pct, duration: 0.5, ease: 'power3.out', onUpdate: () => set(state.pos) });
    });

    handle.addEventListener('keydown', (e) => {
      const map = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 };
      if (e.key in map) set(state.pos + map[e.key]);
      else if (e.key === 'Home') set(0);
      else if (e.key === 'End') set(100);
      else return;
      takeOver();
      e.preventDefault();
    });

    set(state.pos);

    // One gentle hint that the image is interactive — played once, never repeated.
    if (!reducedMotion()) {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          gsap.timeline({ delay: 0.6, onUpdate: () => set(state.pos) })
            .to(state, { pos: 64, duration: 0.7, ease: 'power2.inOut' })
            .to(state, { pos: 38, duration: 0.8, ease: 'power2.inOut' })
            .to(state, { pos: 50, duration: 0.6, ease: 'power2.out' });
        },
      });
    }
  });
}
