// auth.js — login & register (keeps ?next= so users land back where they were)
const next = new URLSearchParams(location.search).get('next') || '';
const showErr = (m) => { const e = $('#auth-error'); e.textContent = m; e.hidden = false; };

function wire(formId, btnId, url, busy, idle) {
  const f = $(formId); if (!f) return;
  f.addEventListener('submit', async e => {
    e.preventDefault(); $('#auth-error').hidden = true;
    const btn = $(btnId); btn.disabled = true; btn.textContent = busy;
    const data = Object.fromEntries(new FormData(f).entries()); data.next = next;
    try {
      const r = await api('POST', url, data);
      if (r.success) location.href = r.redirect; else { showErr(r.error || 'Something went wrong.'); }
    } catch (err) { showErr('Network error. Please try again.'); }
    btn.disabled = false; btn.textContent = idle;
  });
}
wire('#login-form', '#login-btn', '/api/auth/login', 'Logging in…', 'Log in');
wire('#register-form', '#register-btn', '/api/auth/register', 'Creating account…', 'Create account');
const alt = $('.alt a'); if (alt && next) alt.href += '?next=' + encodeURIComponent(next);
