/*
 * Motion settings shared by every module — one place to tune the feel of the site.
 * Durations are in seconds (GSAP). Movement stays small: this is a salon, not a showreel.
 */
const query = (q) => window.matchMedia(q);

export const reducedMotion = () => query('(prefers-reduced-motion: reduce)').matches;
/** Mouse / trackpad users — hover effects, custom cursor and magnetic buttons only apply here. */
export const finePointer = () => query('(hover: hover) and (pointer: fine)').matches;

export const EASE = {
  out: 'power3.out',
  line: 'power4.out', // masked text lines
  strong: 'expo.out', // image scale-down after a reveal
  inOut: 'expo.inOut', // curtains and clip-path reveals
};

export const MOTION = {
  distance: 32, // px — upward travel for fade-ups (0 with reduced motion)
  duration: 0.85,
  lineDuration: 0.95,
  maskDuration: 1.1,
  stagger: 0.08,
  lineStagger: 0.1,
  start: 'top 88%', // when a reveal fires (element top vs viewport)
  imageScale: 1.18, // images settle from this scale as their mask opens
  parallax: 5, // yPercent each way for [data-parallax-img]
  reducedFade: 0.45, // opacity-only fade used instead of movement when motion is reduced
};
