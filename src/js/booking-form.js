import site from '../../site.config.js';

/*
 * Booking request form: validation, then delivery depending on what site.config.js provides —
 *   1. booking.endpoint → POST the request (e.g. Formspree), with loading, success and error states;
 *   2. whatsapp         → open WhatsApp with the request pre-filled;
 *   3. neither          → explain that online booking isn't connected yet (nothing is sent anywhere).
 */
const rules = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your name.'),
  phone: (v) => (/^[+\d][\d\s()-]{6,}$/.test(v.trim()) ? '' : 'Please enter a valid phone number.'),
  service: (v) => (v ? '' : 'Please choose a service.'),
  date: (v, input) => {
    if (!v) return 'Please choose a preferred date.';
    return input.min && v < input.min ? 'Please choose a date from today onwards.' : '';
  },
};

const ICONS = { success: 'i-check', info: 'i-info', error: 'i-info' };

const formatDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

function whatsappLink(data) {
  const lines = [
    `Hello ${site.name}, I'd like to request an appointment.`,
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `Service: ${data.service}`,
    `Preferred date: ${formatDate(data.date)}`,
    data.notes && `Notes: ${data.notes}`,
  ].filter(Boolean);
  return `https://wa.me/${site.whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function initBookingForm() {
  const form = document.querySelector('[data-booking-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');
  const submit = form.querySelector('[data-form-submit]');
  const submitLabel = form.querySelector('[data-form-submit-label]');
  const idleLabel = submitLabel.textContent;

  const showStatus = (type, message) => {
    status.className = `form__status form__status--${type}`;
    status.innerHTML = `<svg aria-hidden="true"><use href="#${ICONS[type]}"/></svg><p></p>`;
    status.querySelector('p').textContent = message;
  };
  const clearStatus = () => { status.className = 'form__status'; status.replaceChildren(); };

  const setBusy = (busy) => {
    form.classList.toggle('is-sending', busy);
    submit.disabled = busy;
    submit.setAttribute('aria-busy', String(busy));
    submitLabel.textContent = busy ? 'Sending…' : idleLabel;
  };

  const service = form.elements.service;
  const syncService = () => service.closest('.field').classList.toggle('has-value', !!service.value);
  service.addEventListener('change', syncService);
  syncService();

  // No past dates. Local date, not UTC, so late-evening visitors aren't offered yesterday.
  const date = form.elements.date;
  const t = new Date();
  t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
  date.min = t.toISOString().slice(0, 10);

  const check = (name) => {
    const input = form.elements[name];
    const message = rules[name](input.value, input);
    const field = input.closest('.field');
    const error = field.querySelector('.field__error');
    field.classList.toggle('is-invalid', !!message);
    field.classList.toggle('is-valid', !message && !!input.value);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) input.setAttribute('aria-describedby', error.id);
    else input.removeAttribute('aria-describedby');
    error.textContent = message;
    return !message;
  };

  Object.keys(rules).forEach((name) => {
    const input = form.elements[name];
    // Validate once the visitor leaves a field they've filled in, then live while they fix it.
    input.addEventListener('blur', () => { if (input.value) check(name); });
    input.addEventListener(input.tagName === 'SELECT' || input.type === 'date' ? 'change' : 'input', () => {
      if (input.closest('.field').classList.contains('is-invalid') || input.tagName === 'SELECT') check(name);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.classList.contains('is-sending')) return;
    const results = Object.keys(rules).map(check);
    if (results.includes(false)) {
      clearStatus();
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const first = data.name.trim().split(/\s+/)[0];

    if (site.booking.endpoint) {
      setBusy(true);
      clearStatus();
      try {
        const res = await fetch(site.booking.endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        form.reset();
        form.querySelectorAll('.field').forEach((f) => f.classList.remove('is-valid'));
        syncService();
        showStatus('success', `Thanks, ${first} — your request for ${data.service} on ${formatDate(data.date)} has been sent. We'll be in touch to confirm your slot.`);
      } catch {
        showStatus('error', "Sorry, your request couldn't be sent. Please check your connection and try again, or contact the salon directly.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (site.whatsapp) {
      window.open(whatsappLink(data), '_blank', 'noopener');
      showStatus('success', `WhatsApp should now be open with your request, ${first}. Press send there and we'll confirm your slot.`);
      return;
    }

    showStatus('info', `Thanks, ${first}. Online booking isn't connected yet, so this request hasn't been sent — please contact the salon directly to confirm your appointment.`);
  });
}
