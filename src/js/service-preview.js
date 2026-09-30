import { gsap } from 'gsap';
import { EASE, finePointer, reducedMotion } from './motion.js';

/* Desktop: a floating image follows the cursor over the services list. Clicking a service pre-selects it in the booking form. */
export function initServicePreview() {
  const list = document.querySelector('[data-services]');
  const preview = document.querySelector('[data-service-preview]');
  if (!list || !preview) return;

  const links = [...list.querySelectorAll('.service__link')];

  links.forEach((link) => {
    link.addEventListener('click', () => {
      const select = document.querySelector('#f-service');
      const title = link.querySelector('.service__title')?.textContent.trim();
      if (select && title) {
        select.value = title;
        select.dispatchEvent(new Event('change'));
      }
    });
  });

  if (!finePointer() || reducedMotion() || !window.matchMedia('(min-width: 1024px)').matches) return;

  const imgs = links.map((link) => {
    const src = link.querySelector('.service__thumb img');
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.srcset = src.getAttribute('srcset');
    img.sizes = '260px';
    img.src = src.getAttribute('src');
    preview.append(img);
    return img;
  });

  const xTo = gsap.quickTo(preview, 'x', { duration: 0.6, ease: EASE.out });
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.6, ease: EASE.out });
  const rTo = gsap.quickTo(preview, 'rotation', { duration: 0.8, ease: EASE.out });
  const GAP = 40; // px between the cursor and the image, so the title being read stays uncovered
  let lastX = 0;

  // Sits beside the cursor — to the right, or to the left when there's no room.
  const left = (x) => {
    const w = preview.offsetWidth;
    return x + GAP + w < window.innerWidth - 16 ? x + GAP : x - GAP - w;
  };

  list.addEventListener('pointerenter', (e) => {
    gsap.set(preview, { x: left(e.clientX), y: e.clientY });
    lastX = e.clientX;
    preview.classList.add('is-visible');
  });
  list.addEventListener('pointerleave', () => preview.classList.remove('is-visible'));
  list.addEventListener('pointermove', (e) => {
    xTo(left(e.clientX));
    yTo(e.clientY);
    rTo(gsap.utils.clamp(-6, 6, (e.clientX - lastX) * 0.4));
    lastX = e.clientX;
  });

  links.forEach((link, i) => {
    link.addEventListener('pointerenter', () => imgs.forEach((img, j) => img.classList.toggle('is-active', i === j)));
  });
}
