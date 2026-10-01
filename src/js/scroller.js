/*
 * Horizontal scrollers (styles carousel, reviews).
 * Native overflow scrolling + scroll-snap does the heavy lifting (touch swipe, keyboard, trackpads);
 * this adds prev/next buttons, a progress bar and mouse drag-with-momentum on desktop.
 * While the styles row is pinned (desktop, see styles-rail.js) it is driven by the page scroll
 * instead, and this module steps aside.
 */
import { reducedMotion as reduced } from './motion.js';

function setupScroller(track) {
  const name = track.dataset.scroller;
  const prev = document.querySelector(`[data-scroller-prev="${name}"]`);
  const next = document.querySelector(`[data-scroller-next="${name}"]`);
  const bar = document.querySelector(`[data-scroller-progress="${name}"]`);
  const list = track.firstElementChild;
  const pinned = () => !!track.closest('.is-pinned');

  const step = () => {
    const item = list.children[0];
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    return item ? item.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
  };

  const update = () => {
    if (pinned()) return;
    const max = track.scrollWidth - track.clientWidth;
    const ratio = max > 0 ? track.scrollLeft / max : 1;
    const visible = track.clientWidth / track.scrollWidth;
    bar?.style.setProperty('--progress', Math.min(1, visible + ratio * (1 - visible)).toFixed(3));
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max - 2;
  };

  const go = (dir) => {
    if (pinned()) return;
    track.scrollBy({ left: dir * step(), behavior: reduced() ? 'auto' : 'smooth' });
  };
  prev?.addEventListener('click', () => go(-1));
  next?.addEventListener('click', () => go(1));
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  track.addEventListener('scroller:refresh', update);
  update();

  if (!track.hasAttribute('data-draggable')) return;

  /* Mouse drag with momentum (touch devices keep native swiping) */
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let dragging = false;
  let moved = false;
  let raf = 0;

  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || pinned()) return;
    cancelAnimationFrame(raf);
    dragging = true;
    moved = false;
    startX = lastX = e.clientX;
    lastT = performance.now();
    startScroll = track.scrollLeft;
    velocity = 0;
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 5) {
      moved = true;
      track.classList.add('is-dragging');
    }
    if (!moved) return;
    const now = performance.now();
    velocity = (e.clientX - lastX) / Math.max(1, now - lastT);
    lastX = e.clientX;
    lastT = now;
    track.scrollLeft = startScroll - dx;
  });

  const release = () => {
    if (!dragging) return;
    dragging = false;
    if (!moved) return;
    let v = velocity * 16; // px per frame
    const glide = () => {
      if (Math.abs(v) < 0.5 || reduced()) {
        track.classList.remove('is-dragging'); // re-enables snap, which settles on the nearest card
        return;
      }
      track.scrollLeft -= v;
      v *= 0.92;
      raf = requestAnimationFrame(glide);
    };
    glide();
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  // A drag should never also count as a click on a card.
  track.addEventListener('click', (e) => {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);
}

export function initScrollers() {
  document.querySelectorAll('[data-scroller]').forEach(setupScroller);
}
