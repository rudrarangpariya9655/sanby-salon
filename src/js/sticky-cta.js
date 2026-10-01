/*
 * Phones: a "Book a Chair" button pinned to the bottom of the screen.
 * It appears once the hero (which has its own booking button) has mostly scrolled away, and steps
 * aside whenever a section marked [data-sticky-hide] is on screen — the booking band, the form,
 * contact details and the footer — so it never covers what people came to read or fill in.
 * Visibility is purely CSS below 768px; on larger screens the element isn't displayed at all.
 */
export function initStickyCta() {
  const bar = document.querySelector('[data-sticky-cta]');
  const hero = document.querySelector('.hero');
  if (!bar || !hero) return;

  let pastHero = false;
  const inView = new Set();
  const update = () => {
    const show = pastHero && inView.size === 0;
    bar.classList.toggle('is-visible', show);
    document.documentElement.classList.toggle('has-sticky-cta', show);
  };

  // "Past the hero" once its bottom edge is above the top 40% of the screen.
  new IntersectionObserver(([entry]) => {
    pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    update();
  }, { rootMargin: '0px 0px -60% 0px' }).observe(hero);

  const zones = new IntersectionObserver((entries) => {
    entries.forEach((entry) => (entry.isIntersecting ? inView.add(entry.target) : inView.delete(entry.target)));
    update();
  });
  document.querySelectorAll('[data-sticky-hide]').forEach((el) => zones.observe(el));
}
