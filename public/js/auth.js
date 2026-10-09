// auth.js — login & register pages

async function api(method, url, body) {
  const opts = { method, headers: {'Content-Type':'application/json'}, credentials:'include' };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  return r.json();
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError() {
  const el = document.getElementById('auth-error');
  if (el) el.style.display = 'none';
}

// LOGIN
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    hideError();
    const btn = document.getElementById('login-btn');
    btn.disabled = true; btn.textContent = 'Logging in…';
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      const r = await api('POST', '/api/auth/login', data);
      if (r.success) {
        location.href = r.redirect;
      } else {
        showError(r.error || 'Login failed.');
        btn.disabled = false; btn.textContent = 'Log In';
      }
    } catch(err) {
      showError('Network error. Please try again.');
      btn.disabled = false; btn.textContent = 'Log In';
    }
  });
}

// REGISTER
const regForm = document.getElementById('register-form');
if (regForm) {
  regForm.addEventListener('submit', async e => {
    e.preventDefault();
    hideError();
    const btn = document.getElementById('register-btn');
    btn.disabled = true; btn.textContent = 'Creating account…';
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      const r = await api('POST', '/api/auth/register', data);
      if (r.success) {
        location.href = r.redirect;
      } else {
        showError(r.error || 'Registration failed.');
        btn.disabled = false; btn.textContent = 'Create Account';
      }
    } catch(err) {
      showError('Network error. Please try again.');
      btn.disabled = false; btn.textContent = 'Create Account';
    }
  });
}
