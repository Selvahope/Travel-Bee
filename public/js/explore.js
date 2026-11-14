// explore.js — destination detail page with booking card
const qs = new URLSearchParams(location.search);

function notFound(what) {
  $('#root').innerHTML = `<div class="notfound wrap"><h1>We couldn't find that ${what}</h1><p>It may have been removed or the link is incomplete.</p><a class="btn btn-primary" href="/#destinations">Browse destinations</a></div>`;
}

(async function () {
  const id = qs.get('id');
  if (!id) return notFound('destination');
  const [dr, pkgs] = await Promise.all([fetch('/api/packages/destinations/' + encodeURIComponent(id)), api('GET', '/api/packages')]);
  if (!dr.ok) return notFound('destination');
  const d = await dr.json();
  const packages = Array.isArray(pkgs) ? pkgs : [];
  document.title = `${d.name}, ${d.country} — TravelBeey`;

  const hl = (d.highlights || '').split('|').filter(Boolean);
  const itin = days(d.itinerary);
  const nameKey = d.name.split(/[ -]/)[0].toLowerCase();
  const suggested = packages.find(p => (p.map_query || '').toLowerCase().includes(nameKey)) || packages.find(p => p.tier === 'starter') || packages[0];

  $('#root').innerHTML = `
  <section class="dhero">
    ${img(d.image_file, 2000, `${d.name}, ${d.country}`, 'bg')}
    <div class="dhero-in">
      <div class="crumb"><a href="/">Home</a> / <a href="/#destinations">Destinations</a> / ${esc(d.name)}</div>
      <h1>${esc(d.name)}</h1>
      <p class="tag">${esc(d.description || d.country)}</p>
      <div class="facts">
        <div class="fact">${icon('pin')}<div><small>State</small>${esc(d.country)}</div></div>
        <div class="fact">${icon('tag')}<div><small>Trips from</small>${fmt(d.price_from)} / person</div></div>
        ${d.duration ? `<div class="fact">${icon('clock')}<div><small>Suggested stay</small>${esc(d.duration)}</div></div>` : ''}
        ${d.best_time ? `<div class="fact">${icon('sun')}<div><small>Best time</small>${esc(d.best_time)}</div></div>` : ''}
      </div>
    </div>
  </section>
  <div class="wrap dlayout">
    <div>
      ${hl.length ? `<section class="panel"><h2>Highlights</h2><ul class="hl">${hl.map(h => `<li>${icon('check')}<span>${esc(h)}</span></li>`).join('')}</ul></section>` : ''}
      ${itin.length ? `<section class="panel"><h2>Day-by-day itinerary</h2><div class="itin">${itin.map((x, i) => `<details ${i === 0 ? 'open' : ''}><summary>${esc(x.title)}${icon('down')}</summary>${x.body ? `<div class="body">${esc(x.body)}</div>` : ''}</details>`).join('')}</div></section>` : ''}
      <section class="panel"><h2>Where is it?</h2><div class="mapbox"><iframe loading="lazy" title="Map of ${esc(d.name)}" src="https://www.google.com/maps?q=${encodeURIComponent(d.name + ', ' + d.country + ', India')}&output=embed"></iframe></div></section>
      ${packages.length ? `<section class="panel"><h2>Packages you can book</h2><div class="pgrid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${packages.slice(0, 4).map(p => `<a class="pcard" href="/package?id=${p.id}"><div class="pbody"><h3>${esc(p.name)}</h3><p>${esc(p.duration || '')} · ${tierLabel(p.tier)}</p><div class="pfoot"><div class="price"><small>per adult</small>${fmt(p.price)}</div><span class="btn btn-outline">View</span></div></div></a>`).join('')}</div></section>` : ''}
    </div>
    <aside id="book"></aside>
  </div>`;

  if (packages.length) {
    mountBooking($('#book'), { packages, packageId: suggested && suggested.id, destination: d.name === d.country ? d.name : `${d.name}, ${d.country}`,
      fromCity: qs.get('from') || '', date: qs.get('date') || '', adults: qs.get('adults') || 2 });
  } else {
    $('#book').innerHTML = `<div class="panel"><h2>Booking unavailable</h2><p>No packages are open right now. <a href="/contact">Contact us</a> for a custom plan.</p></div>`;
  }
})();
