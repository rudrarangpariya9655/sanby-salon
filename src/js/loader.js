import { gsap } from 'gsap';
import { EASE, reducedMotion } from './motion.js';

const MIN_TIME = 0.9; // seconds on screen — long enough to register the brand, short enough not to feel like a wait
const MAX_WAIT = 3500; // ms — never hold the page longer than this for slow assets

// Remembered for the session so reloads and returning to the tab go straight to the page.
// (index.html reads the same key to hide the loader before first paint.)
const markSeen = () => { try { sessionStorage.setItem('sanby:intro-seen', '1'); } catch { /* storage blocked */ } };

const toTop = () => { if (window.scrollY) window.scrollTo({ top: 0, behavior: 'instant' }); };

/**
 * What the first screen needs before it can be shown: fonts and the hero photo.
 * Reports each finished task so the counter reflects real progress.
 */
function trackAssets(onProgress) {
  const img = document.querySelector('[data-hero="media"] img');
  const tasks = [
    document.fonts?.ready ?? Promise.resolve(),
    !img || img.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        }),
  ];
  let done = 0;
  tasks.forEach((t) => t.then(() => onProgress(++done / tasks.length)));
  return Promise.race([Promise.all(tasks), new Promise((resolve) => setTimeout(resolve, MAX_WAIT))]);
}

/**
 * Plays the branded preloader on the first visit of a session. Returns a promise that resolves
 * as the curtain starts to lift, so the hero entrance plays underneath it.
 */
export function runLoader() {
  const el = document.querySelector('[data-loader]');
  if (!el) return Promise.resolve();
  const root = document.documentElement;
  if (!root.classList.contains('anim') || root.classList.contains('no-loader') || reducedMotion()) {
    el.remove();
    return Promise.resolve();
  }
  markSeen();

  const letters = el.querySelectorAll('[data-loader-letter]');
  const fades = el.querySelectorAll('[data-loader-fade]');
  const line = el.querySelector('[data-loader-line]');
  const track = line.parentElement;
  const scissors = el.querySelector('[data-loader-scissors]');
  const bladeA = scissors.querySelector('[data-blade="a"]');
  const bladeB = scissors.querySelector('[data-blade="b"]');
  const count = el.querySelector('[data-loader-count]');

  document.body.classList.add('is-locked');
  // Hold the page at the top while the curtain is down: browsers can restore an old scroll
  // position after load, and scroll animations must be set up from the top.
  toTop();
  window.addEventListener('scroll', toTop);

  const progress = { p: 0 };
  const render = () => {
    const p = progress.p;
    count.textContent = Math.round(p * 100);
    gsap.set(line, { scaleX: p });
    gsap.set(scissors, { x: p * track.offsetWidth });
  };
  // The counter eases toward real progress; it never runs ahead of what has actually loaded.
  const advance = (target) => gsap.to(progress, { p: target, duration: 0.6, ease: 'power2.out', onUpdate: render, overwrite: true });

  // Continuous snipping while the scissors travel.
  const snip = gsap.timeline({ repeat: -1, yoyo: true, paused: true })
    .to(bladeA, { rotation: -16, duration: 0.16, ease: 'power1.inOut' }, 0)
    .to(bladeB, { rotation: 16, duration: 0.16, ease: 'power1.inOut' }, 0);

  return new Promise((resolve) => {
    const intro = gsap.timeline({ defaults: { ease: EASE.out } })
      .fromTo(letters, { yPercent: 110 }, { yPercent: 0, duration: 0.75, stagger: 0.05, ease: EASE.line }, 0)
      .fromTo(fades, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06 }, 0.2)
      .add(() => snip.play(), 0.3)
      // Something is always moving: creep to 30% while the first assets arrive.
      .add(() => { if (progress.p < 0.3) advance(0.3); }, 0.3)
      .set({}, {}, MIN_TIME); // floor on the intro length

    const assets = trackAssets((ratio) => advance(Math.max(progress.p, 0.3 + ratio * 0.6)));
    const ready = Promise.all([assets, new Promise((r) => intro.eventCallback('onComplete', r))]);

    ready.then(() => {
      gsap.timeline()
        .to(progress, { p: 1, duration: 0.35, ease: 'power2.inOut', onUpdate: render, overwrite: true })
        .add(() => snip.pause())
        .to([bladeA, bladeB], { rotation: 0, duration: 0.12 })
        .to(letters, { yPercent: -110, duration: 0.5, stagger: 0.035, ease: 'power3.in' }, '+=0.05')
        .to(fades, { autoAlpha: 0, y: -10, duration: 0.35, stagger: 0.03, ease: 'power2.in' }, '<')
        // The hero entrance starts as the letters leave, so the page is already moving when the curtain lifts.
        .add(resolve, '<0.15')
        .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.85, ease: EASE.inOut }, '-=0.1')
        .add(() => {
          snip.kill();
          el.remove();
          window.removeEventListener('scroll', toTop);
          document.body.classList.remove('is-locked');
          window.dispatchEvent(new Event('loader:done'));
        });
    });
  });
}
