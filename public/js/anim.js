// anim.js — shared entrance / scroll-reveal / 3D-tilt engine
// Loaded on every page (index, explore, dashboard, admin, login, register, 404)
// so the whole site shares one consistent animation language instead of the
// homepage being the only "alive" page.

const REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── SITE PRELOADER (generic — works with or without a data-hero-preload image) ──
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
  const imgReady = new Promise(resolve => {
    if (!heroImg || heroImg.complete) return resolve();
    heroImg.addEventListener('load', resolve, { once: true });
    heroImg.addEventListener('error', resolve, { once: true });
  });
  Promise.all([
    imgReady,
    new Promise(r => window.addEventListener('load', r, { once: true })),
    new Promise(r => setTimeout(r, 420)), // minimum dwell so it never just flashes
  ]).then(finish);
  setTimeout(finish, 2800); // hard safety cap
})();

// ── SCROLL REVEAL ──────────────────────────────────────────────
// Add class="reveal" (fade+rise) or class="reveal-stagger" to a *container*
// whose direct children should cascade in one after another. Re-runnable —
// call window.refreshAnimations() after injecting new DOM (dashboard/admin
// lists load asynchronously).
function initReveal() {
  const solo = Array.from(document.querySelectorAll('.reveal:not(.rv-bound)'));
  // Only bind a stagger container once it actually has children to reveal —
  // an empty container (e.g. a grid still waiting on an async fetch) must
  // stay unbound so its cards get picked up once they're actually injected.
  const staggerParents = Array.from(document.querySelectorAll('.reveal-stagger:not(.rv-bound)'))
    .filter(p => p.children.length > 0);
  const staggerKids = staggerParents.flatMap(p => Array.from(p.children));
  staggerParents.forEach(p => p.classList.add('rv-bound'));
  solo.forEach(el => el.classList.add('rv-bound'));
  const targets = solo.concat(staggerKids);
  if (!targets.length) return;
  if (REDUCE_MOTION) {
    targets.forEach(el => el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
      if (!entry.isIntersecting) return;
      const parent = entry.target.parentElement;
      const isStaggered = parent && parent.classList.contains('reveal-stagger');
      if (isStaggered) {
        const siblings = Array.from(parent.children);
        entry.target.style.transitionDelay = (siblings.indexOf(entry.target) * 70) + 'ms';
      }
      entry.target.classList.add('in-view');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(el => io.observe(el));
  // Safety net: if anything is somehow never intersected (zero-height
  // container, observer edge case, etc.) force it visible after 3s rather
  // than leaving content permanently invisible.
  setTimeout(() => {
    targets.forEach(el => { if (!el.classList.contains('in-view')) el.classList.add('in-view'); });
  }, 3000);
}

// ── GENERIC 3D CURSOR-TILT ─────────────────────────────────────
// Add data-tilt to any card. Optional data-tilt-strength (default 12).
function initTilt(root = document) {
  if (REDUCE_MOTION) return;
  root.querySelectorAll('[data-tilt]:not([data-tilt-bound])').forEach(card => {
    card.setAttribute('data-tilt-bound', '1');
    const strength = Number(card.dataset.tiltStrength) || 12;
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotY = (x - 0.5) * strength;
      const rotX = -(y - 0.5) * strength;
      card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-5px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

// ── COUNT-UP NUMBERS ────────────────────────────────────────────
// Add data-count="1234" and the element's text animates from 0 → 1234 the
// first time it scrolls into view. Optional data-prefix / data-suffix.
function initCountUp(root = document) {
  const els = root.querySelectorAll('[data-count]:not([data-count-bound])');
  if (!els.length) return;
  const run = (el) => {
    el.setAttribute('data-count-bound', '1');
    const raw = el.dataset.count || '0';
    const target = Number(raw) || 0;
    const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const format = (n) => decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString('en-IN');
    if (REDUCE_MOTION) { el.textContent = prefix + format(target) + suffix; return; }
    const dur = 900;
    const start = performance.now();
    function tick(t) {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + format(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };
  if (REDUCE_MOTION) { els.forEach(run); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
    });
  }, { threshold: 0.4 });
  els.forEach(el => io.observe(el));
}

// ── FLOATING PARALLAX ORBS (auth pages, 404) ────────────────────
// Any element with class="parallax-float" drifts opposite the cursor for a
// subtle sense of depth — same "orb" language as the homepage hero.
function initParallaxFloat(root = document) {
  if (REDUCE_MOTION) return;
  const layer = root.querySelector('[data-parallax-layer]');
  if (!layer) return;
  const items = layer.querySelectorAll('.parallax-float');
  if (!items.length) return;
  window.addEventListener('mousemove', (e) => {
    const cx = e.clientX / window.innerWidth - 0.5;
    const cy = e.clientY / window.innerHeight - 0.5;
    items.forEach(el => {
      const depth = Number(el.dataset.depth) || 20;
      el.style.transform = `translate3d(${cx * depth}px, ${cy * depth}px, 0)`;
    });
  });
}

// ── SIDEBAR / TABLE ENTRANCE (dashboard + admin) ────────────────
function initDashEntrance() {
  const nav = document.querySelector('.sidebar-nav');
  if (nav && !nav.classList.contains('sb-bound')) {
    nav.classList.add('sb-bound');
    Array.from(nav.children).forEach((a, i) => {
      a.style.setProperty('--sb-delay', (i * 60) + 'ms');
      a.classList.add('sb-item');
    });
  }
}

// ── REFRESH (call after async content injection) ────────────────
function refreshAnimations() {
  initReveal();
  initTilt();
  initCountUp();
  initDashEntrance();
}
window.refreshAnimations = refreshAnimations;

document.addEventListener('DOMContentLoaded', () => {
  refreshAnimations();
  initParallaxFloat();
});
