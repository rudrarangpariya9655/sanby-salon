/* Floating back-to-top: fades in after the first screen, its ring fills with scroll progress. */
export function initBackToTop() {
  const btn = document.querySelector('[data-to-top]');
  if (!btn) return;
  const ring = btn.querySelector('.to-top__progress');
  let frame = 0;

  const update = () => {
    frame = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    btn.classList.toggle('is-visible', y > window.innerHeight * 0.9);
    ring?.style.setProperty('--progress', max > 0 ? Math.min(1, y / max).toFixed(3) : 0);
  };
  const onScroll = () => { frame ||= requestAnimationFrame(update); };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
  // Scrolling and moving focus back to the top are handled by the in-page link logic in nav.js.
}
