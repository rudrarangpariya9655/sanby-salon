import { gsap } from 'gsap';
import { EASE, reducedMotion } from './motion.js';

const DESKTOP = window.matchMedia('(min-width: 1100px)');

/* Sliding underline that follows the active section's link. */
function activeSection(nav) {
  const links = [...nav.querySelectorAll('[data-nav-link]')];
  const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
  const indicator = nav.querySelector('[data-nav-indicator]');
  const bar = indicator?.parentElement;
  let current = null;

  const place = () => {
    if (!indicator) return;
    // Hidden below desktop (links collapse into the menu) or when no linked section is in view.
    const visible = current && current.offsetParent;
    indicator.style.setProperty('--on', visible ? 1 : 0);
    if (!visible) return;
    const a = current.getBoundingClientRect();
    indicator.style.setProperty('--x', `${a.left - bar.getBoundingClientRect().left}px`);
    indicator.style.setProperty('--w', `${a.width}px`);
  };

  const setActive = (link) => {
    if (link === current) return;
    current?.removeAttribute('aria-current');
    link?.setAttribute('aria-current', 'location');
    current = link;
    place();
  };

  // Every section reports when it crosses the middle of the viewport. Sections without a nav link
  // (before/after, why, booking) clear the highlight rather than leaving the previous one lit.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(byId.get(entry.target.id) ?? null);
      });
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  document.querySelectorAll('main > section[id]').forEach((s) => observer.observe(s));

  // Re-measure once the final fonts are in and whenever the layout changes; enable the slide after the first placement.
  document.fonts?.ready.then(place);
  window.addEventListener('resize', place);
  requestAnimationFrame(() => { place(); requestAnimationFrame(() => indicator?.classList.add('is-ready')); });
}

function mobileMenu(nav) {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (!toggle || !menu) return;
  const label = toggle.querySelector('.visually-hidden');
  const items = menu.querySelectorAll('.menu__list a, .menu__foot > *');
  let open = false;
  let tl;

  const focusables = () => [toggle, ...menu.querySelectorAll('a, button')];

  function openMenu() {
    open = true;
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    label.textContent = 'Close menu';
    nav.classList.add('is-menu-open');
    document.body.classList.add('is-locked');
    tl?.kill();
    if (!reducedMotion()) {
      tl = gsap.timeline()
        .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: EASE.inOut })
        .fromTo(items, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: EASE.out, stagger: 0.045 }, 0.2);
    }
  }

  function closeMenu({ focusToggle = false } = {}) {
    if (!open) return;
    open = false;
    toggle.setAttribute('aria-expanded', 'false');
    label.textContent = 'Open menu';
    document.body.classList.remove('is-locked');
    tl?.kill();
    const done = () => {
      menu.hidden = true;
      nav.classList.remove('is-menu-open');
      gsap.set([menu, ...items], { clearProps: 'all' });
    };
    if (reducedMotion()) done();
    else tl = gsap.to(menu, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.45, ease: EASE.inOut, onComplete: done });
    if (focusToggle) toggle.focus();
  }

  toggle.addEventListener('click', () => (open ? closeMenu() : openMenu()));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });

  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') { closeMenu({ focusToggle: true }); return; }
    if (e.key !== 'Tab') return;
    // Keep focus inside the toggle + menu while open.
    const list = focusables();
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  DESKTOP.addEventListener('change', (e) => { if (e.matches) closeMenu(); });
}

export function initNav() {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;

  // Transparent over the hero; compact with a frosted background once the page scrolls.
  let scrolled = null;
  const onScroll = () => {
    const next = window.scrollY > 24;
    if (next !== scrolled) nav.classList.toggle('is-scrolled', (scrolled = next));
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  activeSection(nav);
  mobileMenu(nav);
}
