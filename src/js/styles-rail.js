import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { finePointer } from './motion.js';

gsap.registerPlugin(ScrollTrigger);

/*
 * Featured hairstyles.
 *  - Desktop (mouse, full motion): the row of styles moves sideways as you scroll down. The section is
 *    made as tall as the sideways distance and its content sticks to the screen (CSS position: sticky,
 *    not a JS pin: no layout shift, and the browser handles the sticking). Prev/next and keyboard
 *    focus move the page to the right point, so nothing is out of reach.
 *  - Everywhere else: a native swipe carousel (see scroller.js).
 * Both modes keep the "01 / 06" counter in step with what's on screen.
 */
const PINNED = '(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

export function initStylesRail() {
  const section = document.querySelector('[data-styles]');
  if (!section) return;
  const track = section.querySelector('[data-scroller="styles"]');
  const list = section.querySelector('[data-styles-list]');
  const cards = [...list.children];
  const styleCards = cards.filter((c) => !c.classList.contains('style-card--end'));
  const current = section.querySelector('[data-styles-current]');
  const hint = section.querySelector('[data-styles-hint]');
  const bar = section.querySelector('[data-scroller-progress="styles"]');
  const prev = section.querySelector('[data-scroller-prev="styles"]');
  const next = section.querySelector('[data-scroller-next="styles"]');

  const pad = () => parseFloat(getComputedStyle(list).paddingLeft) || 0;
  let active = 0;

  // Which style is in front: the last one whose left edge has reached the start of the row.
  const sync = (offset, atEnd) => {
    let i = 0;
    styleCards.forEach((card, j) => {
      if (card.offsetLeft - pad() <= offset + card.offsetWidth * 0.5) i = j;
    });
    if (atEnd) i = styleCards.length - 1;
    active = i;
    current.textContent = String(i + 1).padStart(2, '0');
  };

  const setHint = (text) => { if (hint) hint.textContent = text; };
  setHint(finePointer() ? 'Drag to explore' : 'Swipe to explore');

  // Native mode: follow the carousel's own scroll position.
  track.addEventListener('scroll', () => {
    if (section.classList.contains('is-pinned')) return;
    const max = track.scrollWidth - track.clientWidth;
    sync(track.scrollLeft, track.scrollLeft >= max - 2);
  }, { passive: true });

  gsap.matchMedia().add(PINNED, () => {
    section.classList.add('is-pinned');
    track.scrollLeft = 0;
    setHint('Scroll to explore');
    const distance = () => Math.max(0, list.scrollWidth - track.clientWidth);
    // One screen to stick in, plus the sideways distance to scroll through. Set before every
    // ScrollTrigger measure so everything further down the page is positioned correctly.
    const setHeight = () => { section.style.height = `${window.innerHeight + distance()}px`; };
    setHeight();
    ScrollTrigger.addEventListener('refreshInit', setHeight);

    const tween = gsap.to(list, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          sync(self.progress * distance(), self.progress > 0.985);
          bar?.style.setProperty('--progress', (0.14 + self.progress * 0.86).toFixed(3));
          prev.disabled = self.progress <= 0.001;
          next.disabled = self.progress >= 0.999;
        },
      },
    });
    const st = tween.scrollTrigger;

    // Scroll the page to the point where a card sits at the start of the row.
    const scrollToCard = (card, behavior = 'smooth') => {
      const d = distance();
      const x = Math.min(d, Math.max(0, card.offsetLeft - pad()));
      window.scrollTo({ top: st.start + (d ? x / d : 0) * (st.end - st.start), behavior });
    };
    const onPrev = () => scrollToCard(styleCards[Math.max(0, active - 1)]);
    const onNext = () => scrollToCard(cards[Math.min(cards.length - 1, active + 1)]);
    // Keyboard: tabbing onto a card that's off to the side brings it into view.
    const onFocus = (e) => {
      const card = e.target.closest('.style-card');
      if (card && e.target.matches(':focus-visible')) scrollToCard(card, 'auto');
    };
    prev.addEventListener('click', onPrev);
    next.addEventListener('click', onNext);
    list.addEventListener('focusin', onFocus);
    prev.disabled = true;
    next.disabled = false;

    return () => {
      ScrollTrigger.removeEventListener('refreshInit', setHeight);
      section.style.height = '';
      section.classList.remove('is-pinned');
      prev.removeEventListener('click', onPrev);
      next.removeEventListener('click', onNext);
      list.removeEventListener('focusin', onFocus);
      setHint(finePointer() ? 'Drag to explore' : 'Swipe to explore');
      // Let the native carousel re-measure its buttons and progress.
      requestAnimationFrame(() => track.dispatchEvent(new Event('scroller:refresh')));
    };
  });
}
