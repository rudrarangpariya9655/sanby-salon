import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EASE, MOTION, reducedMotion, finePointer } from './motion.js';

gsap.registerPlugin(ScrollTrigger);

// Dev-only handle for inspecting timelines from the console.
if (import.meta.env.DEV) Object.assign(window, { gsap, ScrollTrigger });

/* ---------- Split headings into masked lines ---------- */

// Wraps each word (preserving <em>) so words can be grouped into rendered lines.
function wrapWords(el) {
  const frag = document.createDocumentFragment();
  el.childNodes.forEach((node) => {
    const isEm = node.nodeType === 1 && node.tagName === 'EM';
    const text = node.textContent;
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.append(' '); return; }
      const word = document.createElement('span');
      word.className = 'word';
      word.style.display = 'inline-block';
      if (isEm) {
        const em = document.createElement('em');
        em.textContent = part;
        word.append(em);
      } else {
        word.textContent = part;
      }
      frag.append(word);
    });
  });
  el.replaceChildren(frag);
}

function splitLines(el) {
  el.dataset.original ??= el.innerHTML;
  el.innerHTML = el.dataset.original;
  wrapWords(el);
  const lines = [];
  let lastTop = null;
  el.querySelectorAll('.word').forEach((word) => {
    const top = word.offsetTop;
    if (lastTop === null || Math.abs(top - lastTop) > 4) { lines.push([]); lastTop = top; }
    lines[lines.length - 1].push(word);
  });
  el.replaceChildren(
    ...lines.map((words) => {
      const line = document.createElement('span');
      line.className = 'line';
      const inner = document.createElement('span');
      inner.className = 'line__inner';
      words.forEach((w, i) => { inner.append(w); if (i < words.length - 1) inner.append(' '); });
      line.append(inner);
      return line;
    }),
  );
  return el.querySelectorAll('.line__inner');
}

function restore(el) {
  if (el.dataset.original) el.innerHTML = el.dataset.original;
}

/* ---------- Hero entrance ---------- */

// Brand first, then the promise, then the headline line by line, then the image and — last — the actions.
function heroIntro() {
  const q = (s) => document.querySelectorAll(`[data-hero="${s}"]`);
  const img = document.querySelector('[data-hero="media"] img');
  const nav = document.querySelectorAll('.nav__logo, .nav__links li, .nav__cta, .nav__toggle');
  gsap.set(q('line'), { yPercent: 110, autoAlpha: 1 });

  gsap.timeline({ defaults: { ease: EASE.out } })
    .fromTo(nav, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.04 }, 0)
    // Opacity only — the indicator's position is a CSS transform driven by nav.js.
    .fromTo('.nav__indicator', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7 }, 0.3)
    .fromTo(q('eyebrow'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.2)
    .fromTo(q('line'), { yPercent: 110 }, { yPercent: 0, duration: 1.05, ease: EASE.line, stagger: 0.14 }, 0.32)
    .fromTo(q('media'), { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: EASE.inOut }, 0.4)
    .fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: EASE.strong }, 0.45)
    .fromTo(q('lead'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.75 }, 0.9)
    .fromTo(q('action'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.09 }, 1.05)
    .fromTo(q('frame'), { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 0.55, scale: 1, duration: 1, ease: EASE.strong }, 1.15)
    .fromTo(q('card'), { autoAlpha: 0, scale: 0.7, rotation: -30 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 1.1, ease: EASE.strong }, 1.3)
    .fromTo(q('fade'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, stagger: 0.1 }, 1.4);
}

/* ---------- Scroll reveals ---------- */

function headingReveals() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    const lines = splitLines(el);
    gsap.set(lines, { yPercent: 110 });
    ScrollTrigger.create({
      trigger: el,
      start: MOTION.start,
      once: true,
      onEnter: () => {
        gsap.to(el.querySelectorAll('.line__inner'), {
          yPercent: 0,
          duration: MOTION.lineDuration,
          ease: EASE.line,
          stagger: MOTION.lineStagger,
          onComplete: () => restore(el),
        });
      },
    });
  });

  // Re-measure lines that haven't animated yet if the layout changes.
  let width = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === width) return;
    width = window.innerWidth;
    document.querySelectorAll('[data-split]').forEach((el) => {
      const pending = el.querySelector('.line__inner');
      if (pending && gsap.getProperty(pending, 'yPercent') !== 0) {
        gsap.set(splitLines(el), { yPercent: 110 });
      }
    });
  });
}

// Everything marked [data-reveal] (plain) fades up; siblings entering together are staggered.
// [data-reveal="fade"] fades in place — for anchor targets like the booking form, since a browser
// measures the scroll target while it's still offset and would stop short once it settles.
function fadeReveals() {
  const items = gsap.utils.toArray('[data-reveal]:not([data-reveal="mask"]):not([data-reveal="panel"])');
  gsap.set(items, { autoAlpha: 0, y: (i, el) => (el.dataset.reveal === 'fade' ? 0 : MOTION.distance) });
  ScrollTrigger.batch(items, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        duration: MOTION.duration,
        ease: EASE.out,
        stagger: MOTION.stagger,
        overwrite: true,
        clearProps: 'transform',
      }),
  });
}

// Images open from the bottom while the photo inside settles from a slight zoom.
function maskReveals() {
  gsap.utils.toArray('[data-reveal="mask"]').forEach((el) => {
    // Every image in the frame scales together (the before/after slider has two stacked photos).
    const imgs = el.querySelectorAll('img');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: MOTION.start, once: true },
      delay: Number(el.dataset.delay || 0),
    });
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: MOTION.maskDuration, ease: EASE.inOut });
    if (imgs.length) tl.fromTo(imgs, { scale: MOTION.imageScale }, { scale: 1, duration: 1.5, ease: EASE.strong }, 0.1);
  });
}

// Booking panel opens out to full width as it scrolls into view; its photo settles at the same time.
function panelReveal() {
  gsap.utils.toArray('[data-reveal="panel"]').forEach((el) => {
    const img = el.querySelector('img');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 40%', scrub: 0.6 },
    });
    tl.fromTo(el, { clipPath: 'inset(6% 5% 6% 5% round 4px)' }, { clipPath: 'inset(0% 0% 0% 0% round 4px)' }, 0);
    if (img) tl.fromTo(img, { scale: 1.12 }, { scale: 1 }, 0);
  });
}

function counters() {
  document.querySelectorAll('[data-stats]').forEach((list) => {
    ScrollTrigger.create({ trigger: list, start: 'top 92%', once: true, onEnter: () => list.classList.add('is-in') });
  });

  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    // Reserve the final width (in em, so it scales with the font) so the suffix never shifts while counting.
    const em = el.getBoundingClientRect().width / parseFloat(getComputedStyle(el).fontSize);
    el.style.display = 'inline-block';
    el.style.minWidth = `${em.toFixed(3)}em`;
    const state = { v: 0 };
    el.textContent = (0).toFixed(decimals);
    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      once: true,
      onEnter: () => {
        gsap.to(state, {
          v: target,
          duration: target > 100 ? 1.8 : 1.4,
          ease: 'power2.out',
          delay: 0.15,
          onUpdate: () => { el.textContent = state.v.toFixed(decimals); },
        });
      },
    });
  });
}

// Footer wordmark — a little barber routine:
// letters flip up as outlines, scissors snip across filling them with gold, then a comb brushes them into place.
function wordmark(ready) {
  const mark = document.querySelector('[data-mark]');
  if (!mark) return;
  const word = mark.querySelector('[data-wordmark]');
  const letters = gsap.utils.toArray(word.querySelectorAll('.footer__letter'));
  const scissors = mark.querySelector('[data-scissors]');
  const blades = { a: scissors.querySelector('[data-blade="a"]'), b: scissors.querySelector('[data-blade="b"]') };
  const comb = mark.querySelector('[data-comb]');
  const cut = mark.querySelector('[data-cut]');

  // Geometry is measured when the routine starts so it matches the current layout.
  const measure = () => {
    const m = mark.getBoundingClientRect();
    const boxes = letters.map((l) => {
      const r = l.getBoundingClientRect();
      return { left: r.left - m.left, right: r.right - m.left, top: r.top - m.top, bottom: r.bottom - m.top };
    });
    const left = Math.min(...boxes.map((b) => b.left));
    const right = Math.max(...boxes.map((b) => b.right));
    const top = Math.min(...boxes.map((b) => b.top));
    const bottom = Math.max(...boxes.map((b) => b.bottom));
    return { width: m.width, boxes, left, right, top, bottom, cutY: top + (bottom - top) * 0.5 };
  };

  let tl;
  const build = () => {
    tl?.kill();
    // Measure letters in their resting position, not mid-entrance.
    gsap.set(letters, { clearProps: 'transform' });
    const g = measure();
    const sw = scissors.getBoundingClientRect().width;
    const sh = sw / 2;
    const cw = comb.getBoundingClientRect().width;
    const ch = cw * 0.22;
    const span = g.width + sw * 2;
    const CUT = 2.2; // seconds for the scissors to cross
    const cutStart = 0.9;
    // Time at which the scissors' tips reach an x position.
    const atX = (x) => cutStart + ((x + sw) / span) * CUT;

    gsap.set(letters, { yPercent: 110, rotationX: -95, '--fill': '0%', skewX: 0, scaleY: 1 });
    gsap.set(scissors, { x: -sw * 1.2, y: g.cutY - sh / 2, rotation: 0, autoAlpha: 0 });
    gsap.set(comb, { x: g.width + cw * 0.2, y: g.top - ch * 0.55, rotation: -6, autoAlpha: 0 });
    gsap.set(cut, { y: g.cutY, scaleX: 0, autoAlpha: 0 });
    gsap.set([blades.a, blades.b], { rotation: 0 });

    tl = gsap.timeline({ paused: true });

    // 1. Outline letters flip up from the centre out.
    tl.to(letters, { yPercent: 0, rotationX: 0, duration: 0.9, ease: EASE.out, stagger: { each: 0.08, from: 'center' } }, 0);

    // 2. Scissors glide across, snipping; the dashed cut line trails behind.
    tl.to(scissors, { autoAlpha: 1, duration: 0.25 }, cutStart - 0.1)
      .to(scissors, { x: g.width + sw * 0.2, duration: CUT, ease: 'none' }, cutStart)
      .to(cut, { autoAlpha: 1, duration: 0.2 }, cutStart)
      .fromTo(cut, { scaleX: 0 }, { scaleX: 1, duration: CUT, ease: 'none' }, cutStart)
      .to(blades.a, { rotation: -16, duration: 0.14, ease: 'power1.inOut', repeat: Math.round(CUT / 0.14) - 1, yoyo: true }, cutStart)
      .to(blades.b, { rotation: 16, duration: 0.14, ease: 'power1.inOut', repeat: Math.round(CUT / 0.14) - 1, yoyo: true }, cutStart)
      .to(scissors, { autoAlpha: 0, duration: 0.3 }, cutStart + CUT - 0.2)
      .to(cut, { autoAlpha: 0, duration: 0.5 }, cutStart + CUT);

    // Each letter fills with gold exactly as the blades pass over it, with a small snip jolt.
    g.boxes.forEach((b, i) => {
      const t0 = atX(b.left);
      const t1 = atX(b.right);
      tl.to(letters[i], { '--fill': '100%', duration: t1 - t0, ease: 'none' }, t0)
        .fromTo(letters[i], { scaleY: 0.94 }, { scaleY: 1, duration: 0.45, ease: EASE.out, immediateRender: false }, (t0 + t1) / 2);
    });

    // 3. The comb sweeps back across the tops, brushing each letter as it passes.
    const combStart = cutStart + CUT + 0.15;
    const COMB = 1.5;
    const combSpan = g.width + cw * 1.4;
    tl.to(comb, { autoAlpha: 1, duration: 0.25 }, combStart)
      .to(comb, { x: -cw * 1.2, duration: COMB, ease: 'power1.inOut' }, combStart)
      .to(comb, { rotation: 4, duration: COMB / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, combStart)
      .to(comb, { autoAlpha: 0, duration: 0.3 }, combStart + COMB - 0.3);
    g.boxes.forEach((b, i) => {
      // power1.inOut is roughly linear in the middle; good enough for timing the brush.
      const t = combStart + ((g.width + cw * 0.2 - (b.left + b.right) / 2) / combSpan) * COMB;
      tl.to(letters[i], { skewX: -9, yPercent: -3, duration: 0.18, ease: 'power2.out' }, t)
        .to(letters[i], { skewX: 0, yPercent: 0, duration: 0.7, ease: EASE.out }, t + 0.18);
    });
  };

  build();
  ScrollTrigger.create({
    trigger: mark,
    // The mark ends the page, so trigger on its centre — reachable on every screen size.
    start: 'center bottom',
    // Never play hidden behind the preloader — wait for it to lift first.
    onEnter: () => ready.then(() => { build(); tl.play(0); }),
    // Reset when scrolled back up so the routine plays again next time.
    onLeaveBack: () => { tl.pause(0); },
  });

  // Letters near the cursor lift, creating a wave as the pointer moves across.
  if (!finePointer()) return;
  const lifts = letters.map((el) => ({
    el,
    y: gsap.quickTo(el, 'y', { duration: 0.6, ease: EASE.out }),
    r: gsap.quickTo(el, 'rotation', { duration: 0.6, ease: EASE.out }),
  }));
  word.addEventListener('pointermove', (e) => {
    const h = word.offsetHeight;
    lifts.forEach(({ el, y, r }) => {
      const box = el.getBoundingClientRect();
      const dx = e.clientX - (box.left + box.width / 2);
      const pull = Math.max(0, 1 - Math.abs(dx) / (box.width * 1.6));
      y(-pull * h * 0.14);
      r(gsap.utils.clamp(-6, 6, (dx / box.width) * -4) * pull);
    });
  });
  word.addEventListener('pointerleave', () => lifts.forEach(({ y, r }) => { y(0); r(0); }));
}

function parallax() {
  gsap.utils.toArray('[data-parallax-img]').forEach((img) => {
    gsap.fromTo(
      img,
      { yPercent: -MOTION.parallax },
      {
        yPercent: MOTION.parallax,
        ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });
}

// The hero seal turns as the hero scrolls away — tied to scroll, so it's still when the page is.
function seal() {
  const ring = document.querySelector('[data-seal]');
  if (!ring) return;
  gsap.to(ring, {
    rotation: 200,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
  });
}

// Service ribbon: drifts slowly on its own, speeds up with the scroll and follows its direction.
// Only runs while it's on screen.
function marquee() {
  const el = document.querySelector('[data-marquee]');
  const track = el?.querySelector('[data-marquee-track]');
  if (!track) return;
  const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1, paused: true });
  // Start far along the loop so it can also run backwards when scrolling up.
  loop.totalTime(loop.duration() * 1000);
  let dir = 1;
  ScrollTrigger.create({
    trigger: el,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
    onUpdate: (self) => {
      dir = self.direction;
      const boost = gsap.utils.clamp(1, 6, 1 + Math.abs(self.getVelocity()) / 350);
      gsap.to(loop, { timeScale: dir * boost, duration: 0.2, overwrite: true })
        .then(() => gsap.to(loop, { timeScale: dir, duration: 1.2, ease: 'power2.out', overwrite: true }));
    },
  });
}

/* ---------- Reduced motion: the same reveals as plain fades — nothing moves, scales or wipes ---------- */

function reducedReveals(introReady) {
  const fade = { autoAlpha: 1, duration: MOTION.reducedFade, ease: 'none' };
  const hero = gsap.utils.toArray('[data-hero]:not([data-hero="frame"]), .nav__logo, .nav__links li, .nav__indicator, .nav__cta, .nav__toggle');
  introReady.then(() => {
    gsap.to(hero, { ...fade, stagger: 0.03 });
    gsap.to('[data-hero="frame"]', { ...fade, autoAlpha: 0.55 });
  });

  const items = gsap.utils.toArray('[data-reveal]:not([data-reveal="panel"]), [data-split]');
  gsap.set(items, { autoAlpha: 0 });
  ScrollTrigger.batch(items, { start: 'top 95%', once: true, onEnter: (batch) => gsap.to(batch, fade) });
}

export function initAnimations(introReady = Promise.resolve()) {
  const root = document.documentElement;
  if (!root.classList.contains('anim')) return;

  if (reducedMotion()) {
    reducedReveals(introReady);
  } else {
    // Hero entrance waits for the preloader curtain to start lifting.
    introReady.then(heroIntro);
    headingReveals();
    fadeReveals();
    maskReveals();
    panelReveal();
    counters();
    parallax();
    seal();
    marquee();
    wordmark(introReady);
  }

  // Lazy images change layout heights as they load; keep trigger positions accurate.
  window.addEventListener('load', () => ScrollTrigger.refresh());
  // The scrollbar returns when the preloader unlocks the page, which shifts layout slightly.
  window.addEventListener('loader:done', () => ScrollTrigger.refresh());
}
