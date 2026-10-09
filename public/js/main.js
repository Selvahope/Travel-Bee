// main.js — homepage logic

const COLORS = ['dc-0','dc-1','dc-2','dc-3','dc-4','dc-5'];

// ── DESTINATION IMAGE HELPER ─────────────────────────────────
// Destination photos come from two sources: legacy seed data using real
// Wikimedia Commons file titles (e.g. "Oia Santorini.jpg"), and photos
// uploaded through the admin dropzone, which are stored locally and saved
// as a "/uploads/..." web path. We tell them apart by the leading slash —
// a Wikimedia title never starts with one — and render each accordingly.
// Wikimedia is requested at a specific width (small blurred thumb, then
// full-res); an uploaded file is already one fixed size, so both the thumb
// and full <img> just point at the same local file (the browser fetches it
// once and reuses it from cache for both).
function wikiImg(file, width) {
  if (!file) return '';
  if (file.startsWith('/')) return file;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}

// ── SITE PRELOADER ────────────────────────────────────────────
// A brief branded loading screen that irises away once the page (and the
// hero's first image) is ready — the "load, then enter" effect.
(function initPreloader() {
  const pre = document.getElementById('site-preloader');
  if (!pre) return;
  document.body.classList.add('preload-lock');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    pre.classList.add('pl-done');
    document.body.classList.remove('preload-lock');
    setTimeout(() => pre.remove(), 950);
  };
  const heroImg = document.querySelector('[data-hero-preload]');
  const ready = new Promise(resolve => {
    if (!heroImg || heroImg.complete) return resolve();
    heroImg.addEventListener('load', resolve, { once: true });
    heroImg.addEventListener('error', resolve, { once: true });
  });
  Promise.all([
    ready,
    new Promise(r => window.addEventListener('load', r, { once: true })),
    new Promise(r => setTimeout(r, 500)), // minimum dwell so it never just flashes
  ]).then(finish);
  setTimeout(finish, 3500); // hard safety cap
})();

async function api(method, url, body) {
  const opts = { method, headers: {'Content-Type':'application/json'}, credentials:'include' };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
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

// ── NAV: update if logged in ──────────────────────────────────
async function initNav() {
  const me = await api('GET', '/api/auth/me');
  if (me.loggedIn) {
    const acts = document.getElementById('nav-actions');
    if (acts) {
      const link = me.role === 'admin' ? '/admin' : '/dashboard';
      acts.innerHTML = `<a href="${link}" class="btn-ghost">${me.role==='admin'?'Admin Panel':'My Trips'}</a><button onclick="logout()" class="btn-ghost">Logout</button>`;
    }
  }
}

async function logout() {
  await api('POST', '/api/auth/logout');
  location.href = '/';
}

// ── LOAD PACKAGES ─────────────────────────────────────────────
// The Packages section itself was removed from the homepage, but package
// data still powers the hero "quick search" dropdown and the booking modal
// (a booking always needs a package_id), so we keep loading it — just no
// longer render a card grid for it.
async function loadPackages() {
  const pkgs = await api('GET', '/api/packages');
  const sel = document.getElementById('qs-pkg');
  if (sel) {
    sel.innerHTML = pkgs.map(p => `<option value="${p.id}">${p.name} — ${fmt(p.price)}</option>`).join('');
  }
  window.__pkgList = pkgs;
}

// ── SEARCHABLE DROPDOWN (used for "Flying From" & "Destination") ──
// Turns a plain text input into a type-to-filter dropdown: as the user
// types, matching items appear below the field; they pick one with the
// mouse or the keyboard (↑/↓/Enter/Esc) instead of typing free text.
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function attachAutocomplete(input, getItems, onSelect) {
  if (!input || input.dataset.acBound) return;
  input.dataset.acBound = '1';
  const wrap = document.createElement('div');
  wrap.className = 'ac-list';
  input.insertAdjacentElement('afterend', wrap);

  let items = [];
  let activeIdx = -1;

  function render() {
    const all = getItems() || [];
    const q = input.value.trim().toLowerCase();
    items = (q ? all.filter(it => it.label.toLowerCase().includes(q)) : all).slice(0, 8);
    activeIdx = -1;
    if (!items.length) {
      wrap.innerHTML = q ? `<div class="ac-empty">No matches for "${escapeHtml(input.value)}"</div>` : '';
      wrap.classList.toggle('open', !!q);
      return;
    }
    wrap.innerHTML = items.map((it, i) => `
      <div class="ac-item" data-i="${i}">
        <span class="ac-item-main">${escapeHtml(it.label)}</span>
        ${it.sub ? `<span class="ac-item-sub">${escapeHtml(it.sub)}</span>` : ''}
      </div>`).join('');
    wrap.classList.add('open');
  }

  function highlight() {
    [...wrap.children].forEach((el, i) => el.classList.toggle('active', i === activeIdx));
    const el = wrap.children[activeIdx];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  function choose(it) {
    input.value = it.label;
    close();
    onSelect && onSelect(it);
  }

  function close() {
    wrap.classList.remove('open');
    wrap.innerHTML = '';
    activeIdx = -1;
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('keydown', (e) => {
    if (!wrap.classList.contains('open') || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); highlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); highlight(); }
    else if (e.key === 'Enter') { if (activeIdx >= 0) { e.preventDefault(); choose(items[activeIdx]); } }
    else if (e.key === 'Escape') { close(); }
  });
  wrap.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.ac-item');
    if (!item) return;
    e.preventDefault();
    choose(items[Number(item.dataset.i)]);
  });
  document.addEventListener('click', (e) => {
    if (e.target !== input && !wrap.contains(e.target)) close();
  });
}

// Popular departure cities for "Flying From" — a fixed list since there's
// no airport/city API wired up yet.
const FROM_CITIES = [
  'Chennai, IN', 'Puducherry, IN', 'Bengaluru, IN', 'Mumbai, IN', 'Delhi, IN',
  'Hyderabad, IN', 'Kolkata, IN', 'Pune, IN', 'Kochi, IN', 'Coimbatore, IN',
  'Ahmedabad, IN', 'Goa, IN', 'Jaipur, IN', 'Lucknow, IN', 'Visakhapatnam, IN',
  'Trivandrum, IN', 'Nagpur, IN', 'Indore, IN',
].map(label => ({ label }));

function initSearchAutocomplete() {
  attachAutocomplete(document.getElementById('qs-from'), () => FROM_CITIES);
  attachAutocomplete(document.getElementById('qs-dest'), () => window.__destList || []);
}

// ── LOAD DESTINATIONS ─────────────────────────────────────────
// Region + map position are derived from each destination's STATE (the
// "country" field on the form holds an Indian state, e.g. "Kerala").
// Previously both were looked up by exact destination NAME in a 10-entry
// table, so destinations added later via the admin panel were silently
// dropped from the map and the region filter.
function normState(s) {
  return (s || '').toLowerCase().trim().replace(/\s*&\s*|\s+and\s+/g, ' and ').replace(/\s+/g, ' ');
}
const STATE_REGION = {
  'rajasthan':'north','uttar pradesh':'north','uttarakhand':'north','ladakh':'north',
  'jammu and kashmir':'north','himachal pradesh':'north','delhi':'north','punjab':'north','haryana':'north','chandigarh':'north',
  'kerala':'south','karnataka':'south','tamil nadu':'south','andhra pradesh':'south','telangana':'south','puducherry':'south',
  'west bengal':'east','odisha':'east','bihar':'east','jharkhand':'east','andaman and nicobar':'east','andaman and nicobar islands':'east',
  'goa':'west','maharashtra':'west','gujarat':'west','madhya pradesh':'west','chhattisgarh':'west',
  'assam':'northeast','meghalaya':'northeast','sikkim':'northeast','arunachal pradesh':'northeast',
  'nagaland':'northeast','manipur':'northeast','mizoram':'northeast','tripura':'northeast',
};
// x/y as % of the map box (400x500 viewBox), one centroid per state.
const STATE_COORDS = {
  'jammu and kashmir':{x:33,y:3},'ladakh':{x:39,y:4},'himachal pradesh':{x:37,y:10},'punjab':{x:30,y:12},
  'uttarakhand':{x:45,y:11},'delhi':{x:38,y:16},'haryana':{x:34,y:15},'chandigarh':{x:34,y:13},
  'uttar pradesh':{x:46,y:22},'rajasthan':{x:25,y:18},
  'kerala':{x:29,y:80},'karnataka':{x:32,y:68},'tamil nadu':{x:38,y:82},'andhra pradesh':{x:42,y:65},
  'telangana':{x:40,y:58},'puducherry':{x:40,y:78},
  'west bengal':{x:62,y:24},'odisha':{x:58,y:38},'bihar':{x:56,y:20},'jharkhand':{x:58,y:29},
  'andaman and nicobar':{x:87,y:66},'andaman and nicobar islands':{x:87,y:66},
  'goa':{x:24,y:53},'maharashtra':{x:30,y:48},'gujarat':{x:16,y:32},'madhya pradesh':{x:42,y:38},'chhattisgarh':{x:50,y:42},
  'assam':{x:73,y:20},'meghalaya':{x:70,y:23},'sikkim':{x:64,y:14},'arunachal pradesh':{x:80,y:12},
  'nagaland':{x:82,y:20},'manipur':{x:81,y:24},'mizoram':{x:78,y:28},'tripura':{x:73,y:27},
};
const MAP_FALLBACK_COORD = {x:50,y:45}; // unknown state still gets a visible pin
function regionForDest(d) { return STATE_REGION[normState(d.country)] || ''; }
function coordsForDest(d) { return STATE_COORDS[normState(d.country)] || MAP_FALLBACK_COORD; }
async function loadDestinations() {
  const dests = await api('GET', '/api/packages/destinations');
  window.__destList = dests.map(d => ({ label: `${d.name}, ${d.country}`, sub: fmt(d.price_from), id: d.id }));
  const grid = document.getElementById('dest-grid');
  if (!grid) return;
  grid.classList.remove('rv-bound');
  grid.innerHTML = dests.map((d, i) => {
    const hasPhoto = !!d.image_file;
    const bg = hasPhoto
      ? `<img class="dest-bg-thumb" src="${wikiImg(d.image_file, 40)}" alt="" aria-hidden="true" loading="lazy">
         <img class="dest-bg-full" src="${wikiImg(d.image_file, 1400)}" alt="${d.name}, ${d.country}" loading="lazy" decoding="async" onload="this.classList.add('loaded')">`
      : (d.emoji || '✈️');
    const safeName = (d.name || '').replace(/'/g, "\\'");
    const region = regionForDest(d);
    return `
    <a class="dest-card" href="/explore?id=${d.id}" data-region="${region}" onclick="return goExplore(event, ${d.id}, '${safeName}')">
      <div class="dest-bg ${hasPhoto ? '' : COLORS[i % COLORS.length]}" style="view-transition-name:dest-bg-${d.id}">${bg}</div>
      <div class="dest-overlay"></div>
      ${d.badge ? `<div class="dest-badge">${d.badge}</div>` : ''}
      <div class="dest-info">
        <div class="dest-country" style="view-transition-name:dest-country-${d.id}">${d.country}</div>
        <div class="dest-name" style="view-transition-name:dest-name-${d.id}">${d.name}</div>
        <div class="dest-price">${fmt(d.price_from)} <span>/ person</span></div>
      </div>
    </a>`;
  }).join('');
  initDestTilt();
  renderIndiaMap(dests);
  initDestAutoSlide();
  window.refreshAnimations && window.refreshAnimations();
}

// ── DESTINATIONS AUTO-SLIDE (mobile only) ────────────────────────
// On phones the grid becomes a horizontal scroll-snap strip (see the
// max-width:768px rule in main.css); this nudges it sideways every few
// seconds so the "swipe to see more" affordance is obvious, and stops
// permanently the moment a visitor touches it themselves.
function initDestAutoSlide() {
  const grid = document.getElementById('dest-grid');
  if (!grid) return;
  if (grid.__autoTimer) { clearInterval(grid.__autoTimer); grid.__autoTimer = null; }
  const isMobile = window.matchMedia && window.matchMedia('(max-width:768px)').matches;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!isMobile || reduced) return;

  const stop = () => { clearInterval(grid.__autoTimer); grid.__autoTimer = null; };
  grid.addEventListener('pointerdown', stop, { once: true });
  grid.addEventListener('touchstart', stop, { once: true, passive: true });

  grid.__autoTimer = setInterval(() => {
    const cards = [...grid.querySelectorAll('.dest-card')].filter(c => c.style.display !== 'none');
    if (!cards.length) return;
    const step = cards[0].getBoundingClientRect().width + 16; // must match .dest-grid gap
    const atEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4;
    grid.scrollTo({ left: atEnd ? 0 : grid.scrollLeft + step, behavior: 'smooth' });
  }, 3200);
}
// Re-evaluate on resize (debounced) — e.g. rotating a phone into landscape
// past 768px should stop the autoplay, and back again should resume it.
let __resizeT;
window.addEventListener('resize', () => {
  clearTimeout(__resizeT);
  __resizeT = setTimeout(initDestAutoSlide, 250);
});

// ── INTERACTIVE INDIA MAP ────────────────────────────────────────
// Pins come from coordsForDest() (state-based) so every destination shows.
function renderIndiaMap(dests) {
  const wrap = document.getElementById('map-pins');
  if (!wrap) return;
  wrap.innerHTML = dests.map((d, i) => {
    const { x, y } = coordsForDest(d);
    const safeName = (d.name || '').replace(/'/g, "\\'");
    return `
    <button type="button" class="map-pin" style="left:${x}%;top:${y}%;--pin-delay:${i * 90}ms" onclick="return pinClick(event, ${d.id}, '${safeName}')" aria-label="Explore ${d.name}, ${d.country}">
      <span class="map-pin-ping"></span>
      <span class="map-pin-dot"></span>
      <span class="map-pin-tip">
        <strong>${d.name}</strong><br>${d.country} · ${fmt(d.price_from)}
      </span>
    </button>`;
  }).join('');
}

// ── MOBILE NAV (hamburger) ────────────────────────────────────
// Below 768px .nav-links is hidden by CSS with no other way to reach
// Destinations/Reviews, so this toggles it into a dropdown panel.
function initMobileNav() {
  const burger = document.getElementById('nav-burger');
  const links = document.getElementById('navbar-links');
  if (!burger || !links) return;
  function closeNav() {
    links.classList.remove('nav-open');
    burger.setAttribute('aria-expanded', 'false');
  }
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    if (!links.contains(e.target) && !burger.contains(e.target)) closeNav();
  });
  // A real navigation (Reviews, a state link, a "most visited" pill) should
  // close the panel too — but not the "Destinations ▾" toggle itself, which
  // only expands the region list in place.
  links.querySelectorAll('a').forEach(a => {
    if (a.id === 'dest-mega-toggle') return;
    a.addEventListener('click', closeNav);
  });
}

// ── DESTINATIONS MEGA-MENU (regions of India) ────────────────────
function initDestMegaMenu() {
  const trigger = document.getElementById('dest-mega-trigger');
  const toggle = document.getElementById('dest-mega-toggle');
  const regions = document.querySelectorAll('.mega-region');
  const panels = document.querySelectorAll('.mega-states-panel');
  if (!trigger || !toggle) return;

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    trigger.classList.toggle('mega-open');
  });
  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target)) trigger.classList.remove('mega-open');
  });

  // Hovering a region (North India / West India / …) just previews its
  // state list — it does NOT filter or navigate, so browsing states stays
  // cheap. Only a click commits to that region.
  regions.forEach(r => {
    r.addEventListener('mouseenter', () => showRegionPanel(r.dataset.region));
    r.addEventListener('click', () => {
      showRegionPanel(r.dataset.region);
      goToRegion(r.dataset.region);
      trigger.classList.remove('mega-open');
    });
  });
  function showRegionPanel(region) {
    regions.forEach(r => r.classList.toggle('active', r.dataset.region === region));
    panels.forEach(p => { p.hidden = p.dataset.region !== region; });
  }

  // A specific state link or a "Most Visited" pill also commits to that
  // state's region; "All India" clears the filter.
  document.querySelectorAll('.mega-states-panel a, .mega-pill').forEach(a => {
    a.addEventListener('click', () => {
      goToRegion(a.dataset.region || 'all');
      trigger.classList.remove('mega-open');
    });
  });
}

// ── REGION SELECTION ─────────────────────────────────────────────
// Single source of truth for "the user picked a region" — fired from the
// map hotspots, the filter chips above Destinations, the nav mega-menu,
// and the footer region links. It filters the Destinations grid to that
// region and highlights the matching spot on the map + chip bar.
function goToRegion(region) {
  region = region || 'all';
  filterDestinationsByRegion(region);
  document.querySelectorAll('.map-region').forEach(b => b.classList.toggle('active', b.dataset.region === region));
  document.querySelectorAll('.rf-chip').forEach(c => c.classList.toggle('active', c.dataset.region === region));
  const target = document.getElementById('destinations');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function filterDestinationsByRegion(region) {
  let visible = 0;
  document.querySelectorAll('#dest-grid .dest-card').forEach(card => {
    const show = region === 'all' || card.dataset.region === region;
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  const empty = document.getElementById('dest-empty');
  if (empty) empty.hidden = visible !== 0;
  const grid = document.getElementById('dest-grid');
  if (grid) grid.scrollTo({ left: 0, behavior: 'auto' });
  initDestAutoSlide();
}


// A click on a map pin gets its own small "zoom burst" right at the pin
// before the shared cinematic page-transition overlay (goExplore) takes
// over — so the map itself feels like it's the thing zooming into the
// destination, rather than the pin just silently navigating away.
function pinClick(e, id, name) {
  const pin = e.currentTarget;
  pin.classList.add('pin-clicked');
  const evt = e;
  setTimeout(() => goExplore(evt, id, name), 170);
  return false;
}

// ── 3D TILT ON DESTINATION CARDS ────────────────────────────────
// Same cursor-tracked perspective-tilt technique used on the explore page's
// gallery tiles, applied here so the "Trending Destinations" grid already
// feels three-dimensional before the user even clicks into a card.
function initDestTilt() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.dest-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotY = (x - 0.5) * 16;
      const rotX = -(y - 0.5) * 16;
      card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px) scale(1.02)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

// ── CINEMATIC PAGE TRANSITION (click → explore) ─────────────────
// A branded, honeycomb-themed loading overlay with a spinning 3D hex and a
// counting percentage — the same "load, then reveal" language as the site
// preloader — plays for every destination click, then hands off into the
// native cross-document View Transition (see @view-transition in main.css)
// and the explore page's own iris + parallax reveal. Three animation layers
// stacked back to back: overlay → morph → iris.
function goExplore(e, id, name) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return true; // let the browser handle new-tab clicks normally
  e.preventDefault();
  const url = `/explore?id=${id}`;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    location.href = url;
    return false;
  }
  const overlay = document.createElement('div');
  overlay.className = 'pt-overlay';
  overlay.innerHTML = `
    <div class="pt-hex-wrap"><div class="pt-hex"><span>🐝</span></div></div>
    <div class="pt-label">Buzzing to ${name}…</div>
    <div class="pt-bar"><span class="pt-bar-fill"></span></div>
    <div class="pt-pct">0%</div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('pt-in'));

  const fill = overlay.querySelector('.pt-bar-fill');
  const pct = overlay.querySelector('.pt-pct');
  const start = performance.now();
  const dur = 900;
  function tick(t) {
    const p = Math.min(1, (t - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    const val = Math.round(eased * 100);
    fill.style.width = val + '%';
    pct.textContent = val + '%';
    if (p < 1) requestAnimationFrame(tick);
    else location.href = url;
  }
  requestAnimationFrame(tick);
  return false;
}
// Cross-document View Transitions (native browser morph, no JS needed) are
// enabled via the `@view-transition` rule in main.css. Browsers that don't
// support it (Safari/Firefox today) just do a normal, instant navigation —
// nothing breaks, it's a progressive enhancement.

function prefillDest(name) {
  const f = document.getElementById('qs-dest');
  if (f) { f.value = name; f.scrollIntoView({behavior:'smooth',block:'center'}); }
}

// ── FORM TABS ─────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── QUICK SEARCH ──────────────────────────────────────────────
const qs = document.getElementById('quick-search');
if (qs) {
  qs.addEventListener('submit', e => {
    e.preventDefault();
    const dest = document.getElementById('qs-dest').value;
    const date = document.getElementById('qs-date').value;
    const pkgId = document.getElementById('qs-pkg').value;
    if (!dest) return showToast('Please enter a destination', false);
    openModal(pkgId, document.getElementById('qs-pkg').options[document.getElementById('qs-pkg').selectedIndex]?.text || '');
    document.querySelector('[name="destination"]').value = dest;
    if (date) document.querySelector('[name="travel_date"]').value = date;
  });
}

// ── MODAL ─────────────────────────────────────────────────────
function openModal(pkgId, pkgName) {
  document.getElementById('bk-pkg-id').value = pkgId;
  document.getElementById('modal-pkg-name').textContent = pkgName + ' Package';
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

document.getElementById('modal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});

// ── BOOKING FORM ──────────────────────────────────────────────
document.getElementById('booking-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('bk-submit');
  btn.disabled = true; btn.textContent = 'Submitting…';
  const data = Object.fromEntries(new FormData(e.target).entries());
  try {
    const r = await api('POST', '/api/bookings', data);
    if (r.success) {
      closeModal();
      showToast(`🐝 ${r.message} Ref: ${r.ref}`);
      e.target.reset();
    } else {
      showToast(r.error || 'Something went wrong', false);
    }
  } catch(err) { showToast('Network error. Please try again.', false); }
  btn.disabled = false; btn.textContent = 'Confirm Booking Request';
});

// ── NEWSLETTER ────────────────────────────────────────────────
function subscribe() {
  const v = document.getElementById('nl-email')?.value;
  if (!v || !v.includes('@')) return showToast('Enter a valid email address', false);
  showToast('🐝 You\'re in the hive! Welcome aboard.');
  if (document.getElementById('nl-email')) document.getElementById('nl-email').value = '';
}

// ── SMOOTH ANCHOR SCROLL (native) ────────────────────────────
// Previously used Lenis, a transform-based smooth-scroll library that
// translates the page content instead of using real document scroll. That
// desyncs from anything that reads native scroll position — automated
// screenshot/PDF tools, browser "reader" modes, some assistive tech — which
// is what caused content from far-down sections (e.g. testimonials) to
// visually bleed into the hero in full-page captures. Native `scroll-
// behavior:smooth` (set in main.css) plus `scrollIntoView` gives the same
// eased scroll with zero risk of that class of bug, and drops an external
// CDN dependency entirely. Respects reduced-motion automatically since the
// CSS easing itself is skipped for that in main.css.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const targetSel = a.getAttribute('href');
  if (targetSel === '#') return;
  const target = document.querySelector(targetSel);
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ── "HOW IT WORKS" PINNED SCROLL-SWAP ────────────────────────
// The visual panel stays sticky while each text block scrolls past; the
// active step (and matching visual) swaps based on which block is most
// centred in the viewport.
(function initPinSteps() {
  const steps = document.querySelectorAll('.pin-step');
  const visuals = document.querySelectorAll('.pin-visual-item');
  const fill = document.getElementById('pin-progress-fill');
  if (!steps.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const step = entry.target.dataset.step;
      steps.forEach(s => s.classList.toggle('active', s.dataset.step === step));
      visuals.forEach(v => v.classList.toggle('active', v.dataset.step === step));
      if (fill) fill.style.width = (Number(step) / steps.length * 100) + '%';
    });
  }, { threshold: 0.5, rootMargin: '-35% 0px -35% 0px' });
  steps.forEach(s => io.observe(s));
})();

// ── INIT ──────────────────────────────────────────────────────
initNav();
loadPackages();
loadDestinations();
initSearchAutocomplete();
initDestMegaMenu();
initMobileNav();
