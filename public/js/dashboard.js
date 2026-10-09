// dashboard.js — user dashboard

async function api(method, url, body) {
  const opts = { method, headers: {'Content-Type':'application/json'}, credentials:'include' };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  if (r.status === 401) { location.href = '/login'; return {}; }
  return r.json();
}

function showToast(msg, ok=true) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderLeftColor = ok ? 'var(--honey)' : '#dc2626';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

function statusBadge(s) {
  return `<span class="status-badge status-${s}">${s}</span>`;
}

// ── INIT ──────────────────────────────────────────────────────
async function init() {
  const me = await api('GET', '/api/auth/me');
  if (!me.loggedIn) { location.href = '/login'; return; }
  if (me.role === 'admin') { location.href = '/admin'; return; }
  document.getElementById('dash-welcome').textContent = 'Hi, ' + me.name + ' 👋';

  // Pre-fill booking form with user info
  const nameF = document.querySelector('[name="guest_name"]');
  const emailF = document.querySelector('[name="guest_email"]');
  if (nameF) nameF.value = me.name || '';

  loadPackagesSelect();
  loadMyBookings();
  window.refreshAnimations && window.refreshAnimations();
}

async function loadPackagesSelect() {
  const pkgs = await api('GET', '/api/packages');
  const sel = document.getElementById('dash-pkg-select');
  if (sel) sel.innerHTML = pkgs.map(p => `<option value="${p.id}">${p.name} — ${fmt(p.price)}</option>`).join('');
}

async function loadMyBookings() {
  const list = document.getElementById('bookings-list');
  list.innerHTML = '<div class="loading">Loading…</div>';
  const rows = await api('GET', '/api/bookings/my');
  if (!rows || !rows.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">✈️</div><p>No bookings yet. <a href="#" onclick="switchTab('newbooking')">Book your first trip!</a></p></div>`;
    return;
  }
  list.innerHTML = `<div class="reveal-stagger">${rows.map(b => `
    <div class="booking-card tilt-lift" data-tilt data-tilt-strength="3">
      <div>
        <div class="bk-ref">${b.ref}</div>
        <div class="bk-title">${b.destination} — ${b.package_name}</div>
        <div class="bk-meta">📅 ${b.travel_date} &nbsp;|&nbsp; 👤 ${b.travellers}</div>
        ${statusBadge(b.status)}
      </div>
      <div>
        <div class="bk-price">${b.total_price ? fmt(b.total_price) : '—'}</div>
        <div style="font-size:.72rem;color:var(--muted);text-align:right;margin-top:4px">Booked ${b.created_at.slice(0,10)}</div>
      </div>
    </div>`).join('')}</div>`;
  window.refreshAnimations && window.refreshAnimations();
}

// ── TABS ──────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.snav').forEach(a => a.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  document.querySelector(`.snav[data-tab="${name}"]`)?.classList.add('active');
}

document.querySelectorAll('.snav[data-tab]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); switchTab(a.dataset.tab); });
});

// ── BOOKING FORM ──────────────────────────────────────────────
document.getElementById('dash-booking-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Submitting…';
  const data = Object.fromEntries(new FormData(e.target).entries());
  const r = await api('POST', '/api/bookings', data);
  if (r.success) {
    showToast('🐝 ' + r.message + ' Ref: ' + r.ref);
    e.target.reset();
    switchTab('bookings');
    loadMyBookings();
  } else {
    showToast(r.error || 'Something went wrong', false);
  }
  btn.disabled = false; btn.textContent = 'Submit Booking Request';
});

// ── PROFILE ───────────────────────────────────────────────────
async function loadProfile() {
  const me = await api('GET', '/api/auth/me');
  const card = document.getElementById('profile-card');
  if (!card) return;
  card.innerHTML = `
    <div class="profile-row"><span class="profile-label">Name</span><span class="profile-val">${me.name}</span></div>
    <div class="profile-row"><span class="profile-label">Role</span><span class="profile-val">${me.role}</span></div>
    <div style="margin-top:20px"><a href="/" style="color:var(--teal);text-decoration:none;font-weight:600">← Back to homepage</a></div>`;
}

document.querySelector('.snav[data-tab="profile"]')?.addEventListener('click', loadProfile);

async function logout() {
  await api('POST', '/api/auth/logout');
  location.href = '/';
}

init();
