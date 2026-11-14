// home.js — homepage: hero, search, destinations, packages
const norm = (s) => (s || '').toLowerCase().trim().replace(/\s*&\s*|\s+and\s+/g, ' and ').replace(/\s+/g, ' ');
const STATE_REGION = {
  'rajasthan': 'north', 'uttar pradesh': 'north', 'uttarakhand': 'north', 'ladakh': 'north', 'jammu and kashmir': 'north', 'himachal pradesh': 'north', 'delhi': 'north', 'punjab': 'north', 'haryana': 'north',
  'kerala': 'south', 'karnataka': 'south', 'tamil nadu': 'south', 'andhra pradesh': 'south', 'telangana': 'south', 'puducherry': 'south',
  'west bengal': 'east', 'odisha': 'east', 'bihar': 'east', 'jharkhand': 'east', 'andaman and nicobar': 'east', 'sikkim': 'east',
  'goa': 'west', 'maharashtra': 'west', 'gujarat': 'west', 'madhya pradesh': 'west',
};
const regionOf = (d) => STATE_REGION[norm(d.country)] || 'other';
const CITIES = ['Chennai', 'Puducherry', 'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Kolkata', 'Pune', 'Kochi', 'Coimbatore', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Visakhapatnam', 'Trivandrum'];

let DESTS = [], PKGS = [];

$('#hero-bee').innerHTML = LOGO;
// hero photo (fades in over the gradient; stays gradient if offline)
$('#hero-bg').innerHTML = img('Hawa Mahal 2011.jpg', 2000, 'Hawa Mahal, Jaipur');

function renderDests(region = 'all') {
  const list = DESTS.filter(d => region === 'all' || regionOf(d) === region);
  $('#dgrid').innerHTML = list.map((d, i) => `
    <a class="dcard" href="/explore?id=${d.id}" aria-label="${esc(d.name)}, ${esc(d.country)}">
      ${d.badge ? `<span class="badge">${esc(d.badge)}</span>` : ''}
      <div class="dcard-emoji" aria-hidden="true">${esc(d.emoji || '')}</div>
      ${img(d.image_file, 700, `${d.name}, ${d.country}`)}
      <div class="dcard-b"><h3>${esc(d.name)}</h3><p>${esc(d.country)}</p><div class="pr">from ${fmt(d.price_from)} <small>/ person</small></div></div>
    </a>`).join('');
  $('#d-empty').hidden = list.length > 0;
}

function renderPkgs(tier = 'all') {
  const list = PKGS.filter(p => tier === 'all' || p.tier === tier);
  $('#pgrid').innerHTML = list.map(p => {
    const inc = (p.includes || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
    return `<a class="pcard" href="/package?id=${p.id}">
      <div class="pimg">${img(p.image_file, 800, p.name)}<span class="ptier">${tierLabel(p.tier)}</span><span class="pdur">${icon('clock')} ${esc(p.duration || '')}</span></div>
      <div class="pbody"><h3>${esc(p.name)}</h3><p>${esc(p.description || '')}</p>
        <div class="pinc">${inc.map(i => `<span>${esc(i)}</span>`).join('')}</div>
        <div class="pfoot"><div class="price"><small>from, per adult</small>${fmt(p.price)}</div><span class="btn btn-primary">View details</span></div>
      </div></a>`;
  }).join('') || '<p class="fine">No packages in this category yet.</p>';
}

$('#region-seg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $$('#region-seg button').forEach(x => x.classList.toggle('on', x === b)); renderDests(b.dataset.r); });
$('#tier-seg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setTier(b.dataset.t); });
function setTier(t) { $$('#tier-seg button').forEach(x => x.classList.toggle('on', x.dataset.t === t)); renderPkgs(t); }
$$('#hero-chips [data-tier]').forEach(c => c.addEventListener('click', () => setTier(c.dataset.tier)));

// search
$('#s-date').min = todayISO();
autocomplete($('#s-from'), () => CITIES.map(label => ({ label })));
autocomplete($('#s-to'), () => DESTS.map(d => ({ label: d.name, sub: d.country, id: d.id })));
$('#search').addEventListener('submit', e => {
  e.preventDefault();
  const to = $('#s-to').value.trim().toLowerCase();
  if (!to) { toast('Enter a destination, or browse the popular ones below', false); $('#s-to').focus(); return; }
  const qs = new URLSearchParams({ adults: $('#s-adults').value });
  if ($('#s-date').value) qs.set('date', $('#s-date').value);
  if ($('#s-from').value.trim()) qs.set('from', $('#s-from').value.trim());
  const d = DESTS.find(x => x.name.toLowerCase() === to) || DESTS.find(x => (x.name + ' ' + x.country).toLowerCase().includes(to) || to.includes(x.name.toLowerCase()));
  if (d) { location.href = `/explore?id=${d.id}&${qs}`; return; }
  const p = PKGS.find(x => x.name.toLowerCase().includes(to) || (x.map_query || '').toLowerCase().includes(to));
  if (p) { location.href = `/package?id=${p.id}&${qs}`; return; }
  toast(`No trip found for “${$('#s-to').value}” yet. Browse the destinations below or contact us for a custom plan.`, false);
  $('#destinations').scrollIntoView({ behavior: 'smooth' });
});

$('#nl').addEventListener('submit', e => { e.preventDefault(); subscribe(e.target); });

(async function init() {
  try {
    [DESTS, PKGS] = await Promise.all([api('GET', '/api/packages/destinations'), api('GET', '/api/packages')]);
    if (!Array.isArray(DESTS)) DESTS = []; if (!Array.isArray(PKGS)) PKGS = [];
  } catch (e) { toast('Could not load trips. Please refresh.', false); }
  renderDests(); renderPkgs();
})();
