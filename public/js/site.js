// site.js — shared by every public page: header/footer, API helper, toast, images, booking card

// ── helpers ───────────────────────────────────────────────────
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const CHILD_RATE = 0.75; // keep in sync with routes/bookings.js
const TIER = { starter: 'Value', premium: 'Luxury', adventure: 'Adventure' };

async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  let data = {};
  try { data = await r.json(); } catch (e) { /* non-JSON */ }
  if (!r.ok && !data.error) data.error = 'Something went wrong. Please try again.';
  data._status = r.status;
  return data;
}

let _toastT;
function toast(msg, ok = true) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.toggle('bad', !ok);
  t.classList.add('show');
  clearTimeout(_toastT);
  _toastT = setTimeout(() => t.classList.remove('show'), 4200);
}

// Photos: local uploads start with "/", otherwise a Wikimedia Commons file title.
function photo(file, w = 800) {
  if (!file) return '';
  if (file.startsWith('/')) return file;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${w}`;
}
// <img> that fades in when loaded and silently stays hidden (gradient shows) if it fails.
const img = (file, w, alt = '', cls = '') => file
  ? `<img ${cls ? `class="${cls}"` : ''} src="${esc(photo(file, w))}" alt="${esc(alt)}" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="this.remove()">`
  : '';

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  plane: '<path d="M10.5 13.5 3 11l1.5-1.5 9-1L17 4.5a1.8 1.8 0 0 1 2.5 2.5l-4 3.5-1 9L13 21l-2.5-7.5Z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 8 7.5 9 4.3-1 7.5-4.5 7.5-9V6L12 3Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  map: '<path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  out: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M16 8l4 4-4 4M20 12H9"/>',
  bag: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>',
};
const icon = (n, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><g class="wing"><ellipse cx="25" cy="15" rx="9" ry="13" transform="rotate(-22 25 15)" fill="#e9f7ff" stroke="#1c1405" stroke-width="2" opacity=".95"/></g><g class="wing"><ellipse cx="40" cy="14" rx="8" ry="12" transform="rotate(18 40 14)" fill="#e9f7ff" stroke="#1c1405" stroke-width="2" opacity=".95"/></g><ellipse cx="34" cy="38" rx="20" ry="14" fill="#ffb703" stroke="#1c1405" stroke-width="2.5"/><path d="M27 26.5v22M35 24.5v26M43 27v21" stroke="#1c1405" stroke-width="4.5" stroke-linecap="round"/><path d="M53 38l8 2-8 3Z" fill="#1c1405"/><circle cx="13" cy="37" r="8.5" fill="#1c1405"/><circle cx="10.5" cy="35" r="2.2" fill="#fff"/><path d="M9 29c-2-5-5-7-8-7M14 29c1-5 3-8 6-9" stroke="#1c1405" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

// ── header / footer ───────────────────────────────────────────
function renderHeader(active) {
  const host = $('#site-header'); if (!host) return;
  const links = [['/#packages', 'Holiday Packages', 'packages'], ['/#destinations', 'Destinations', 'destinations'], ['/track', 'Track Booking', 'track'], ['/contact', 'Contact', 'contact']];
  host.innerHTML = `
  <header class="hdr" id="hdr"><div class="wrap hdr-in">
    <a class="logo" href="/" aria-label="TravelBeey home">${LOGO}<span>Travel<em>Beey</em></span></a>
    <nav class="nav" aria-label="Main">${links.map(l => `<a href="${l[0]}" class="${active === l[2] ? 'on' : ''}">${l[1]}</a>`).join('')}</nav>
    <div class="hdr-act" id="hdr-act"><a class="btn btn-outline" href="/login">Log in</a><a class="btn btn-primary" href="/register">Sign up</a></div>
    <button class="burger" id="burger" aria-label="Menu" aria-expanded="false">${icon('menu')}</button>
  </div></header>`;
  $('#burger').addEventListener('click', () => { const o = $('#hdr').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o); });
  api('GET', '/api/auth/me').then(me => {
    window.__me = me;
    if (!me.loggedIn) return;
    $('#hdr-act').innerHTML = `<a class="btn btn-outline" href="${me.role === 'admin' ? '/admin' : '/dashboard'}">${me.role === 'admin' ? 'Admin panel' : 'My trips'}</a><button class="btn btn-dark" id="lo">Log out</button>`;
    $('#lo').addEventListener('click', async () => { await api('POST', '/api/auth/logout'); location.href = '/'; });
    document.dispatchEvent(new CustomEvent('me', { detail: me }));
  });
}

function renderFooter() {
  const host = $('#site-footer'); if (!host) return;
  host.innerHTML = `
  <footer class="ftr"><div class="wrap">
    <div class="ftr-grid">
      <div><a class="logo" href="/">${LOGO}<span>Travel<em>Beey</em></span></a><p>Curated holiday packages across India, planned by people who have been there. Pick a trip, tell us your dates, and we handle the rest.</p></div>
      <div><h4>Explore</h4><ul><li><a href="/#packages">Holiday packages</a></li><li><a href="/#destinations">Destinations</a></li><li><a href="/track">Track a booking</a></li></ul></div>
      <div><h4>Account</h4><ul><li><a href="/login">Log in</a></li><li><a href="/register">Create account</a></li><li><a href="/dashboard">My trips</a></li></ul></div>
      <div><h4>Support</h4><ul><li><a href="/contact">Contact us</a></li><li><a href="mailto:hello@travelbeey.com">hello@travelbeey.com</a></li></ul></div>
    </div>
    <div class="ftr-b">© ${new Date().getFullYear()} TravelBeey. All rights reserved.</div>
  </div></footer>`;
}

// ── newsletter (stores to DB) ─────────────────────────────────
async function subscribe(form) {
  const input = form.querySelector('input'); const btn = form.querySelector('button');
  btn.disabled = true;
  const r = await api('POST', '/api/newsletter', { email: input.value });
  btn.disabled = false;
  if (r.success) { toast(r.message); input.value = ''; } else toast(r.error, false);
}

// ── autocomplete for text inputs ──────────────────────────────
function autocomplete(input, getItems, onPick) {
  const list = document.createElement('div'); list.className = 'ac'; list.setAttribute('role', 'listbox');
  input.parentElement.appendChild(list);
  let items = [], idx = -1;
  const close = () => { list.classList.remove('open'); idx = -1; };
  const paint = () => $$('.ac-i', list).forEach((e, i) => e.classList.toggle('on', i === idx));
  const render = () => {
    const q = input.value.trim().toLowerCase();
    items = (getItems() || []).filter(i => !q || i.label.toLowerCase().includes(q)).slice(0, 8);
    list.innerHTML = items.length ? items.map((i, n) => `<div class="ac-i" role="option" data-n="${n}"><span>${esc(i.label)}</span>${i.sub ? `<small>${esc(i.sub)}</small>` : ''}</div>`).join('') : (q ? `<div class="ac-e">No match — we'll still search for “${esc(input.value)}”</div>` : '');
    list.classList.toggle('open', !!list.innerHTML); idx = -1;
  };
  const pick = (it) => { input.value = it.label; close(); onPick && onPick(it); };
  input.addEventListener('input', render); input.addEventListener('focus', render);
  input.addEventListener('keydown', e => {
    if (!list.classList.contains('open') || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(idx + 1, items.length - 1); paint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(idx - 1, 0); paint(); }
    else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); pick(items[idx]); }
    else if (e.key === 'Escape') close();
  });
  list.addEventListener('mousedown', e => { const el = e.target.closest('.ac-i'); if (el) { e.preventDefault(); pick(items[+el.dataset.n]); } });
  document.addEventListener('click', e => { if (!input.parentElement.contains(e.target)) close(); });
}

const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const tierLabel = (t) => TIER[t] || 'Package';
const days = (s) => String(s || '').split('||').filter(Boolean).map(d => { const [t, ...r] = d.split('::'); return { title: (t || '').trim(), body: r.join('::').trim() }; });

// ── booking card (used on explore + package pages) ────────────
// opts: { packages, packageId, lockPackage, destination, fromCity, date, adults, children }
function mountBooking(host, opts) {
  const pk = opts.packages || [];
  const st = { adults: Math.max(1, +opts.adults || 2), children: +opts.children || 0 };
  const cur = () => pk.find(p => p.id == $('#bk-pkg').value) || pk[0];
  host.innerHTML = `
  <div class="bk" id="bk">
    <div class="bk-top"><small>Starting price</small><div class="price" id="bk-price"></div></div>
    <form class="bk-body" id="bk-form" novalidate>
      ${opts.lockPackage ? `<input type="hidden" id="bk-pkg" value="${pk[0].id}">` :
        `<div class="fld"><label for="bk-pkg">Package</label><select id="bk-pkg">${pk.map(p => `<option value="${p.id}" ${p.id == opts.packageId ? 'selected' : ''}>${esc(p.name)} · ${esc(p.duration || '')}</option>`).join('')}</select></div>`}
      <div class="row2">
        <div class="fld"><label for="bk-from-city">Departing from</label><input id="bk-from-city" placeholder="Chennai" value="${esc(opts.fromCity || '')}" autocomplete="off"></div>
        <div class="fld"><label for="bk-date">Travel date</label><input id="bk-date" type="date" min="${todayISO()}" value="${esc(opts.date || '')}" required></div>
      </div>
      <div class="row2">
        <div class="fld"><label>Adults</label><div class="stepper"><button type="button" data-k="adults" data-d="-1" aria-label="Fewer adults">−</button><b id="n-adults">${st.adults}</b><button type="button" data-k="adults" data-d="1" aria-label="More adults">+</button></div></div>
        <div class="fld"><label>Children (2–11)</label><div class="stepper"><button type="button" data-k="children" data-d="-1" aria-label="Fewer children">−</button><b id="n-children">${st.children}</b><button type="button" data-k="children" data-d="1" aria-label="More children">+</button></div></div>
      </div>
      <div class="fld"><label for="bk-name">Full name</label><input id="bk-name" autocomplete="name" required></div>
      <div class="row2">
        <div class="fld"><label for="bk-email">Email</label><input id="bk-email" type="email" autocomplete="email" required></div>
        <div class="fld"><label for="bk-phone">Phone</label><input id="bk-phone" type="tel" autocomplete="tel" placeholder="+91 98765 43210" required></div>
      </div>
      <div class="fld"><label for="bk-notes">Special requests <span style="font-weight:500;color:var(--muted)">(optional)</span></label><textarea id="bk-notes" rows="2" placeholder="Hotel preference, dietary needs, celebrations…"></textarea></div>
      <div class="sum" id="bk-sum"></div>
      <div class="err" id="bk-err" hidden></div>
      <button class="btn btn-primary btn-lg btn-block" id="bk-go" type="submit">Request booking</button>
      <p class="fine">No payment now. Our team calls you within 2 hours to confirm availability and finalise the itinerary.</p>
    </form>
  </div>`;

  const dest = () => opts.destination || '';
  function recalc() {
    const p = cur(); if (!p) return;
    $('#n-adults').textContent = st.adults; $('#n-children').textContent = st.children;
    const base = p.price * st.adults, kids = p.price * CHILD_RATE * st.children;
    $('#bk-price').innerHTML = `${fmt(p.price)} <small style="font-size:.8rem;color:var(--muted);font-weight:600">/ adult</small>`;
    $('#bk-sum').innerHTML = `<div><span>${st.adults} adult${st.adults > 1 ? 's' : ''} × ${fmt(p.price)}</span><span>${fmt(base)}</span></div>` +
      (st.children ? `<div><span>${st.children} child${st.children > 1 ? 'ren' : ''} × ${fmt(p.price * CHILD_RATE)}</span><span>${fmt(kids)}</span></div>` : '') +
      `<div class="tot"><span>Total</span><span>${fmt(Math.round(base + kids))}</span></div>`;
  }
  $$('.stepper button', host).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.k, d = +b.dataset.d, min = k === 'adults' ? 1 : 0, max = k === 'adults' ? 20 : 10;
    st[k] = Math.min(max, Math.max(min, st[k] + d)); recalc();
  }));
  const sel = $('#bk-pkg', host); if (sel && sel.tagName === 'SELECT') sel.addEventListener('change', () => { recalc(); opts.onPackage && opts.onPackage(cur()); });
  recalc();

  // prefill from the logged-in account
  const fill = (me) => { if (!me || !me.loggedIn) return; if (!$('#bk-name').value) $('#bk-name').value = me.name || ''; if (!$('#bk-email').value) $('#bk-email').value = me.email || ''; if (!$('#bk-phone').value) $('#bk-phone').value = me.phone || ''; };
  fill(window.__me); document.addEventListener('me', e => fill(e.detail));

  $('#bk-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#bk-err'); err.hidden = true;
    const p = cur();
    const body = { guest_name: $('#bk-name').value, guest_email: $('#bk-email').value, guest_phone: $('#bk-phone').value,
      destination: dest() || p.name, package_id: p.id, travel_date: $('#bk-date').value, adults: st.adults, children: st.children,
      from_city: $('#bk-from-city').value, notes: $('#bk-notes').value };
    const btn = $('#bk-go'); btn.disabled = true; btn.textContent = 'Sending…';
    const r = await api('POST', '/api/bookings', body);
    btn.disabled = false; btn.textContent = 'Request booking';
    if (!r.success) { err.textContent = r.error; err.hidden = false; return; }
    $('#bk').innerHTML = `<div class="ok-box"><div class="tick">${icon('check')}</div><h3>Booking request sent</h3>
      <p>We'll call you within 2 hours to confirm.</p><div class="ref">${esc(r.ref)}</div>
      <p style="font-size:.9rem">Total: <strong>${fmt(r.total_price)}</strong></p>
      <p class="fine" style="margin:10px 0 16px">Save this reference — you can check its status any time.</p>
      <a class="btn btn-dark btn-block" href="${window.__me && window.__me.loggedIn ? '/dashboard' : '/track?ref=' + encodeURIComponent(r.ref) + '&email=' + encodeURIComponent(body.guest_email)}">${window.__me && window.__me.loggedIn ? 'View my trips' : 'Track this booking'}</a></div>`;
    toast('Booking request received');
  });
  return { setDestination: (d) => { opts.destination = d; } };
}

document.addEventListener('DOMContentLoaded', () => {
  if (!$('link[rel=icon]')) { const l = document.createElement('link'); l.rel = 'icon'; l.href = 'data:image/svg+xml,' + encodeURIComponent(LOGO.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); document.head.appendChild(l); }
  window.BEE = LOGO;
  const active = document.body.dataset.nav || '';
  renderHeader(active); renderFooter();
});
