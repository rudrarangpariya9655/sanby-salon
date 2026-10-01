/*
 * Sanby Salon — business details.
 *
 * The single place to enter the salon's real information. It is used at build time to fill in
 * index.html (contact section, mobile menu, footer, call / WhatsApp buttons, map, reviews,
 * structured data) and at runtime by the booking form.
 *
 * Leave a value empty ('') until the salon confirms it. The site then shows a clearly marked
 * "… to be added" placeholder instead of inventing anything.
 *
 * Restart `npm run dev` after editing this file.
 */
export default {
  name: 'Sanby Salon',

  // Full street address on one line.
  address: '',

  // Optional: the same address split up, used only for search engines (structured data).
  // Fill in what applies, e.g. { locality: 'City', region: 'State', postalCode: '000000', country: 'IN' }.
  addressDetails: { locality: '', region: '', postalCode: '', country: '' },

  // International format, e.g. '+<country code> <number>'. Used for tel: links and the "Call" buttons.
  phone: '',

  // International format. Enables the WhatsApp link and the "Book through WhatsApp" button.
  whatsapp: '',

  // Instagram handle without the @.
  instagram: '',

  // Full Facebook page URL.
  facebook: '',

  // Opening hours as shown on the site. Edit the day groups to match the salon's week.
  // Optional `schema`: the same hours for search engines, e.g. 'Mo-Sa 10:00-20:00' (leave empty if closed).
  hours: [
    { days: 'Mon – Sat', time: '', schema: '' },
    { days: 'Sunday', time: '', schema: '' },
  ],

  // "At a glance" figures in the About section. These came from the original site and have NOT yet
  // been confirmed by the salon. While `confirmed` is false they are shown with a "to be confirmed" note.
  // Once checked, correct any value and set `confirmed: true`. Remove an item to hide it.
  // value: the number the counter runs up to · suffix: '+' or '' · star: true adds a star after it.
  figures: {
    confirmed: false,
    items: [
      { value: '5', suffix: '+', label: 'Years experience' },
      { value: '1000', suffix: '+', label: 'Happy clients' },
      { value: '4.9', star: true, label: 'Customer rating' },
    ],
  },

  map: {
    // Link to the salon on Google Maps (opens in a new tab).
    link: '',
    // The src="…" URL from Google Maps → Share → Embed a map.
    embed: '',
  },

  // Optional details shown under each service (e.g. duration: '45 min', price: 'From 500'), written exactly as it should appear.
  // Leave empty to show nothing; fill in only what the salon has confirmed.
  services: {
    'haircut': { duration: '', price: '' },
    'beard-styling': { duration: '', price: '' },
    'hair-beard': { duration: '', price: '' },
    'hair-styling': { duration: '', price: '' },
    'hair-wash': { duration: '', price: '' },
    'hair-colour': { duration: '', price: '' },
  },

  reviews: {
    // Set to true ONLY when every review below is a real client review, shared with permission
    // (for example copied from the salon's Google reviews). While false, the section is clearly
    // labelled "Sample reviews" so nobody mistakes them for genuine ones.
    verified: false,
    // Optional link to all reviews, e.g. the salon's Google Maps listing. Shown as "Read all reviews".
    link: '',
    // The first review is shown large as the featured quote; the rest slide sideways.
    // rating: 1–5 (star ratings are only displayed once `verified` is true).
    // service: the service the client had, as shown under their name.
    items: [
      { quote: 'The best cut is the one that still looks good weeks later.', name: 'Client Name', service: 'Hair + Beard', rating: 5 },
      { quote: 'Great haircut and excellent service. The attention to detail was exactly what I wanted.', name: 'Client Name', service: 'Haircut', rating: 5 },
      { quote: 'They actually listened to what I wanted. The fade was clean and the beard shaping made a real difference.', name: 'Client Name', service: 'Hair + Beard', rating: 5 },
      { quote: 'Relaxed atmosphere, spotless station and a haircut that still looked sharp two weeks later.', name: 'Client Name', service: 'Haircut', rating: 5 },
      { quote: 'Came in for a quick trim before an event and left looking better than I expected. Will be back.', name: 'Client Name', service: 'Hair Styling', rating: 5 },
      { quote: 'The grey coverage looks completely natural. Nobody could tell — which is exactly the point.', name: 'Client Name', service: 'Hair Colour', rating: 5 },
    ],
  },

  booking: {
    // Optional form endpoint (e.g. Formspree) that accepts a POST of the booking request.
    // If empty but a WhatsApp number is set, requests open WhatsApp with the details pre-filled.
    // If both are empty, the form says up front that online requests aren't connected yet.
    endpoint: '',
  },
};
