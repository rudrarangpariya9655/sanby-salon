import site from '../../site.config.js';

/*
 * Appointment request form: validation, then delivery depending on what site.config.js provides —
 *   1. "Book through WhatsApp" pressed (shown only when `whatsapp` is set) → WhatsApp, pre-filled;
 *   2. booking.endpoint → POST the request (e.g. Formspree), with loading, success and error states;
 *   3. whatsapp        → open WhatsApp with the request pre-filled;
 *   4. neither         → explain that online booking isn't connected yet (nothing is sent anywhere).
 * Every outcome says plainly that the appointment still has to be confirmed by the salon.
 *
 * Other parts of the page can pre-fill it: dispatch `booking:prefill` with { service, notes }.
 */
const rules = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your name.'),
  // Digits with optional +, spaces, dashes, dots or brackets; 7–15 digits (the international maximum).
  phone: (v) => {
    const value = v.trim();
    if (!value) return 'Please enter your phone number.';
    const count = value.replace(/\D/g, '').length;
    return /^\+?[\d\s().-]+$/.test(value) && count >= 7 && count <= 15
      ? ''
      : 'Please enter a valid phone number, including the area code.';
  },
  service: (v) => (v ? '' : 'Please choose a service.'),
  date: (v, input) => {
    if (!v) return 'Please choose a preferred date.';
    return input.min && v < input.min ? 'Please choose a date from today onwards.' : '';
  },
};

const ICONS = { success: 'i-check', info: 'i-info', error: 'i-info' };

const formatDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

// "Fri, 3 October 2026, morning"
const when = (data) => [formatDate(data.date), data.time && data.time.toLowerCase()].filter(Boolean).join(', ');

function whatsappLink(data) {
  const lines = [
    `Hello ${site.name}, I'd like to request an appointment.`,
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `Service: ${data.service}`,
    `Preferred date: ${formatDate(data.date)}`,
    data.time && `Preferred time: ${data.time}`,
    data.notes && `Message: ${data.notes}`,
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

  const field = (name) => form.querySelector(`[data-field="${name}"]`);
  // The focusable control for a field: the input itself, or the first option of a choice group.
  const control = (name) => field(name).querySelector('input, textarea, select');

  const showStatus = (type, message) => {
    status.className = `form__status form__status--${type}`;
    status.innerHTML = `<svg aria-hidden="true"><use href="#${ICONS[type]}"/></svg><p></p>`;
    status.querySelector('p').textContent = message;
  };
  const clearStatus = () => { status.className = 'form__status'; status.replaceChildren(); };

  const setBusy = (busy) => {
    form.classList.toggle('is-sending', busy);
    form.querySelectorAll('button[type="submit"]').forEach((b) => { b.disabled = busy; });
    submit.setAttribute('aria-busy', String(busy));
    submitLabel.textContent = busy ? 'Sending…' : idleLabel;
  };

  // No past dates. Local date, not UTC, so late-evening visitors aren't offered yesterday.
  const date = form.elements.date;
  const t = new Date();
  t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
  date.min = t.toISOString().slice(0, 10);

  const check = (name) => {
    const box = field(name);
    const input = form.elements[name]; // an input, or a RadioNodeList for choice groups
    const single = control(name);
    const message = rules[name](input.value, single);
    const error = box.querySelector('.field__error');
    box.classList.toggle('is-invalid', !!message);
    box.classList.toggle('is-valid', !message && !!input.value);
    if (!box.matches('fieldset')) {
      single.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (message) single.setAttribute('aria-describedby', error.id);
      else single.removeAttribute('aria-describedby');
    }
    error.textContent = message;
    return !message;
  };

  Object.keys(rules).forEach((name) => {
    const box = field(name);
    const choice = box.matches('fieldset');
    // Text fields validate once the visitor leaves a field they've filled in, then live while they fix it.
    box.addEventListener('focusout', (e) => { if (!choice && e.target.value) check(name); });
    box.addEventListener(choice || name === 'date' ? 'change' : 'input', () => {
      if (choice || name === 'date' || box.classList.contains('is-invalid')) check(name);
    });
  });

  // Pre-fill from elsewhere on the page (a service row, "Book this look" in the style viewer…).
  window.addEventListener('booking:prefill', (e) => {
    const { service, notes } = e.detail ?? {};
    const option = service && [...form.elements.service].find((r) => r.value === service);
    if (option) {
      option.checked = true;
      check('service');
    }
    if (notes && !form.elements.notes.value.trim()) form.elements.notes.value = notes;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.classList.contains('is-sending')) return;
    const results = Object.keys(rules).map(check);
    if (results.includes(false)) {
      clearStatus();
      const firstInvalid = Object.keys(rules).find((name, i) => !results[i]);
      control(firstInvalid).focus();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const first = data.name.trim().split(/\s+/)[0];
    const viaWhatsApp = e.submitter?.value === 'whatsapp' || (!site.booking.endpoint && site.whatsapp);

    if (viaWhatsApp && site.whatsapp) {
      window.open(whatsappLink(data), '_blank', 'noopener');
      showStatus('success', `WhatsApp should now be open with your request, ${first}. Press send there — the salon will reply to confirm your appointment. It isn't booked until they do.`);
      return;
    }

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
        showStatus('success', `Thanks, ${first} — your request for ${data.service} on ${when(data)} has been sent. It isn't confirmed yet: the salon will contact you on ${data.phone} to confirm your appointment.`);
      } catch {
        showStatus('error', "Sorry, your request couldn't be sent. Please check your connection and try again, or contact the salon directly.");
      } finally {
        setBusy(false);
      }
      return;
    }

    showStatus('info', `Thanks, ${first}. Online booking isn't connected yet, so this request hasn't been sent anywhere — please contact the salon directly to book your appointment.`);
  });
}
