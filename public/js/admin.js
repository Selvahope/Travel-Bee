// admin.js — admin dashboard

async function api(method, url, body) {
  const opts = { method, headers: {'Content-Type':'application/json'}, credentials:'include' };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  if (r.status === 401 || r.status === 403) { location.href = '/login?next=/admin'; return {}; }
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

// Same resolution logic as wikiImg() in main.js (kept local since admin.html
// doesn't load main.js) — local uploads start with "/", legacy Wikimedia
// Commons titles don't.
function adminImgUrl(file, width) {
  if (!file) return '';
  if (file.startsWith('/')) return file;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width || 700}`;
}

function statusBadge(s) { return `<span class="status-badge status-${s}">${s}</span>`; }

// ── TABS ──────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.snav').forEach(a => a.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  document.querySelector(`.snav[data-tab="${name}"]`)?.classList.add('active');
  if (name === 'bookings')  loadAdminBookings();
  if (name === 'users')     loadUsers();
  if (name === 'packages')  loadAdminPackages();
  if (name === 'destinations') loadAdminDestinations();
}
document.querySelectorAll('.snav[data-tab]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); switchTab(a.dataset.tab); });
});

// ── INIT ──────────────────────────────────────────────────────
async function init() {
  const me = await api('GET', '/api/auth/me');
  if (!me.loggedIn || me.role !== 'admin') { location.href = '/login?next=/admin'; return; }
  document.getElementById('admin-name').textContent = 'Admin: ' + me.name;
  loadStats();
}

async function loadStats() {
  const s = await api('GET', '/api/admin/stats');
  document.getElementById('sc-total').textContent     = s.totalBookings;
  document.getElementById('sc-pending').textContent   = s.pendingBookings;
  document.getElementById('sc-confirmed').textContent = s.confirmedBookings;
  document.getElementById('sc-revenue').textContent   = fmt(s.totalRevenue);
  document.getElementById('sc-users').textContent     = s.totalUsers;

  // Recent bookings
  document.getElementById('recent-bookings').innerHTML = (s.recentBookings||[]).map(b =>
    `<div class="recent-row"><div><strong>${b.guest_name}</strong><br><small style="color:var(--muted)">${b.destination}</small></div><div>${statusBadge(b.status)}</div></div>`
  ).join('') || '<p style="color:var(--muted);font-size:.85rem">No bookings yet.</p>';

  // Top destinations
  const maxCount = Math.max(...(s.topDest||[{count:1}]).map(d => d.count), 1);
  document.getElementById('top-dest').innerHTML = (s.topDest||[]).map(d =>
    `<div class="dest-bar"><div><strong>${d.destination}</strong><div class="dest-bar-fill" style="width:0%" data-target-width="${Math.round(d.count/maxCount*100)}%"></div></div><span>${d.count}</span></div>`
  ).join('') || '<p style="color:var(--muted);font-size:.85rem">No data yet.</p>';
  requestAnimationFrame(() => {
    document.querySelectorAll('.dest-bar-fill[data-target-width]').forEach((el, i) => {
      setTimeout(() => { el.style.transition = 'width .6s cubic-bezier(.16,1,.3,1)'; el.style.width = el.dataset.targetWidth; }, i * 60);
    });
  });
  window.refreshAnimations && window.refreshAnimations();
}

// ── BOOKINGS ──────────────────────────────────────────────────
async function loadAdminBookings() {
  const search = document.getElementById('bk-search')?.value || '';
  const status = document.getElementById('bk-status')?.value || '';
  let url = '/api/bookings?';
  if (status) url += 'status='+encodeURIComponent(status)+'&';
  if (search) url += 'search='+encodeURIComponent(search);
  const rows = await api('GET', url);
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;
  tbody.innerHTML = (rows||[]).map(b => `
    <tr>
      <td class="td-ref">${b.ref}</td>
      <td><strong>${b.guest_name}</strong><br><small style="color:var(--muted)">${b.guest_email}</small></td>
      <td>${b.destination}</td>
      <td>${b.package_name}</td>
      <td>${b.travel_date}</td>
      <td>${b.total_price ? fmt(b.total_price) : '—'}</td>
      <td>${statusBadge(b.status)}</td>
      <td>
        <select onchange="updateStatus(${b.id},this.value)" style="padding:5px 8px;border-radius:6px;border:1px solid #ddd;font-size:.75rem;cursor:pointer">
          ${['pending','confirmed','cancelled','completed'].map(s=>`<option value="${s}"${b.status===s?' selected':''}>${s}</option>`).join('')}
        </select>
        <button class="action-btn danger" onclick="deleteBooking(${b.id})">🗑</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--muted)">No bookings found.</td></tr>';
}

async function updateStatus(id, status) {
  const r = await api('PATCH', '/api/bookings/'+id+'/status', {status});
  if (r.success) showToast('Status updated to ' + status);
  else showToast('Failed to update', false);
}

async function deleteBooking(id) {
  if (!confirm('Delete this booking? This cannot be undone.')) return;
  const r = await api('DELETE', '/api/bookings/'+id);
  if (r.success) { showToast('Booking deleted'); loadAdminBookings(); }
  else showToast('Failed to delete', false);
}

// ── USERS ──────────────────────────────────────────────────────
async function loadUsers() {
  const users = await api('GET', '/api/admin/users');
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = (users||[]).map(u => `
    <tr>
      <td>${u.id}</td>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td>${u.phone||'—'}</td>
      <td><span class="status-badge ${u.role==='admin'?'status-confirmed':'status-pending'}">${u.role}</span></td>
      <td>${u.created_at.slice(0,10)}</td>
      <td>
        <button class="action-btn" onclick="toggleRole(${u.id},'${u.role==='admin'?'user':'admin'}')">
          ${u.role==='admin'?'→ User':'→ Admin'}
        </button>
        <button class="action-btn danger" onclick="deleteUser(${u.id})">🗑</button>
      </td>
    </tr>`).join('');
}

async function toggleRole(id, role) {
  if (!confirm('Change this user to ' + role + '?')) return;
  const r = await api('PATCH', '/api/admin/users/'+id+'/role', {role});
  if (r.success) { showToast('Role updated'); loadUsers(); }
}

async function deleteUser(id) {
  if (!confirm('Delete this user? This cannot be undone.')) return;
  const r = await api('DELETE', '/api/admin/users/'+id);
  if (r.success) { showToast('User deleted'); loadUsers(); }
  else showToast(r.error || 'Failed', false);
}

// ── PACKAGES ──────────────────────────────────────────────────
async function loadAdminPackages() {
  const pkgs = await api('GET', '/api/packages');
  const grid = document.getElementById('pkg-admin-grid');
  grid.classList.add('reveal-stagger');
  grid.classList.remove('rv-bound');
  grid.innerHTML = (pkgs||[]).map(p => `
    <div class="pkg-admin-card tilt-lift" data-tilt data-tilt-strength="5">
      <div class="pac-name">${p.name}</div>
      <span class="pac-tier tier-${p.tier}">${p.tier}</span>
      <div class="pac-price">₹${Number(p.price).toLocaleString('en-IN')}</div>
      <div style="font-size:.8rem;color:var(--muted)">${p.duration||''}</div>
      <div style="font-size:.8rem;color:var(--muted)">${p.image_file ? '📷 Has photo' : '🔡 No photo yet'} · ${(p.highlights||'').split('|').filter(Boolean).length} highlights · ${(p.itinerary||'').split('||').filter(Boolean).length} itinerary days</div>
      <div class="pac-actions">
        <a class="action-btn" href="/package?id=${p.id}" target="_blank" rel="noopener">View Page</a>
        <button class="action-btn" onclick="editPkg(${JSON.stringify(p).split('"').join('&quot;')})">Edit</button>
        <button class="action-btn danger" onclick="deletePkg(${p.id})">Delete</button>
      </div>
    </div>`).join('');
  window.refreshAnimations && window.refreshAnimations();
}

function showAddPkg() {
  document.getElementById('pkg-modal-title').textContent = 'Add Package';
  document.getElementById('pkg-form').reset();
  document.querySelector('#pkg-form [name="id"]').value = '';
  document.querySelector('#pkg-form [name="image_file"]').value = '';
  setPkgDzPreview('');
  document.getElementById('pkg-modal').classList.add('open');
}

function editPkg(p) {
  document.getElementById('pkg-modal-title').textContent = 'Edit Package';
  const f = document.getElementById('pkg-form');
  f.querySelector('[name="id"]').value = p.id;
  f.querySelector('[name="name"]').value = p.name;
  f.querySelector('[name="tier"]').value = p.tier;
  f.querySelector('[name="description"]').value = p.description||'';
  f.querySelector('[name="price"]').value = p.price;
  f.querySelector('[name="duration"]').value = p.duration||'';
  f.querySelector('[name="includes"]').value = p.includes||'';
  f.querySelector('[name="image_file"]').value = p.image_file||'';
  setPkgDzPreview(p.image_file||'');
  f.querySelector('[name="highlights_lines"]').value = (p.highlights||'').split('|').filter(Boolean).join('\n');
  f.querySelector('[name="best_time"]').value = p.best_time||'';
  f.querySelector('[name="map_query"]').value = p.map_query||'';
  // Stored as "Title::Description" per day, joined with "||" between days —
  // show it back as one readable "Title :: Description" line per day.
  f.querySelector('[name="itinerary_lines"]').value = (p.itinerary||'')
    .split('||').filter(Boolean)
    .map(day => day.split('::').map(s => s.trim()).join(' :: '))
    .join('\n');
  document.getElementById('pkg-modal').classList.add('open');
}

async function deletePkg(id) {
  if (!confirm('Deactivate this package?')) return;
  const r = await api('DELETE', '/api/packages/'+id);
  if (r.success) { showToast('Package deactivated'); loadAdminPackages(); }
}

// ── PACKAGE PHOTO DROPZONE ────────────────────────────────────
// Same drag-and-drop pattern as the destination dropzone further below,
// just pointed at the package form's fields and uploaded with type=packages
// so it lands in public/uploads/packages instead.
function setPkgDzPreview(imageFile) {
  const preview = document.getElementById('pkg-dz-preview');
  const empty   = document.getElementById('pkg-dz-empty');
  const img     = document.getElementById('pkg-dz-img');
  const status  = document.getElementById('pkg-dz-status');
  if (imageFile) {
    img.src = (typeof wikiImg === 'function') ? wikiImg(imageFile, 700) : adminImgUrl(imageFile, 700);
    preview.style.display = '';
    empty.style.display = 'none';
  } else {
    preview.style.display = 'none';
    empty.style.display = '';
  }
  status.textContent = '';
}

async function uploadPkgPhoto(file) {
  const dz = document.getElementById('pkg-dropzone');
  const status = document.getElementById('pkg-dz-status');
  if (!file.type.startsWith('image/')) { showToast('Please choose an image file.', false); return; }
  if (file.size > 8 * 1024 * 1024) { showToast('Image is larger than 8MB.', false); return; }
  dz.classList.add('dz-uploading');
  status.textContent = 'Uploading…';
  try {
    const fd = new FormData();
    fd.append('type', 'packages');
    fd.append('photo', file);
    const r = await fetch('/api/packages/upload-image', { method: 'POST', body: fd, credentials: 'include' });
    if (r.status === 401 || r.status === 403) { location.href = '/login?next=/admin'; return; }
    const data = await r.json();
    if (data.success) {
      document.querySelector('#pkg-form [name="image_file"]').value = data.path;
      setPkgDzPreview(data.path);
      showToast('Photo uploaded!');
    } else {
      status.textContent = '';
      showToast(data.error || 'Upload failed', false);
    }
  } catch (err) {
    status.textContent = '';
    showToast('Upload failed — check your connection.', false);
  } finally {
    dz.classList.remove('dz-uploading');
  }
}

(function initPkgDropzone() {
  const dz = document.getElementById('pkg-dropzone');
  if (!dz) return;
  const input = document.getElementById('pkg-dz-input');

  dz.addEventListener('click', (e) => {
    if (e.target.closest('.dz-remove')) return;
    input.click();
  });
  input.addEventListener('change', () => {
    if (input.files[0]) uploadPkgPhoto(input.files[0]);
    input.value = '';
  });
  ['dragenter','dragover'].forEach(evt => dz.addEventListener(evt, (e) => {
    e.preventDefault(); e.stopPropagation();
    dz.classList.add('dz-drag');
  }));
  ['dragleave','drop'].forEach(evt => dz.addEventListener(evt, (e) => {
    e.preventDefault(); e.stopPropagation();
    dz.classList.remove('dz-drag');
  }));
  dz.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) uploadPkgPhoto(file);
  });
  document.getElementById('pkg-dz-remove')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelector('#pkg-form [name="image_file"]').value = '';
    setPkgDzPreview('');
  });
})();

document.getElementById('pkg-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  const id = data.id;
  delete data.id;

  // Same one-per-line pattern the destination form uses: each line becomes
  // one pipe-separated highlight / one "Title::Description" itinerary day.
  const hLines = (data.highlights_lines || '').split('\n').map(s => s.trim()).filter(Boolean);
  data.highlights = hLines.join('|');
  delete data.highlights_lines;

  const itinLines = (data.itinerary_lines || '').split('\n').map(s => s.trim()).filter(Boolean);
  data.itinerary = itinLines.map(line => {
    const [title, ...rest] = line.split('::');
    return `${title.trim()}::${rest.join('::').trim()}`;
  }).join('||');
  delete data.itinerary_lines;

  const r = id
    ? await api('PUT', '/api/packages/'+id, {...data, active:1})
    : await api('POST', '/api/packages', data);
  if (r.success || r.id) {
    showToast('Package saved!');
    document.getElementById('pkg-modal').classList.remove('open');
    loadAdminPackages();
  } else showToast(r.error||'Failed', false);
});

async function logout() {
  await api('POST', '/api/auth/logout');
  location.href = '/';
}

// ── DESTINATIONS ──────────────────────────────────────────────
// Powers both the homepage "Trending Destinations" grid and each
// destination's /explore page — see routes/packages.js for the API.
async function loadAdminDestinations() {
  const dests = await api('GET', '/api/packages/destinations/admin/all');
  const grid = document.getElementById('dest-admin-grid');
  grid.classList.add('reveal-stagger');
  grid.classList.remove('rv-bound');
  grid.innerHTML = (dests||[]).map(d => `
    <div class="pkg-admin-card tilt-lift" data-tilt data-tilt-strength="5">
      <div class="pac-name">${d.emoji||'✈️'} ${d.name}${d.active ? '' : ' <span style="color:var(--muted);font-weight:400;font-size:.75rem">(hidden)</span>'}</div>
      <span class="pac-tier tier-starter">${d.country}</span>
      <div class="pac-price">₹${Number(d.price_from).toLocaleString('en-IN')}<span style="font-size:.7rem;color:var(--muted);font-weight:500"> from</span></div>
      <div style="font-size:.8rem;color:var(--muted)">${d.image_file ? '📷 Has photo' : '🔡 Emoji only'} · ${(d.highlights||'').split('|').filter(Boolean).length} highlights · ${(d.itinerary||'').split('||').filter(Boolean).length} itinerary days</div>
      <div class="pac-actions">
        <button class="action-btn" onclick='editDest(${JSON.stringify(d).replace(/'/g,"&#39;")})'>Edit</button>
        <button class="action-btn danger" onclick="deleteDest(${d.id})">${d.active ? 'Hide' : 'Delete'}</button>
      </div>
    </div>`).join('') || '<p style="color:var(--muted);font-size:.85rem">No destinations yet — add your first one.</p>';
  window.refreshAnimations && window.refreshAnimations();
}

function showAddDest() {
  document.getElementById('dest-modal-title').textContent = 'Add Destination';
  document.getElementById('dest-form').reset();
  document.querySelector('#dest-form [name="id"]').value = '';
  document.querySelector('#dest-form [name="image_file"]').value = '';
  setDzPreview('');
  document.getElementById('dest-modal').classList.add('open');
}

function editDest(d) {
  document.getElementById('dest-modal-title').textContent = 'Edit Destination';
  const f = document.getElementById('dest-form');
  f.querySelector('[name="id"]').value = d.id;
  f.querySelector('[name="name"]').value = d.name;
  f.querySelector('[name="country"]').value = d.country;
  f.querySelector('[name="price_from"]').value = d.price_from;
  f.querySelector('[name="badge"]').value = d.badge||'';
  f.querySelector('[name="image_file"]').value = d.image_file||'';
  setDzPreview(d.image_file||'');
  f.querySelector('[name="emoji"]').value = d.emoji||'';
  f.querySelector('[name="description"]').value = d.description||'';
  f.querySelector('[name="highlights_lines"]').value = (d.highlights||'').split('|').filter(Boolean).join('\n');
  f.querySelector('[name="duration"]').value = d.duration||'';
  f.querySelector('[name="best_time"]').value = d.best_time||'';
  // Stored as "Title::Description" per day, joined with "||" between days —
  // show it back as one readable "Title :: Description" line per day.
  f.querySelector('[name="itinerary_lines"]').value = (d.itinerary||'')
    .split('||').filter(Boolean)
    .map(day => day.split('::').map(s => s.trim()).join(' :: '))
    .join('\n');
  document.getElementById('dest-modal').classList.add('open');
}

// ── PHOTO DROPZONE ─────────────────────────────────────────────
// Drag-and-drop (or click-to-browse) photo upload for the destination form.
// On drop/select we immediately POST the file to /api/packages/upload-image,
// then stash the returned local path in the hidden "image_file" input — the
// same field the rest of the form already reads on submit. Legacy Wikimedia
// titles (from older seed data) still preview fine since wikiImg() resolves
// either kind of value to a real image URL.
function setDzPreview(imageFile) {
  const preview = document.getElementById('dest-dz-preview');
  const empty   = document.getElementById('dest-dz-empty');
  const img     = document.getElementById('dest-dz-img');
  const status  = document.getElementById('dest-dz-status');
  if (imageFile) {
    img.src = (typeof wikiImg === 'function') ? wikiImg(imageFile, 700) : adminImgUrl(imageFile, 700);
    preview.style.display = '';
    empty.style.display = 'none';
  } else {
    preview.style.display = 'none';
    empty.style.display = '';
  }
  status.textContent = '';
}

async function uploadDestPhoto(file) {
  const dz = document.getElementById('dest-dropzone');
  const status = document.getElementById('dest-dz-status');
  if (!file.type.startsWith('image/')) { showToast('Please choose an image file.', false); return; }
  if (file.size > 8 * 1024 * 1024) { showToast('Image is larger than 8MB.', false); return; }
  dz.classList.add('dz-uploading');
  status.textContent = 'Uploading…';
  try {
    const fd = new FormData();
    fd.append('photo', file);
    const r = await fetch('/api/packages/upload-image', { method: 'POST', body: fd, credentials: 'include' });
    if (r.status === 401 || r.status === 403) { location.href = '/login?next=/admin'; return; }
    const data = await r.json();
    if (data.success) {
      document.querySelector('#dest-form [name="image_file"]').value = data.path;
      setDzPreview(data.path);
      showToast('Photo uploaded!');
    } else {
      status.textContent = '';
      showToast(data.error || 'Upload failed', false);
    }
  } catch (err) {
    status.textContent = '';
    showToast('Upload failed — check your connection.', false);
  } finally {
    dz.classList.remove('dz-uploading');
  }
}

(function initDestDropzone() {
  const dz = document.getElementById('dest-dropzone');
  if (!dz) return;
  const input = document.getElementById('dest-dz-input');

  dz.addEventListener('click', (e) => {
    if (e.target.closest('.dz-remove')) return;
    input.click();
  });
  input.addEventListener('change', () => {
    if (input.files[0]) uploadDestPhoto(input.files[0]);
    input.value = '';
  });
  ['dragenter','dragover'].forEach(evt => dz.addEventListener(evt, (e) => {
    e.preventDefault(); e.stopPropagation();
    dz.classList.add('dz-drag');
  }));
  ['dragleave','drop'].forEach(evt => dz.addEventListener(evt, (e) => {
    e.preventDefault(); e.stopPropagation();
    dz.classList.remove('dz-drag');
  }));
  dz.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) uploadDestPhoto(file);
  });
  document.getElementById('dest-dz-remove')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelector('#dest-form [name="image_file"]').value = '';
    setDzPreview('');
  });
})();

async function deleteDest(id) {
  if (!confirm('Hide this destination from the site? It stops showing on the homepage but past bookings are unaffected.')) return;
  const r = await api('DELETE', '/api/packages/destinations/'+id);
  if (r.success) { showToast('Destination hidden'); loadAdminDestinations(); }
  else showToast(r.error || 'Failed', false);
}

document.getElementById('dest-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  const id = data.id;
  delete data.id;

  // The form collects one highlight per line for readability; the API
  // (and the explore page) store/expect them pipe-separated.
  const lines = (data.highlights_lines || '').split('\n').map(s => s.trim()).filter(Boolean);
  data.highlights = lines.join('|');
  delete data.highlights_lines;
  // No photo yet? Fall back to the emoji repeated once per highlight so the
  // explore page's gallery tiles have something to show for each one.
  data.gallery = lines.map(() => (data.emoji || '✈️')).join('|');

  // Same one-per-line pattern for the itinerary: each line is "Title :: Description",
  // stored as "Title::Description" per day joined with "||" between days.
  const itinLines = (data.itinerary_lines || '').split('\n').map(s => s.trim()).filter(Boolean);
  data.itinerary = itinLines.map(line => {
    const [title, ...rest] = line.split('::');
    return `${title.trim()}::${rest.join('::').trim()}`;
  }).join('||');
  delete data.itinerary_lines;

  const r = id
    ? await api('PUT', '/api/packages/destinations/'+id, {...data, active:1})
    : await api('POST', '/api/packages/destinations', data);
  if (r.success || r.id) {
    showToast('Destination saved!');
    document.getElementById('dest-modal').classList.remove('open');
    loadAdminDestinations();
  } else showToast(r.error||'Failed', false);
});

init();
