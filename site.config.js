/*
 * Sanby Salon — business details.
 *
 * The single place to enter the salon's real information. It is used at build time to fill in
 * index.html (contact section, footer, "Call Salon" button, map, structured data) and at runtime
 * by the booking form.
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

  // International format, e.g. '+<country code> <number>'. Used for the tel: link and "Call Salon".
  phone: '',

  // International format. Enables the WhatsApp link and sending booking requests via WhatsApp.
  whatsapp: '',

  // Instagram handle without the @.
  instagram: '',

  // Full Facebook page URL.
  facebook: '',

  // Opening hours as shown on the site. Edit the day groups to match the salon's week.
  hours: [
    { days: 'Mon – Sat', time: '' },
    { days: 'Sunday', time: '' },
  ],

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

  booking: {
    // Optional form endpoint (e.g. Formspree) that accepts a POST of the booking request.
    // If empty but a WhatsApp number is set, requests open WhatsApp with the details pre-filled.
    endpoint: '',
  },
};
