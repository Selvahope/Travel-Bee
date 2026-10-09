// package.js — package detail page (hero, itinerary, sticky sidebar CTA + map)

const PARTICLE_EMOJI = ['✦','⬡','✧','⬡','✦'];
const REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TIER_BG = { starter: 'dc-0', premium: 'dc-2', adventure: 'dc-4' };

function fmt2(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

// Opens the shared booking modal, pre-selected to this exact package since
// the whole page is about one package.
function bookTrip(pkgId, pkgName, destHint) {
  openModal(pkgId, pkgName);
  const destField = document.querySelector('#booking-form [name="destination"]');
  if (destField && destHint) destField.value = destHint;
}

function playIrisIntro() {
  if (REDUCE_MOTION) return;
  const iris = document.createElement('div');
  iris.className = 'eh-iris';
  document.body.appendChild(iris);
  iris.addEventListener('animationend', () => iris.remove(), { once: true });
  setTimeout(() => iris.remove(), 1400);
}

function renderNotFound() {
  document.getElementById('package-root').innerHTML = `
    <div class="eh-skel">
      <div style="font-size:3rem;margin-bottom:14px">🐝</div>
      <p>We couldn't find that package.</p>
      <p style="margin-top:14px"><a href="/" class="btn-primary" style="text-decoration:none;padding:10px 24px">Back to Home</a></p>
    </div>`;
}

function renderPackage(p) {
  const bgClass = TIER_BG[p.tier] || 'dc-1';
  const highlights = (p.highlights || '').split('|').filter(Boolean);
  const includes = (p.includes || '').split(',').map(s => s.trim()).filter(Boolean);
  // Itinerary is admin-entered as "Title::Description" per day, days joined
  // with "||" — same source/format the admin Packages tab writes.
  const itinerary = (p.itinerary || '').split('||').filter(Boolean).map(day => {
    const [title, ...rest] = day.split('::');
    return { title: (title || '').trim(), body: rest.join('::').trim() };
  });

  const particles = Array.from({length: 10}).map((_, i) => {
    const left = Math.round(Math.random() * 92) + '%';
    const top = Math.round(Math.random() * 80) + '%';
    const delay = (Math.random() * 6).toFixed(2) + 's';
    const dur = (7 + Math.random() * 5).toFixed(2) + 's';
    const pz = Math.round(-40 + Math.random() * 140);
    const emoji = PARTICLE_EMOJI[i % PARTICLE_EMOJI.length];
    return `<span class="eh-particle" style="left:${left};top:${top};animation-delay:${delay};animation-duration:${dur};--pz:${pz}px">${emoji}</span>`;
  }).join('');

  const hasPhoto = !!p.image_file;
  const heroBg = hasPhoto
    ? `<img class="eh-bg-thumb" src="${wikiImg(p.image_file, 40)}" alt="" aria-hidden="true">
       <img class="eh-bg-full" src="${wikiImg(p.image_file, 2400)}" alt="${p.name}" decoding="async" onload="this.classList.add('loaded')">`
    : '🐝';

  const mapEmbed = p.map_query
    ? `<iframe src="https://www.google.com/maps?q=${encodeURIComponent(p.map_query)}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map of ${p.map_query}"></iframe>
       <div class="pkg-map-label">📍 ${p.map_query}</div>`
    : '';

  document.getElementById('package-root').innerHTML = `
    <section class="explore-hero eh-entering" id="eh-hero">
      <div class="eh-stage" id="eh-stage">
        <div class="eh-bg${hasPhoto ? '' : ' ' + bgClass}">${hasPhoto ? heroBg : `<div class="eh-bg-emoji">${heroBg}</div>`}</div>
        <div class="eh-hex"></div>
        ${particles}
        <div class="explore-hero-content">
          <a href="/" class="eh-back">← Back to Home</a>
          <div class="eh-country">${p.tier ? p.tier.toUpperCase() + ' PACKAGE' : 'TOUR PACKAGE'}</div>
          <h1 class="eh-name">${p.name}</h1>
          <p class="eh-tagline">${p.description || ''}</p>
          <div class="eh-meta">
            <div class="eh-meta-item"><div class="eh-meta-label">From</div><div class="eh-meta-val">${fmt2(p.price)} / person</div></div>
            <div class="eh-meta-item"><div class="eh-meta-label">Duration</div><div class="eh-meta-val">${p.duration || '—'}</div></div>
            <div class="eh-meta-item"><div class="eh-meta-label">Best Time to Go</div><div class="eh-meta-val">${p.best_time || '—'}</div></div>
          </div>
          <div class="eh-actions">
            <button class="btn-primary btn-shine" style="border:none" onclick="bookTrip(${p.id}, '${(p.name||'').replace(/'/g,"\\'")}', '${(p.map_query||'').replace(/'/g,"\\'")}')">Book This Package</button>
            <a href="/#destinations" class="btn-ghost" style="border-color:rgba(255,255,255,.4)">More Destinations</a>
          </div>
        </div>
      </div>
    </section>

    <div class="explore-body">
      <div class="pkg-layout">
        <div class="pkg-main">
          ${highlights.length ? `
          <section class="explore-block" data-reveal>
            <div class="section-tag">Don't Miss</div>
            <h2>TOUR<br>HIGHLIGHTS</h2>
            <div class="eh-highlights">
              ${highlights.map((h, i) => `
                <div class="eh-highlight" data-reveal>
                  <div class="eh-highlight-num">${String(i + 1).padStart(2, '0')}</div>
                  <p>${h}</p>
                </div>`).join('')}
            </div>
          </section>` : ''}

          ${includes.length ? `
          <section class="explore-block" data-reveal>
            <div class="section-tag">What's Included</div>
            <h2>PACKAGE<br>INCLUDES</h2>
            <div class="eh-highlights">
              ${includes.map(inc => `
                <div class="eh-highlight" data-reveal>
                  <div class="eh-highlight-num">✓</div>
                  <p>${inc}</p>
                </div>`).join('')}
            </div>
          </section>` : ''}

          ${itinerary.length ? `
          <section class="explore-block" data-reveal>
            <div class="section-tag">Day By Day</div>
            <h2>TOUR<br>ITINERARY</h2>
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
          </section>` : ''}

          <section class="explore-block" data-reveal>
            <div class="eh-cta">
              <h3>Ready to book ${p.name}?</h3>
              <p>Tell us your dates — we'll handle flights, stays and every detail in between.</p>
              <button class="btn-primary btn-shine" style="border:none" onclick="bookTrip(${p.id}, '${(p.name||'').replace(/'/g,"\\'")}', '${(p.map_query||'').replace(/'/g,"\\'")}')">🐝 Book This Package</button>
            </div>
          </section>
        </div>

        <aside class="pkg-side" data-reveal>
          <div class="pkg-cta-card">
            <h4>Dream Vacation:<br>3 Steps Away!</h4>
            <ul class="pkg-steps-list">
              <li><span class="pkg-step-num">01</span> Tell us your dates &amp; headcount — the search bar on the homepage works, or just enquire directly.</li>
              <li><span class="pkg-step-num">02</span> We build your itinerary and get back to you with the details.</li>
              <li><span class="pkg-step-num">03</span> Approve, pay a deposit, and you're booked.</li>
            </ul>
            <button class="btn-primary" onclick="bookTrip(${p.id}, '${(p.name||'').replace(/'/g,"\\'")}', '${(p.map_query||'').replace(/'/g,"\\'")}')">Enquire Now</button>
          </div>
          ${mapEmbed ? `<div class="pkg-map-card">${mapEmbed}</div>` : ''}
        </aside>
      </div>
    </div>
  `;

  const destField = document.querySelector('#booking-form [name="destination"]');
  if (destField && p.map_query) destField.value = p.map_query;

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
}

// Same cursor-tilt hero effect as the destination explore page.
function initHeroParallax() {
  if (REDUCE_MOTION) return;
  const hero = document.getElementById('eh-hero');
  const stage = document.getElementById('eh-stage');
  if (!hero || !stage) return;
  let raf = null;
  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      stage.style.transform = `rotateX(${-py * 7}deg) rotateY(${px * 10}deg) scale(1.03)`;
    });
  });
  hero.addEventListener('mouseleave', () => {
    if (raf) cancelAnimationFrame(raf);
    stage.style.transform = 'rotateX(0) rotateY(0) scale(1)';
  });
}

async function initPackagePage() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return renderNotFound();
  playIrisIntro();
  try {
    const res = await fetch(`/api/packages/${id}`);
    if (!res.ok) return renderNotFound();
    renderPackage(await res.json());
  } catch (err) {
    renderNotFound();
  }
}

initPackagePage();
