(function () {
  document.getElementById('year').textContent = new Date().getFullYear();

  var form = document.getElementById('waitlist-form');
  var success = document.getElementById('waitlist-success');
  var email = document.getElementById('email');
  var consent = document.getElementById('consent');
  var emailError = document.getElementById('email-error');
  var consentError = document.getElementById('consent-error');

  function setError(input, el, message) {
    el.textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function validate() {
    var ok = true;
    if (!email.value.trim() || !email.checkValidity()) {
      setError(email, emailError, 'Please enter a valid email address.');
      ok = false;
    } else {
      setError(email, emailError, '');
    }
    if (!consent.checked) {
      setError(consent, consentError, 'Please tick the box so we can contact you.');
      ok = false;
    } else {
      setError(consent, consentError, '');
    }
    return ok;
  }

  function showSuccess() {
    form.hidden = true;
    success.hidden = false;
    success.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    var data = new FormData(form);
    var payload = {
      name: data.get('name') || '',
      email: data.get('email'),
      region: data.get('region') || '',
      interests: data.getAll('interests'),
      consent: true,
      submittedAt: new Date().toISOString()
    };

    // Set data-endpoint on the form to a waitlist backend (e.g. Formspree,
    // a serverless function or a CRM webhook) that accepts JSON via POST.
    var endpoint = form.getAttribute('data-endpoint');
    if (!endpoint) {
      console.info('[waitlist] No endpoint configured, signup not sent:', payload);
      showSuccess();
      return;
    }

    var button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Sending…';

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      showSuccess();
    }).catch(function () {
      button.disabled = false;
      button.textContent = 'Join the waitlist';
      setError(email, emailError, 'Something went wrong. Please try again in a moment.');
    });
  });
})();
