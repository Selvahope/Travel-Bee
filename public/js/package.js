// package.js — package detail page with booking card
const qs = new URLSearchParams(location.search);

function notFound() {
  $('#root').innerHTML = `<div class="notfound wrap"><h1>We couldn't find that package</h1><p>It may have been removed or the link is incomplete.</p><a class="btn btn-primary" href="/#packages">Browse packages</a></div>`;
}

(async function () {
  const id = qs.get('id');
  if (!id) return notFound();
  const r = await fetch('/api/packages/' + encodeURIComponent(id));
  if (!r.ok) return notFound();
  const p = await r.json();
  document.title = `${p.name} — TravelBeey`;
  const hl = (p.highlights || '').split('|').filter(Boolean);
  const inc = (p.includes || '').split(',').map(s => s.trim()).filter(Boolean);
  const itin = days(p.itinerary);

  $('#root').innerHTML = `
  <section class="dhero">
    ${img(p.image_file, 2000, p.name, 'bg')}
    <div class="dhero-in">
      <div class="crumb"><a href="/">Home</a> / <a href="/#packages">Packages</a> / ${esc(p.name)}</div>
      <h1>${esc(p.name)}</h1>
      <p class="tag">${esc(p.description || '')}</p>
      <div class="facts">
        <div class="fact">${icon('tag')}<div><small>From</small>${fmt(p.price)} / adult</div></div>
        ${p.duration ? `<div class="fact">${icon('clock')}<div><small>Duration</small>${esc(p.duration)}</div></div>` : ''}
        ${p.best_time ? `<div class="fact">${icon('sun')}<div><small>Best time</small>${esc(p.best_time)}</div></div>` : ''}
        <div class="fact">${icon('bag')}<div><small>Type</small>${tierLabel(p.tier)}</div></div>
      </div>
    </div>
  </section>
  <div class="wrap dlayout">
    <div>
      ${hl.length ? `<section class="panel"><h2>Highlights</h2><ul class="hl">${hl.map(h => `<li>${icon('check')}<span>${esc(h)}</span></li>`).join('')}</ul></section>` : ''}
      ${inc.length ? `<section class="panel"><h2>What's included</h2><ul class="hl">${inc.map(h => `<li>${icon('check')}<span>${esc(h)}</span></li>`).join('')}</ul></section>` : ''}
      ${itin.length ? `<section class="panel"><h2>Day-by-day itinerary</h2><div class="itin">${itin.map((x, i) => `<details ${i === 0 ? 'open' : ''}><summary>${esc(x.title)}${icon('down')}</summary>${x.body ? `<div class="body">${esc(x.body)}</div>` : ''}</details>`).join('')}</div></section>` : ''}
      ${p.map_query ? `<section class="panel"><h2>Location</h2><div class="mapbox"><iframe loading="lazy" title="Map of ${esc(p.map_query)}" src="https://www.google.com/maps?q=${encodeURIComponent(p.map_query)}&output=embed"></iframe></div><p class="fine" style="margin-top:8px">${icon('pin')} ${esc(p.map_query)}</p></section>` : ''}
      <section class="panel"><h2>Need changes?</h2><p>Every package can be adjusted — different dates, hotel category, extra nights. Add your request in the booking form, or <a href="/contact">talk to us</a>.</p></section>
    </div>
    <aside id="book"></aside>
  </div>`;

  mountBooking($('#book'), { packages: [p], packageId: p.id, lockPackage: true, destination: p.map_query || p.name,
    fromCity: qs.get('from') || '', date: qs.get('date') || '', adults: qs.get('adults') || 2 });
})();
