// dashboard.js — customer account: my trips, cancel, profile
$('.side [data-tab="trips"]').innerHTML = icon('list') + ' My trips';
$('.side [data-tab="profile"]').innerHTML = icon('user') + ' Profile';
$('#plan').innerHTML = icon('search') + ' Plan a new trip';

function tab(name) {
  $$('.tabp').forEach(p => p.classList.toggle('on', p.id === 'tab-' + name));
  $$('.side [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
}
$$('.side [data-tab]').forEach(b => b.addEventListener('click', () => tab(b.dataset.tab)));

async function loadTrips() {
  const rows = await api('GET', '/api/bookings/my');
  if (rows._status === 401) { location.href = '/login?next=/dashboard'; return; }
  const list = $('#list');
  if (!Array.isArray(rows) || !rows.length) {
    list.innerHTML = `<div class="empty">${icon('plane')}<p>You haven't booked a trip yet.</p><a class="btn btn-primary" href="/#packages">Browse packages</a></div>`;
    return;
  }
  list.innerHTML = rows.map(b => `
    <article class="bcard">
      <div>
        <div class="bref">${esc(b.ref)}</div>
        <h3>${esc(b.destination)} — ${esc(b.package_name)}</h3>
        <div class="bmeta"><span>${icon('cal')} ${esc(b.travel_date)}</span><span>${icon('users')} ${esc(b.travellers)}</span>${b.from_city ? `<span>${icon('plane')} from ${esc(b.from_city)}</span>` : ''}</div>
        <span class="st st-${esc(b.status)}">${esc(b.status)}</span>
      </div>
      <div class="bright">
        <div class="price"><small>Total</small>${fmt(b.total_price)}</div>
        <div><span class="fine">Requested ${esc((b.created_at || '').slice(0, 10))}</span>
        ${['pending', 'confirmed'].includes(b.status) ? `<br><button class="btn btn-outline" style="margin-top:8px;padding:7px 14px" data-cancel="${b.id}">Cancel</button>` : ''}</div>
      </div>
    </article>`).join('');
}
$('#list').addEventListener('click', async e => {
  const b = e.target.closest('[data-cancel]'); if (!b) return;
  if (!confirm('Cancel this booking request?')) return;
  const r = await api('PATCH', `/api/bookings/${b.dataset.cancel}/cancel`);
  if (r.success) { toast('Booking cancelled'); loadTrips(); } else toast(r.error, false);
});

$('#pf').addEventListener('submit', async e => {
  e.preventDefault(); $('#p-err').hidden = true;
  const r = await api('PATCH', '/api/auth/profile', { name: $('#p-name').value, phone: $('#p-phone').value });
  if (r.success) { toast('Profile saved'); $('#hi').textContent = 'Hi, ' + $('#p-name').value.split(' ')[0]; }
  else { $('#p-err').textContent = r.error; $('#p-err').hidden = false; }
});

(async function () {
  const me = await api('GET', '/api/auth/me');
  if (!me.loggedIn) { location.href = '/login?next=/dashboard'; return; }
  if (me.role === 'admin') { location.href = '/admin'; return; }
  $('#hi').textContent = 'Hi, ' + me.name.split(' ')[0];
  $('#p-name').value = me.name; $('#p-email').value = me.email; $('#p-phone').value = me.phone || '';
  loadTrips();
})();
