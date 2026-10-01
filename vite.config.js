import { defineConfig, loadEnv } from 'vite';
import site from './site.config.js';

/*
 * Responsive image helper.
 *
 * In index.html, write:
 *   <img data-img="PHOTO_ID" width="800" height="1000" data-sizes="(min-width: 1024px) 40vw, 100vw" alt="…">
 * or, for art-directed crops inside <picture>:
 *   <source media="(max-width: 767px)" data-img="PHOTO_ID" width="900" height="1600" data-sizes="100vw">
 *
 * At dev/build time this expands into src/srcset (AVIF/WebP negotiated by the CDN via auto=format),
 * cropped to the aspect ratio given by width/height so the browser can reserve space (no layout shift).
 * Optional: data-crop (imgix crop mode, e.g. "top", "faces,right") and data-max (largest width to offer).
 *
 * The current photos are Unsplash placeholders. GRADE gives them one consistent treatment — slightly warm,
 * muted, a touch more contrast — so they read as a single shoot. To use the salon's own photography,
 * swap the IDs or replace the tags with local files (e.g. /images/….webp), graded the same way.
 */
const WIDTHS = [480, 768, 1080, 1440, 1920, 2560];
const GRADE = 'sat=-18&con=6&sepia=10';
const HERO_PHOTO = '1503951914875-452162b0f3f1';

function unsplash(id, w, ratio, crop = 'center') {
  const h = Math.round(w * ratio);
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=${crop}&q=72&w=${w}&h=${h}&${GRADE}`;
}

function imageAttrs(attrs) {
  const width = Number(/\swidth="(\d+)"/.exec(attrs)?.[1] ?? 1200);
  const height = Number(/\sheight="(\d+)"/.exec(attrs)?.[1] ?? 800);
  const sizes = /\sdata-sizes="([^"]+)"/.exec(attrs)?.[1] ?? '100vw';
  const crop = /\sdata-crop="([^"]+)"/.exec(attrs)?.[1] ?? 'center';
  const max = /\sdata-max="(\d+)"/.exec(attrs)?.[1];
  const widths = WIDTHS.filter((w) => !max || w <= Number(max));
  const cleaned = attrs.replace(/\sdata-(sizes|crop|max)="[^"]*"/g, '');
  return { ratio: height / width, sizes, crop, widths, cleaned };
}

function responsiveImages() {
  return {
    name: 'sanby-responsive-images',
    transformIndexHtml(html) {
      const srcset = (id, a) => a.widths.map((w) => `${unsplash(id, w, a.ratio, a.crop)} ${w}w`).join(', ');
      return html
        .replace(/<source\b([^>]*?)\sdata-img="([^"]+)"([^>]*)>/g, (match, before, id, after) => {
          const a = imageAttrs(before + after);
          return `<source${a.cleaned} srcset="${srcset(id, a)}" sizes="${a.sizes}">`;
        })
        .replace(/<img\b([^>]*?)\sdata-img="([^"]+)"([^>]*)>/g, (match, before, id, after) => {
          const a = imageAttrs(before + after);
          const src = unsplash(id, a.widths[Math.min(2, a.widths.length - 1)], a.ratio, a.crop);
          return `<img${a.cleaned} src="${src}" srcset="${srcset(id, a)}" sizes="${a.sizes}">`;
        });
    },
  };
}

/*
 * Preloads the Latin font files the first screen uses (headline serif, its italic, body sans), so they
 * start downloading with the HTML instead of after the stylesheet — the headline settles sooner.
 * Other subsets (Cyrillic, Greek…) still load only if a page ever needs them.
 */
const PRELOAD_FONTS = [/cormorant-garamond-latin-wght-normal/, /cormorant-garamond-latin-wght-italic/, /manrope-latin-wght-normal/];
function preloadFonts() {
  return {
    name: 'sanby-preload-fonts',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      const files = Object.keys(ctx.bundle ?? {}).filter((f) => f.endsWith('.woff2') && PRELOAD_FONTS.some((re) => re.test(f)));
      return files.map((f) => ({
        tag: 'link',
        attrs: { rel: 'preload', href: `/${f}`, as: 'font', type: 'font/woff2', crossorigin: '' },
        injectTo: 'head',
      }));
    },
  };
}

/* Replaces %SITE_URL% in HTML and emits robots.txt + sitemap.xml for the configured domain. */
function seoFiles(siteUrl) {
  const base = siteUrl.replace(/\/$/, '');
  return {
    name: 'sanby-seo-files',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', base),
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
      });
    },
  };
}

/*
 * Fills index.html with the business details from site.config.js.
 *
 *   <!--site:KEY-->placeholder markup<!--/site:KEY-->  → replaced by the rendered detail when it is set,
 *                                                        otherwise the placeholder stays.
 *   %SITE_JSONLD%                                       → structured data built from confirmed details only.
 *   %SITE_OG_IMAGE%                                     → social sharing image.
 *   %YEAR%                                              → current year (footer).
 */
const SERVICES = ['Haircut', 'Beard Styling', 'Hair + Beard', 'Hair Styling', 'Hair Wash', 'Hair Colour'];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const digits = (s) => s.replace(/[^\d]/g, '');
const tel = (s) => `tel:+${digits(s)}`;
const instagramUrl = (handle) => `https://www.instagram.com/${handle.replace(/^@/, '')}/`;
const instagramHandle = (handle) => `@${esc(handle.replace(/^@/, ''))}`;

function siteDetails(site, siteUrl, ogImage) {
  const out = 'target="_blank" rel="noopener"';
  const placeholder = (text, sm) => `<span class="placeholder${sm ? ' placeholder--sm' : ''}">${text}</span>`;
  const icon = (id, cls = '') => `<svg${cls ? ` class="${cls}"` : ''} aria-hidden="true"><use href="#${id}"/></svg>`;
  const external = icon('i-arrow-up-right');
  const addressHtml = () =>
    site.map.link ? `<a class="link" href="${esc(site.map.link)}" ${out}>${esc(site.address)}</a>` : esc(site.address);

  const reviews = site.reviews ?? { verified: false, items: [] };
  const rating = (n) => Math.min(5, Math.max(1, Math.round(Number(n) || 5)));
  // Star ratings are only shown for verified reviews; sample reviews carry a "Sample" tag instead,
  // so no made-up rating is ever displayed.
  const stars = (n) =>
    reviews.verified
      ? `<span class="stars" role="img" aria-label="${rating(n)} out of 5 stars">${icon('i-star').repeat(rating(n))}</span>`
      : '<span class="review-tag">Sample</span>';
  const [featured, ...others] = reviews.items ?? [];

  const figures = site.figures ?? { confirmed: false, items: [] };
  const figure = (f) => {
    const value = String(f.value);
    const decimals = value.includes('.') ? value.split('.')[1].length : 0;
    const after = f.star
      ? '<svg class="figures__star" aria-hidden="true"><use href="#i-star"/></svg>'
      : f.suffix
        ? `<span class="figures__suffix">${esc(f.suffix)}</span>`
        : '';
    return `<li class="figures__item" data-reveal>
              <p class="figures__value"><span data-count="${esc(value)}"${decimals ? ` data-decimals="${decimals}"` : ''}>${esc(value)}</span>${after}</p>
              <p class="figures__label">${esc(f.label)}</p>
            </li>`;
  };
  const bookingConnected = Boolean(site.booking?.endpoint || site.whatsapp);

  const render = {
    address: () => site.address && addressHtml(),
    phone: () => site.phone && `<a class="link" href="${tel(site.phone)}">${esc(site.phone)}</a>`,
    whatsapp: () => site.whatsapp && `<a class="link" href="https://wa.me/${digits(site.whatsapp)}" ${out}>${esc(site.whatsapp)}</a>`,
    instagram: () => site.instagram && `<a class="link" href="${instagramUrl(site.instagram)}" ${out}>${instagramHandle(site.instagram)}</a>`,
    hours: () =>
      site.hours
        .map((h) => `<tr data-line data-reveal><th scope="row">${esc(h.days)}</th><td>${h.time ? esc(h.time) : placeholder('Hours to be added')}</td></tr>`)
        .join('\n'),
    map: () =>
      site.map.embed &&
      `<iframe class="map__frame" src="${esc(site.map.embed)}" title="Map showing the location of ${esc(site.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`,
    'contact-actions': () => {
      const actions = [
        site.phone && `<a class="btn btn--primary" href="${tel(site.phone)}">${icon('i-phone', 'btn__icon btn__icon--lead')}<span>Call</span></a>`,
        site.whatsapp && `<a class="btn btn--ghost" href="https://wa.me/${digits(site.whatsapp)}" ${out}>${icon('i-whatsapp', 'btn__icon btn__icon--lead')}<span>WhatsApp</span></a>`,
        site.map.link && `<a class="btn btn--ghost" href="${esc(site.map.link)}" ${out}>${icon('i-pin', 'btn__icon btn__icon--lead')}<span>Directions</span></a>`,
      ].filter(Boolean);
      return actions.length ? `<div class="contact__actions" data-reveal>${actions.join('')}</div>` : '';
    },
    'menu-contacts': () => {
      const items = [
        site.phone && `<li><a href="${tel(site.phone)}">${icon('i-phone')}${esc(site.phone)}</a></li>`,
        site.instagram && `<li><a href="${instagramUrl(site.instagram)}" ${out}>${icon('i-instagram')}${instagramHandle(site.instagram)}</a></li>`,
      ].filter(Boolean);
      return items.length ? `<ul class="menu__contacts">${items.join('')}</ul>` : '';
    },
    'cta-call': () =>
      site.phone && `<a class="btn btn--ghost btn--lg" href="${tel(site.phone)}">${icon('i-phone', 'btn__icon btn__icon--lead')}<span>Call the Salon</span></a>`,
    'booking-whatsapp': () =>
      site.whatsapp &&
      `<button class="btn btn--ghost btn--lg" type="submit" name="via" value="whatsapp" data-form-whatsapp>${icon('i-whatsapp', 'btn__icon btn__icon--lead')}<span>Book through WhatsApp</span></button>`,
    'reviews-notice': () =>
      reviews.verified
        ? reviews.link && `<a class="link-arrow reviews__all" href="${esc(reviews.link)}" ${out}><span>Read all reviews</span>${external}</a>`
        : `<p class="reviews__notice" data-reveal>${placeholder('Sample reviews', true)}<span>Shown for layout only — to be replaced with verified client reviews.</span></p>`,
    'reviews-featured': () =>
      featured &&
      `<figure class="review-feature">
          <blockquote class="review-feature__quote"><p data-split>&ldquo;${esc(featured.quote)}&rdquo;</p></blockquote>
          <figcaption class="review-feature__meta">${stars(featured.rating)}<span class="review-feature__name">${esc(featured.name)}</span><span class="review-feature__service">${esc(featured.service)}</span></figcaption>
        </figure>`,
    'reviews-list': () =>
      others
        .map(
          (r) => `<li class="review" data-reveal>
            ${stars(r.rating)}
            <blockquote class="review__quote"><p>&ldquo;${esc(r.quote)}&rdquo;</p></blockquote>
            <p class="review__meta"><span class="review__name">${esc(r.name)}</span><span class="review__service">${esc(r.service)}</span></p>
          </li>`,
        )
        .join('\n'),
    figures: () =>
      figures.items?.length &&
      `<ul class="figures" aria-label="${esc(site.name)} at a glance" data-stats>
            ${figures.items.map(figure).join('\n            ')}
          </ul>${
            figures.confirmed
              ? ''
              : `\n          <p class="figures__note" data-reveal>${placeholder('To be confirmed', true)}<span>Figures awaiting confirmation from the salon.</span></p>`
          }`,
    // Shown above the form when there is nowhere to send a request yet, so nobody fills it in for nothing.
    'booking-offline': () =>
      !bookingConnected &&
      `<p class="form__offline">${icon('i-info')}<span><strong>Online requests are being set up.</strong> Until then this form can't send your request to the salon — please contact Sanby directly to book.</span></p>`,
    'footer-address': () => site.address && addressHtml(),
    'footer-phone': () => site.phone && `<a class="link" href="${tel(site.phone)}">${esc(site.phone)}</a>`,
    'footer-instagram': () => site.instagram && `<a class="link" href="${instagramUrl(site.instagram)}" ${out}>Instagram ${external}</a>`,
    'footer-facebook': () => site.facebook && `<a class="link" href="${esc(site.facebook)}" ${out}>Facebook ${external}</a>`,
  };

  // <!--site:service-SLUG--> → "45 min · From 500" under that service, once either detail is set.
  const serviceMeta = (slug) => {
    const s = site.services?.[slug];
    if (!s) throw new Error(`site.config: no services entry for "${slug}"`);
    const parts = [s.duration, s.price].filter(Boolean).map(esc);
    return parts.length ? `<span class="service__meta">${parts.join('<i aria-hidden="true"></i>')}</span>` : '';
  };

  const jsonLd = () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': ['HairSalon', 'BarberShop'],
      name: site.name,
      description: "Men's salon and barber offering men's haircuts, beard styling, hair styling, hair wash and hair colour.",
      url: `${siteUrl}/`,
      image: ogImage,
      slogan: 'Sharp cuts. Clean style. Pure confidence.',
    };
    data.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: "Men's grooming services",
      itemListElement: SERVICES.map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
    };
    if (site.address) {
      const d = site.addressDetails ?? {};
      data.address = {
        '@type': 'PostalAddress',
        streetAddress: site.address,
        ...(d.locality && { addressLocality: d.locality }),
        ...(d.region && { addressRegion: d.region }),
        ...(d.postalCode && { postalCode: d.postalCode }),
        ...(d.country && { addressCountry: d.country }),
      };
    }
    const openingHours = site.hours.map((h) => h.schema).filter(Boolean);
    if (openingHours.length) data.openingHours = openingHours;
    if (site.phone) data.telephone = `+${digits(site.phone)}`;
    if (site.map.link) data.hasMap = site.map.link;
    const sameAs = [site.instagram && instagramUrl(site.instagram), site.facebook].filter(Boolean);
    if (sameAs.length) data.sameAs = sameAs;
    return JSON.stringify(data, null, 2);
  };

  return {
    name: 'sanby-site-details',
    transformIndexHtml: (html) =>
      html
        .replace(/<!--site:([\w-]+)-->([\s\S]*?)<!--\/site:\1-->/g, (_, key, fallback) => {
          if (key.startsWith('service-')) return serviceMeta(key.slice(8)) || fallback;
          if (!render[key]) throw new Error(`site.config: no renderer for "${key}"`);
          return render[key]() || fallback;
        })
        .replace('%SITE_JSONLD%', jsonLd)
        .replaceAll('%SITE_OG_IMAGE%', ogImage)
        .replaceAll('%YEAR%', String(new Date().getFullYear())),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.SITE_URL || 'https://sanby-salon.vercel.app').replace(/\/$/, '');
  const ogImage = unsplash(HERO_PHOTO, 1200, 630 / 1200, 'top');
  return {
    plugins: [responsiveImages(), siteDetails(site, siteUrl, ogImage), seoFiles(siteUrl), preloadFonts()],
    build: {
      target: 'es2019',
      cssMinify: true,
    },
  };
});
