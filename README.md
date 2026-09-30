# Sanby Salon — website

A single-page site for Sanby Salon, a men's grooming studio. Built with Vite, vanilla JS and GSAP + ScrollTrigger. Fonts (Playfair Display and Manrope) are self-hosted.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/, including robots.txt and sitemap.xml
npm run preview
```

## Before launch: replace the placeholder content

Nothing on the site makes up business facts. Anything still unknown is shown on the page as a dashed **"… to be added"** badge (`.placeholder`), or is marked with a `REPLACE` comment in `index.html`.

### Business details → `site.config.js`

Address, phone, WhatsApp, Instagram, Facebook, opening hours, map and booking endpoint all live in **`site.config.js`**. Leave a value empty until it is confirmed. At build time each filled-in value replaces its placeholder in the contact section and footer, and:

- `phone` turns the "Call Salon" button into a `tel:` link (until then it scrolls to Contact);
- `map.embed` swaps the "Map coming soon" panel for the embedded Google Map;
- confirmed details are added to the structured data (`application/ld+json`);
- `phone`, `whatsapp` and `map.link` also add large **Call / WhatsApp / Directions** buttons under the contact details (easy to tap on phones);
- `services` adds an optional duration and/or price line under each service (e.g. `45 min · From 500`). Empty values show nothing;
- `booking.endpoint` (e.g. Formspree) makes the form POST requests, with loading, success and error states. Without an endpoint but with `whatsapp` set, the form opens WhatsApp with the request pre-filled. With neither, it tells the visitor that online booking isn't connected yet and sends nothing.

Restart `npm run dev` after editing the file.

### Other content

| What | Where |
|---|---|
| Live domain (canonical URL, Open Graph, sitemap, robots) | `.env` → `SITE_URL` |
| Stats (5+ years, 1000+ clients, 4.9 rating) | `index.html` → `[data-stats]` in the About section. **Confirm these figures are accurate before launch.** |
| Reviews | `index.html` → `#reviews`. These are sample reviews (labelled as such on the page); replace them with real, verified ones and remove the `.reviews__notice` line. |
| Before/after photos | `index.html` → `#transformation`. Use the same client in both photos, with their permission. |
| Prices / durations | Not shown until set. Add them in `site.config.js` → `services` once the salon supplies a price list. |

## Images

The photos are Unsplash placeholders. `vite.config.js` turns `<img data-img="PHOTO_ID" width height>` into a responsive `srcset` (AVIF or WebP, depending on the browser) cropped to the given aspect ratio. To use the salon's own photos, swap in new IDs, or replace the tags with local optimised files (for example `public/images/*.webp`) plus explicit `width` and `height`.

## Structure

```
index.html              Semantic markup for every section (Navbar → Footer)
site.config.js          Business details (see above)
src/main.js             Entry point: fonts, styles and module setup
src/styles/             base (tokens), components, nav-hero, sections, contact-footer, loader
src/js/motion.js        Shared motion settings: eases, durations, distances, reduced-motion / fine-pointer checks
src/js/loader.js        Branded preloader — real progress (fonts + hero image), once per session
src/js/animations.js    Hero entrance, scroll reveals, counters, parallax, hero seal, service marquee, footer wordmark
src/js/nav.js           Compact-on-scroll nav, sliding active-section indicator, accessible mobile menu
src/js/scroller.js      Styles and review carousels (native swipe plus mouse drag with momentum)
src/js/compare.js       Before/after slider (pointer, touch and keyboard)
src/js/service-preview.js  Image beside the cursor over the services list (desktop)
src/js/pointer.js       Trailing cursor ring with link / slider / "Drag" / "View" states, magnetic buttons (fine pointers only)
src/js/lightbox*.js     Lazy-loaded image viewer (keyboard, swipe)
src/js/booking-form.js  Validation and delivery (endpoint / WhatsApp / not connected)
src/js/back-to-top.js   Floating back-to-top with scroll progress
```

## Motion

All timing lives in `src/js/motion.js`. The preloader plays once per browser session; later loads go straight to the hero entrance.

`prefers-reduced-motion` is honoured throughout: no preloader, parallax, marquee, cursor effects or movement, and sections simply fade in.

Reveal variants: `data-reveal` fades up, `data-reveal="mask"` wipes an image open, `data-reveal="panel"` opens the booking panel on scroll, and `data-reveal="fade"` fades in place. Use `fade` on anything a link scrolls to (like the booking form), so the browser doesn't aim at it while it's still offset. Content is only hidden before animating while the script is running. A fallback timer reveals everything if it never loads.
# sanby-salon
