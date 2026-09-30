import { defineConfig, loadEnv } from 'vite';
import site from './site.config.js';

/*
 * Responsive image helper.
 *
 * In index.html, write:
 *   <img data-img="PHOTO_ID" width="800" height="1000" data-sizes="(min-width: 1024px) 40vw, 100vw" alt="…">
 *
 * At dev/build time this expands into src + srcset (AVIF/WebP negotiated by the CDN via auto=format),
 * cropped to the aspect ratio given by width/height so the browser can reserve space (no layout shift).
 *
 * The current photos are Unsplash placeholders. To use the salon's own photography, either
 * swap the IDs or replace the <img> tags with local files (e.g. /images/…​.webp).
 */
const WIDTHS = [480, 768, 1080, 1440, 1920];

function unsplash(id, w, ratio, crop) {
  const h = Math.round(w * ratio);
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=${crop}&q=72&w=${w}&h=${h}`;
}

function responsiveImages() {
  return {
    name: 'sanby-responsive-images',
    transformIndexHtml(html) {
      return html.replace(/<img\b([^>]*?)\sdata-img="([^"]+)"([^>]*)>/g, (match, before, id, after) => {
        const attrs = before + after;
        const width = Number(/\swidth="(\d+)"/.exec(attrs)?.[1] ?? 1200);
        const height = Number(/\sheight="(\d+)"/.exec(attrs)?.[1] ?? 800);
        const sizes = /\sdata-sizes="([^"]+)"/.exec(attrs)?.[1] ?? '100vw';
        const crop = /\sdata-crop="([^"]+)"/.exec(attrs)?.[1] ?? 'center';
        const max = /\sdata-max="(\d+)"/.exec(attrs)?.[1];
        const ratio = height / width;
        const widths = WIDTHS.filter((w) => !max || w <= Number(max));
        const srcset = widths.map((w) => `${unsplash(id, w, ratio, crop)} ${w}w`).join(', ');
        const src = unsplash(id, widths[Math.min(2, widths.length - 1)], ratio, crop);
        const cleaned = attrs.replace(/\sdata-(sizes|crop|max)="[^"]*"/g, '');
        return `<img${cleaned} src="${src}" srcset="${srcset}" sizes="${sizes}">`;
      });
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
 *   %SITE_CALL_HREF%                                    → tel: link, or #contact until a phone number exists.
 *   %SITE_JSONLD%                                       → structured data built from confirmed details only.
 */
const SERVICES = ['Haircut', 'Beard Styling', 'Hair + Beard', 'Hair Styling', 'Hair Wash', 'Hair Colour'];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const digits = (s) => s.replace(/[^\d]/g, '');
const tel = (s) => `tel:+${digits(s)}`;
const instagramUrl = (handle) => `https://www.instagram.com/${handle.replace(/^@/, '')}/`;

function siteDetails(site, siteUrl) {
  const out = 'target="_blank" rel="noopener"';
  const placeholder = (text, sm) => `<span class="placeholder${sm ? ' placeholder--sm' : ''}">${text}</span>`;
  const addressHtml = () =>
    site.map.link ? `<a class="link" href="${esc(site.map.link)}" ${out}>${esc(site.address)}</a>` : esc(site.address);

  const render = {
    address: () => site.address && addressHtml(),
    phone: () => site.phone && `<a class="link" href="${tel(site.phone)}">${esc(site.phone)}</a>`,
    whatsapp: () => site.whatsapp && `<a class="link" href="https://wa.me/${digits(site.whatsapp)}" ${out}>${esc(site.whatsapp)}</a>`,
    instagram: () => site.instagram && `<a class="link" href="${instagramUrl(site.instagram)}" ${out}>@${esc(site.instagram.replace(/^@/, ''))}</a>`,
    hours: () =>
      site.hours
        .map((h) => `<tr><th scope="row">${esc(h.days)}</th><td>${h.time ? esc(h.time) : placeholder('Hours to be added')}</td></tr>`)
        .join('\n'),
    map: () =>
      site.map.embed &&
      `<iframe class="map__frame" src="${esc(site.map.embed)}" title="Map showing the location of ${esc(site.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`,
    'footer-address': () => site.address && addressHtml(),
    'footer-phone': () => site.phone && `<a class="link" href="${tel(site.phone)}">${esc(site.phone)}</a>`,
    'footer-instagram': () =>
      site.instagram && `<a class="link" href="${instagramUrl(site.instagram)}" ${out}><svg aria-hidden="true"><use href="#i-instagram"/></svg>Instagram</a>`,
    'contact-actions': () => {
      const actions = [
        site.phone && `<a class="btn btn--primary" href="${tel(site.phone)}"><svg class="btn__icon btn__icon--lead" aria-hidden="true"><use href="#i-phone"/></svg><span>Call</span></a>`,
        site.whatsapp && `<a class="btn btn--ghost" href="https://wa.me/${digits(site.whatsapp)}" ${out}><svg class="btn__icon btn__icon--lead" aria-hidden="true"><use href="#i-whatsapp"/></svg><span>WhatsApp</span></a>`,
        site.map.link && `<a class="btn btn--ghost" href="${esc(site.map.link)}" ${out}><svg class="btn__icon btn__icon--lead" aria-hidden="true"><use href="#i-pin"/></svg><span>Directions</span></a>`,
      ].filter(Boolean);
      return actions.length ? `<div class="contact__actions" data-reveal>${actions.join('')}</div>` : '';
    },
    'footer-facebook': () =>
      site.facebook && `<a class="link" href="${esc(site.facebook)}" ${out}><svg aria-hidden="true"><use href="#i-facebook"/></svg>Facebook</a>`,
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
      description: "Men's hair salon and barbershop offering haircuts, beard styling, hair styling, hair wash and hair colour.",
      url: `${siteUrl}/`,
      image: 'https://images.unsplash.com/photo-1593702295094-aea22597af65?auto=format&fit=crop&w=1200&h=630&q=75',
      slogan: 'Sharp Cuts. Clean Style. Confidence.',
    };
    data.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: "Men's grooming services",
      itemListElement: SERVICES.map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
    };
    if (site.address) data.address = { '@type': 'PostalAddress', streetAddress: site.address };
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
        .replaceAll('%SITE_CALL_HREF%', site.phone ? tel(site.phone) : '#contact')
        .replace('%SITE_JSONLD%', jsonLd),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.SITE_URL || 'https://www.example.com').replace(/\/$/, '');
  return {
    plugins: [responsiveImages(), siteDetails(site, siteUrl), seoFiles(siteUrl)],
    build: {
      target: 'es2019',
      cssMinify: true,
    },
  };
});
