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

// ── Horizontal "rails": destinations and packages scroll sideways, so adding more never makes the page taller.
// Each row is a grid of 2 rows × 4 columns; extra items become more pages. They auto-advance one page at a time. Auto-scroll pauses on hover/focus/touch, while off-screen or in a background tab,
// and has a pause button. Arrow buttons (desktop), swipe (phones) and the arrow keys all work too.
function initRail(track, label, { every = 4500 } = {}) {
  const rail = document.createElement('div'); rail.className = 'rail';
  track.parentNode.insertBefore(rail, track); rail.appendChild(track);
  track.tabIndex = 0; track.setAttribute('role', 'region'); track.setAttribute('aria-label', label);

  const foot = document.createElement('div'); foot.className = 'rail-foot';
  foot.innerHTML = `<div class="rail-progress" aria-hidden="true"><i></i></div>
    <div class="rail-ctl">
      <button type="button" class="rail-btn" data-a="prev" aria-label="Previous: ${label}">${icon('left')}</button>
      <button type="button" class="rail-btn" data-a="next" aria-label="Next: ${label}">${icon('right')}</button>
      <button type="button" class="rail-btn rail-play" data-a="play" aria-label="Pause auto-scroll" aria-pressed="false">${icon('pause')}</button>
    </div>`;
  rail.appendChild(foot);
  const bar = foot.querySelector('.rail-progress i'), prev = foot.querySelector('[data-a=prev]'),
        next = foot.querySelector('[data-a=next]'), play = foot.querySelector('[data-a=play]');

  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = reduce, hover = false, inView = false, idleUntil = 0;
  if (reduce) play.hidden = true;
  const userTouched = () => { idleUntil = Date.now() + 5000; };      // give the visitor 5s of peace after any interaction
  const maxLeft = () => track.scrollWidth - track.clientWidth;
  const cssInt = (name) => parseInt(getComputedStyle(track).getPropertyValue(name), 10) || 1;
  // one "page" = the visible columns (4 on desktop, 3 on tablets, 2 on phones)
  const pageStep = () => {
    const card = track.firstElementChild;
    if (!card || card.classList.contains('fine')) return 0;
    return cssInt('--cols') * (card.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 16));
  };
  // Place every card in an explicit row/column so each page reads left→right, top→bottom, even when the last page is only partly full.
  const layout = () => {
    const cols = cssInt('--cols'), rows = cssInt('--rows'), per = cols * rows;
    [...track.children].forEach((el, i) => {
      if (el.classList.contains('fine')) return;
      const page = Math.floor(i / per), j = i % per;
      el.style.gridColumn = String(page * cols + (j % cols) + 1);
      el.style.gridRow = String(Math.floor(j / cols) + 1);
    });
  };

  const update = () => {
    const max = maxLeft(), left = track.scrollLeft;
    prev.disabled = left <= 2; next.disabled = left >= max - 2;
    rail.classList.toggle('no-scroll', max <= 2);
    const w = Math.max(14, Math.min(100, (track.clientWidth / track.scrollWidth) * 100));
    bar.style.width = w + '%';
    bar.style.left = (max > 2 ? (left / max) * (100 - w) : 0) + '%';
  };
  track.addEventListener('scroll', update, { passive: true });
  const relayout = () => { layout(); update(); };
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(track); else window.addEventListener('resize', relayout);

  prev.addEventListener('click', () => { userTouched(); track.scrollBy({ left: -pageStep(), behavior: 'smooth' }); });
  next.addEventListener('click', () => { userTouched(); track.scrollBy({ left: pageStep(), behavior: 'smooth' }); });
  play.addEventListener('click', () => {
    paused = !paused;
    play.setAttribute('aria-pressed', paused); play.setAttribute('aria-label', paused ? 'Play auto-scroll' : 'Pause auto-scroll');
    play.innerHTML = icon(paused ? 'play' : 'pause');
  });
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(ev => track.addEventListener(ev, userTouched, { passive: true }));
  rail.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
  rail.addEventListener('pointerleave', () => { hover = false; });
  rail.addEventListener('focusin', () => { hover = true; });
  rail.addEventListener('focusout', () => { hover = false; });
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.35 }).observe(rail); else inView = true;

  setInterval(() => {
    if (paused || hover || !inView || document.hidden || Date.now() < idleUntil || maxLeft() <= 2) return;
    if (track.scrollLeft >= maxLeft() - 4) track.scrollTo({ left: 0, behavior: 'smooth' });   // loop back to the start
    else track.scrollBy({ left: pageStep(), behavior: 'smooth' });
  }, every);

  return { update: () => requestAnimationFrame(update), reset: () => { layout(); track.scrollLeft = 0; requestAnimationFrame(update); } };
}
const dRail = initRail($('#dgrid'), 'Popular destinations', { every: 2000 }), pRail = initRail($('#pgrid'), 'Holiday packages', { every: 2500 });

$('#hero-bee').innerHTML = BEE;
// hero photo (fades in over the gradient; stays gradient if offline)
$('#hero-bg').innerHTML = img('Hawa Mahal 2011.jpg', 2000, 'Hawa Mahal, Jaipur');

function renderDests(region = 'all') {
  const list = DESTS.filter(d => region === 'all' || regionOf(d) === region);
  $('#dgrid').innerHTML = list.map((d, i) => `
    <a class="dcard" href="/explore?id=${d.id}" aria-label="${esc(d.name)}, ${esc(d.country)}">
      ${d.badge ? `<span class="badge">${esc(d.badge)}</span>` : ''}
      <div class="dcard-emoji" aria-hidden="true">${esc(d.emoji || '')}</div>
      ${img(d.image_file, 700, `${d.name}, ${d.country}`)}
      <span class="dcard-go" aria-hidden="true">${icon('right')}</span>
      <div class="dcard-b"><h3>${esc(d.name)}</h3><p>${esc(d.country)}</p><div class="pr">from ${fmt(lowestPrice(PKGS, d.price_from))} <small>/ person</small></div></div>
    </a>`).join('');
  $('#d-empty').hidden = list.length > 0;
  dRail.reset();
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
  pRail.reset();
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