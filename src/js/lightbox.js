import { gsap } from 'gsap';
import { EASE, reducedMotion as reduced } from './motion.js';

const dialog = document.querySelector('[data-lightbox]');
const img = dialog.querySelector('[data-lightbox-img]');
const caption = dialog.querySelector('[data-lightbox-caption]');
const count = dialog.querySelector('[data-lightbox-count]');
const book = dialog.querySelector('[data-lightbox-book]');
const bookLabel = dialog.querySelector('[data-lightbox-book-label]');

let items = [];
let index = 0;
let returnFocus = null;
let closing = false;
let request = 0; // latest slide request — earlier ones are dropped if the user clicks through quickly

function slideFor(trigger) {
  const source = trigger.querySelector('img');
  return {
    srcset: source.getAttribute('srcset'),
    src: source.getAttribute('src'),
    alt: source.getAttribute('alt'),
    caption: trigger.dataset.caption || '',
    look: trigger.dataset.book || '', // hairstyles can be booked straight from the viewer
  };
}

// Swaps the image and resolves once the new one is decoded, so it never fades in half-loaded.
function load(slide) {
  dialog.classList.add('is-loading');
  img.srcset = slide.srcset || '';
  img.sizes = '(min-width: 768px) 80vw, 100vw';
  img.src = slide.src;
  img.alt = slide.alt;
  caption.textContent = slide.caption;
  book.hidden = !slide.look;
  bookLabel.textContent = slide.look ? `Book the ${slide.look}` : '';
  count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
  return img.decode().catch(() => {}).finally(() => dialog.classList.remove('is-loading'));
}

function render(dir = 0) {
  const id = ++request;
  const slide = slideFor(items[index]);
  if (!dir || reduced()) {
    return load(slide).then(() => {
      if (id === request && !reduced()) gsap.fromTo(img, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: EASE.out });
    });
  }
  return gsap.to(img, { autoAlpha: 0, x: -24 * dir, duration: 0.2, ease: 'power2.in', overwrite: true })
    .then(() => (id === request ? load(slide) : null))
    .then(() => {
      if (id !== request) return;
      gsap.fromTo(img, { x: 24 * dir, autoAlpha: 0 }, { autoAlpha: 1, x: 0, duration: 0.45, ease: EASE.out, overwrite: true });
    });
}

function go(dir) {
  index = (index + dir + items.length) % items.length;
  render(dir);
}

export function open(group, start, trigger) {
  items = group;
  index = Math.max(0, start);
  returnFocus = trigger;
  closing = false;
  dialog.toggleAttribute('data-single', items.length < 2);
  gsap.set(img, { autoAlpha: 0 });
  dialog.showModal();
  document.body.classList.add('is-locked');
  // Keyboard focus starts on "Close" so Esc, Tab and the arrow keys work straight away.
  dialog.querySelector('[data-lightbox-close]').focus();
  // Opacity only: hiding the dialog (visibility) even for a frame would throw focus back to the page.
  if (!reduced()) gsap.fromTo(dialog, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
  render().then(() => { if (reduced()) gsap.set(img, { autoAlpha: 1 }); });
}

function close(after) {
  if (closing || !dialog.open) return;
  closing = true;
  request++;
  const done = () => {
    dialog.close();
    document.body.classList.remove('is-locked');
    gsap.set([dialog, img], { clearProps: 'opacity,visibility,transform' });
    if (after) after();
    else returnFocus?.focus({ preventScroll: true });
  };
  if (reduced()) done();
  else gsap.to(dialog, { opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: done });
}

dialog.querySelector('[data-lightbox-close]').addEventListener('click', () => close());
dialog.querySelector('[data-lightbox-prev]').addEventListener('click', () => go(-1));
dialog.querySelector('[data-lightbox-next]').addEventListener('click', () => go(1));

// "Book the Pompadour": pre-fill the request, close the viewer and take the visitor to the form.
book.addEventListener('click', (e) => {
  e.preventDefault();
  const look = items[index]?.dataset.book;
  window.dispatchEvent(new CustomEvent('booking:prefill', { detail: { service: 'Haircut', notes: `I'd like the ${look}.` } }));
  close(() => {
    const target = document.getElementById('booking');
    target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    document.getElementById('f-name')?.focus({ preventScroll: true });
  });
});

// Esc: animate out instead of the instant native close.
dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
dialog.addEventListener('keydown', (e) => {
  if (items.length < 2) return;
  if (e.key === 'ArrowRight') go(1);
  if (e.key === 'ArrowLeft') go(-1);
});

// Clicking the empty area around the image closes the viewer.
dialog.addEventListener('click', (e) => {
  if (e.target === dialog || e.target.classList.contains('lightbox__stage')) close();
});

// Touch swipe between images.
let startX = null;
dialog.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') startX = e.clientX; });
dialog.addEventListener('pointerup', (e) => {
  if (startX === null || items.length < 2) return;
  const dx = e.clientX - startX;
  startX = null;
  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
});
