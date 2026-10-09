// explore.js — destination explore page (fetch + cinematic 3D reveal)

const DC = ['dc-0','dc-1','dc-2','dc-3','dc-4','dc-5'];
const PARTICLE_EMOJI = ['✦','⬡','✧','⬡','✦'];
const REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fmt2(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

let defaultPkg = null; // filled in once /api/packages resolves

// Opens the shared booking modal, pre-selecting the featured package tier
// (or the first available one) since this page isn't tied to one package.
function bookTrip(destName) {
  if (defaultPkg) openModal(defaultPkg.id, defaultPkg.name);
  else openModal('', 'a Package');
  const destField = document.querySelector('#booking-form [name="destination"]');
  if (destField) destField.value = destName;
}

// Cinematic "camera diving into the screen" opener: an iris wipe over the
// whole viewport that irises open, revealing the page underneath.
function playIrisIntro() {
  if (REDUCE_MOTION) return;
  const iris = document.createElement('div');
  iris.className = 'eh-iris';
  document.body.appendChild(iris);
  iris.addEventListener('animationend', () => iris.remove(), { once: true });
  setTimeout(() => iris.remove(), 1400); // safety cleanup
}

function renderNotFound() {
  document.getElementById('explore-root').innerHTML = `
    <div class="eh-skel">
      <div style="font-size:3rem;margin-bottom:14px">🐝</div>
      <p>We couldn't find that destination.</p>
      <p style="margin-top:14px"><a href="/" class="btn-primary" style="text-decoration:none;padding:10px 24px">Back to Destinations</a></p>
    </div>`;
}

function renderDestination(d) {
  const id = d.id;
  const bgClass = DC[(id - 1 + DC.length) % DC.length];
  const highlights = (d.highlights || '').split('|').filter(Boolean);
  const gallery = (d.gallery || '').split('|').filter(Boolean);
  // Itinerary is admin-entered as "Title::Description" per day, days joined
  // with "||" — same source that powers the admin dashboard's Destinations tab.
  const itinerary = (d.itinerary || '').split('||').filter(Boolean).map(day => {
    const [title, ...rest] = day.split('::');
    return { title: (title || '').trim(), body: rest.join('::').trim() };
  });

  const particles = Array.from({length: 10}).map((_, i) => {
    const left = Math.round(Math.random() * 92) + '%';
    const top = Math.round(Math.random() * 80) + '%';
    const delay = (Math.random() * 6).toFixed(2) + 's';
    const dur = (7 + Math.random() * 5).toFixed(2) + 's';
    const pz = Math.round(-40 + Math.random() * 140); // depth: some float in front, some behind
    const emoji = PARTICLE_EMOJI[i % PARTICLE_EMOJI.length];
    return `<span class="eh-particle" style="left:${left};top:${top};animation-delay:${delay};animation-duration:${dur};--pz:${pz}px">${emoji}</span>`;
  }).join('');

  const hasPhoto = !!d.image_file;
  const heroBg = hasPhoto
    ? `<img class="eh-bg-thumb" src="${wikiImg(d.image_file, 40)}" alt="" aria-hidden="true">
       <img class="eh-bg-full" src="${wikiImg(d.image_file, 2400)}" alt="${d.name}, ${d.country}" decoding="async" onload="this.classList.add('loaded')">`
    : d.emoji || '✈️';

  document.getElementById('explore-root').innerHTML = `
    <section class="explore-hero eh-entering" id="eh-hero">
      <div class="eh-stage" id="eh-stage">
        <div class="eh-bg${hasPhoto ? '' : ' ' + bgClass}" style="view-transition-name:dest-bg-${id}">${hasPhoto ? heroBg : `<div class="eh-bg-emoji">${heroBg}</div>`}</div>
        <div class="eh-hex"></div>
        ${particles}
        <div class="explore-hero-content">
          <a href="/" class="eh-back">← Back to Destinations</a>
          <div class="eh-country" style="view-transition-name:dest-country-${id}">${d.country}</div>
          <h1 class="eh-name" style="view-transition-name:dest-name-${id}">${d.name}</h1>
          <p class="eh-tagline">${d.description || ''}</p>
          <div class="eh-meta">
            <div class="eh-meta-item"><div class="eh-meta-label">From</div><div class="eh-meta-val">${fmt2(d.price_from)} / person</div></div>
            <div class="eh-meta-item"><div class="eh-meta-label">Suggested Duration</div><div class="eh-meta-val">${d.duration || '—'}</div></div>
            <div class="eh-meta-item"><div class="eh-meta-label">Best Time to Go</div><div class="eh-meta-val">${d.best_time || '—'}</div></div>
          </div>
          <div class="eh-actions">
            <button class="btn-primary btn-shine" style="border:none" onclick="bookTrip('${d.name}')">Book This Trip</button>
            <a href="/#destinations" class="btn-ghost" style="border-color:rgba(255,255,255,.4)">More Destinations</a>
          </div>
        </div>
      </div>
    </section>

    <div class="explore-body">
      <section class="explore-block" data-reveal>
        <div class="section-tag">Don't Miss</div>
        <h2>TRIP<br>HIGHLIGHTS</h2>
        <div class="eh-highlights">
          ${highlights.map((h, i) => `
            <div class="eh-highlight" data-reveal>
              <div class="eh-highlight-num">${String(i + 1).padStart(2, '0')}</div>
              <p>${h}</p>
            </div>`).join('')}
        </div>
      </section>

      ${itinerary.length ? `
      <section class="explore-block" data-reveal>
        <div class="section-tag">Day By Day</div>
        <h2>ITINERARY</h2>
        <div class="eh-itinerary" id="eh-itinerary">
          ${itinerary.map((day, i) => `
            <details class="eh-itin-day" data-reveal ${i === 0 ? 'open' : ''}>
              <summary class="eh-itin-head">
                <span class="eh-itin-title">${day.title}</span>
                <span class="eh-itin-chevron">›</span>
              </summary>
              ${day.body ? `<div class="eh-itin-body"><p>${day.body}</p></div>` : ''}
            </details>`).join('')}
        </div>
        <p style="font-size:.85rem;color:var(--muted)"><strong>Duration:</strong> ${d.duration || '—'} &nbsp;·&nbsp; <strong>Destination:</strong> ${d.name}, ${d.country}</p>
      </section>` : ''}

      <section class="explore-block" data-reveal>
        <div class="section-tag">A Taste Of ${d.name}</div>
        <h2>THE<br>GALLERY</h2>
        <div class="eh-gallery" id="eh-gallery">
          ${gallery.map((g, gi) => `
            <div class="eh-tile eh-tile-${gi % 4}" data-reveal>
              ${hasPhoto
                ? `<img class="eh-tile-photo" src="${wikiImg(d.image_file, 700)}" alt="${d.name}, ${d.country}" loading="lazy">`
                : `<div class="eh-tile-emoji">${g}</div>`}
              <div class="eh-tile-scrim"></div>
              <span class="eh-tile-cap">${hasPhoto ? (highlights[gi] || d.name) : ''}</span>
            </div>`).join('')}
        </div>
      </section>

      <section class="explore-block" data-reveal>
        <div class="eh-cta">
          <h3>Ready for ${d.name}?</h3>
          <p>Tell us your dates — we'll handle flights, stays and every detail in between.</p>
          <button class="btn-primary btn-shine" style="border:none" onclick="bookTrip('${d.name}')">🐝 Book This Trip</button>
        </div>
      </section>
    </div>
  `;

  // Pre-fill the destination field in the booking modal for this page
  const destField = document.querySelector('#booking-form [name="destination"]');
  if (destField) destField.value = `${d.name}, ${d.country}`;

  // ── Scroll-triggered reveal (staggered "anime panel" entrance) ──
  const revealEls = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('in-view'), idx * 60);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));

  initHeroParallax();
  initGalleryTilt();
}

// ── 3D PARALLAX HERO ────────────────────────────────────────────
// The hero's background, hex pattern, particles and text sit at different
// translateZ depths (see main.css). Tilting the whole "stage" toward the
// cursor makes those layers shift by different amounts on screen — a real
// multiplane depth effect, not a fake one.
function initHeroParallax() {
  if (REDUCE_MOTION) return;
  const hero = document.getElementById('eh-hero');
  const stage = document.getElementById('eh-stage');
  if (!hero || !stage) return;
  let raf = null;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 .. 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const rotY = px * 10;   // left/right cursor -> yaw
      const rotX = -py * 7;   // up/down cursor -> pitch
      stage.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.03)`;
    });
  });
  hero.addEventListener('mouseleave', () => {
    if (raf) cancelAnimationFrame(raf);
    stage.style.transform = 'rotateX(0) rotateY(0) scale(1)';
  });
}

// ── GLOSSY 3D-TILT GALLERY TILES ─────────────────────────────────
// Cursor-tracked rotation + a moving specular highlight per tile, the same
// technique behind "holographic card" effects.
function initGalleryTilt() {
  if (REDUCE_MOTION) return;
  document.querySelectorAll('#eh-gallery .eh-tile').forEach(tile => {
    tile.addEventListener('mousemove', (e) => {
      const rect = tile.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;   // 0..1
      const y = (e.clientY - rect.top) / rect.height;
      const rotY = (x - 0.5) * 22;
      const rotX = -(y - 0.5) * 22;
      tile.style.transform = `translateY(0) rotate(0deg) scale(1.04) perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      tile.style.setProperty('--mx', (x * 100) + '%');
      tile.style.setProperty('--my', (y * 100) + '%');
    });
    tile.addEventListener('mouseleave', () => {
      tile.style.transform = '';
    });
  });
}

async function initExplore() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return renderNotFound();
  playIrisIntro();
  try {
    const [destRes, pkgs] = await Promise.all([
      fetch(`/api/packages/destinations/${id}`),
      fetch('/api/packages').then(r => r.json()).catch(() => []),
    ]);
    if (!destRes.ok) return renderNotFound();
    const d = await destRes.json();
    defaultPkg = pkgs.find(p => p.tier === 'premium') || pkgs[0] || null;
    renderDestination(d);
  } catch (err) {
    renderNotFound();
  }
}

initExplore();
