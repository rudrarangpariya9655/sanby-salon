/* Lightbox code is only downloaded the first time someone opens an image. */
let lightbox;

export function initLightboxTriggers() {
  document.addEventListener('click', async (e) => {
    const trigger = e.target.closest('[data-lightbox-item]');
    if (!trigger) return;
    e.preventDefault();
    lightbox ??= await import('./lightbox.js');
    const group = [...document.querySelectorAll(`[data-lightbox-group="${trigger.dataset.lightboxGroup}"]`)];
    lightbox.open(group, group.indexOf(trigger), trigger);
  });
}
