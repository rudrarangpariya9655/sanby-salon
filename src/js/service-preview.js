import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { finePointer } from './motion.js';

/*
 * Signature services.
 *  - Any link marked [data-service] (service rows, "Book a consultation") pre-selects that service
 *    in the booking form.
 *  - Desktop: the photograph beside the list follows the row you point at — or, while you simply
 *    scroll, the row in the middle of the screen.
 */
export function initServicePreview() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-service]');
    if (link) window.dispatchEvent(new CustomEvent('booking:prefill', { detail: { service: link.dataset.service } }));
  });

  const list = document.querySelector('[data-services]');
  const preview = document.querySelector('[data-service-preview]');
  if (!list || !preview) return;

  const rows = [...list.querySelectorAll('.service')];
  const imgs = [...preview.querySelectorAll('img')];
  const num = preview.querySelector('[data-preview-num]');
  const name = preview.querySelector('[data-preview-name]');
  let active = -1;
  let pointing = false;

  const show = (i) => {
    if (i === active || !imgs[i]) return;
    imgs.forEach((img) => img.classList.remove('is-prev'));
    if (active >= 0) imgs[active].classList.replace('is-active', 'is-prev');
    imgs[i].classList.add('is-active');
    num.textContent = String(i + 1).padStart(2, '0');
    name.textContent = rows[i].querySelector('.service__name').textContent;
    active = i;
  };
  show(0);

  rows.forEach((row, i) => {
    row.addEventListener('pointerenter', () => { pointing = true; show(i); });
    row.addEventListener('focusin', () => show(i));
  });
  list.addEventListener('pointerleave', () => { pointing = false; });

  if (!finePointer()) return;
  rows.forEach((row, i) => {
    ScrollTrigger.create({
      trigger: row,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => { if (self.isActive && !pointing) show(i); },
    });
  });
}
