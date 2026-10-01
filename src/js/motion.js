/*
 * Motion settings shared by every module — one place to tune the feel of the site.
 * Durations are in seconds (GSAP). Movement stays small: people should notice the quality, not the library.
 *   micro interactions 0.15–0.25 · UI transitions 0.3–0.45 · editorial reveals 0.6–0.9
 */
const query = (q) => window.matchMedia(q);

export const reducedMotion = () => query('(prefers-reduced-motion: reduce)').matches;
/** Mouse / trackpad users — hover effects, the cursor and magnetic buttons only apply here. */
export const finePointer = () => query('(hover: hover) and (pointer: fine)').matches;

export const EASE = {
  out: 'expo.out', // = cubic-bezier(0.16, 1, 0.3, 1), the site-wide ease (CSS: --ease-out)
  soft: 'power2.out', // opacity-only fades
  inOut: 'expo.inOut', // curtains
};

export const MOTION = {
  distance: 28, // px — upward travel for fade-ups
  duration: 0.85,
  lineDuration: 0.9,
  maskDuration: 0.9,
  stagger: 0.08,
  lineStagger: 0.09,
  start: 'top 86%', // when a reveal fires (element top vs viewport)
  imageScale: 1.14, // images settle from this scale as their mask opens
  parallax: 6, // yPercent each way for [data-parallax-img]
  reducedFade: 0.45, // opacity-only fade used instead of movement when motion is reduced
};
