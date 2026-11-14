// middleware/security.js — input cleaning, validation helpers, tiny rate limiter

// Strip anything that could be interpreted as HTML. Values are shown inside
// the admin panel with innerHTML, so a guest typing <script> in their name
// must never reach the DB as markup.
const clean = (v, max = 200) =>
  String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

// Multi-line variant for messages / notes (keeps line breaks).
const cleanText = (v, max = 1500) =>
  String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/\r/g, '').trim().slice(0, max);

const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;
const isPhone = (p) => { const d = String(p).replace(/\D/g, ''); return d.length >= 7 && d.length <= 15; };

// Fixed-window in-memory limiter: max `limit` hits per `windowMs` per IP+route.
function rateLimit(limit, windowMs) {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); }, windowMs).unref();
  return (req, res, next) => {
    const key = req.ip + '|' + req.baseUrl + req.path;
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset <= now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
    if (++h.n > limit) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
    next();
  };
}

module.exports = { clean, cleanText, isEmail, isPhone, rateLimit };
