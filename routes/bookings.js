// routes/bookings.js
const express = require('express');
const { getDb, nextId, now } = require('../db/mongo');
const ah = require('../middleware/async');
const { requireLogin, requireAdmin } = require('../middleware/auth');
const { clean, cleanText, isEmail, isPhone, rateLimit } = require('../middleware/security');
const router  = express.Router();

const CHILD_RATE = 0.75; // children (2–11 yrs) pay 75% of the adult per-person price
const NO_ID = { projection: { _id: 0 } };
const SORT_NEW = { created_at: -1, id: -1 };
const intId = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function genRef() {
  return 'TBY-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
}

// Turn "2 Adults + 1 Child" / "Group (6+)" (older forms) into numbers.
function parseTravellers(str) {
  const s = String(str || '');
  const a = s.match(/(\d+)\s*Adult/i), c = s.match(/(\d+)\s*Child/i);
  if (a || c) return { adults: a ? +a[1] : 1, children: c ? +c[1] : 0 };
  if (/group/i.test(s)) return { adults: 6, children: 0 };
  return { adults: 1, children: 0 };
}
function travellersLabel(adults, children) {
  return `${adults} Adult${adults > 1 ? 's' : ''}` + (children ? ` + ${children} Child${children > 1 ? 'ren' : ''}` : '');
}

// POST /api/bookings — guests and logged-in users
router.post('/', rateLimit(15, 10 * 60 * 1000), ah(async (req, res) => {
  const b = req.body || {};
  const guest_name  = clean(b.guest_name, 80);
  const guest_email = clean(b.guest_email, 254).toLowerCase();
  const guest_phone = clean(b.guest_phone, 20);
  const destination = clean(b.destination, 120);
  const from_city   = clean(b.from_city, 60) || null;
  const travel_date = clean(b.travel_date, 10);
  const notes       = cleanText(b.notes, 1000) || null;

  if (!guest_name || !guest_email || !guest_phone || !destination || !b.package_id || !travel_date)
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  if (!isEmail(guest_email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!isPhone(guest_phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(travel_date) || isNaN(Date.parse(travel_date)))
    return res.status(400).json({ error: 'Please choose a valid travel date.' });
  if (travel_date < new Date().toISOString().slice(0, 10))
    return res.status(400).json({ error: 'Travel date cannot be in the past.' });

  let adults, children;
  if (b.adults !== undefined) { adults = parseInt(b.adults, 10); children = parseInt(b.children || 0, 10); }
  else ({ adults, children } = parseTravellers(b.travellers));
  if (!Number.isInteger(adults) || adults < 1 || adults > 20 || !Number.isInteger(children) || children < 0 || children > 10)
    return res.status(400).json({ error: 'Travellers: 1–20 adults and up to 10 children.' });

  const db = await getDb();
  const pkg = await db.collection('packages').findOne({ id: intId(b.package_id), active: 1 });
  if (!pkg) return res.status(404).json({ error: 'That package is no longer available.' });

  // whole-rupee unit prices (same as the booking card in public/js/site.js) so the shown lines add up to the total
  const total = Math.round(pkg.price) * adults + Math.round(pkg.price * CHILD_RATE) * children;
  const ref = genRef();
  const id = await nextId('bookings');
  const ts = now();
  await db.collection('bookings').insertOne({
    id, ref, user_id: req.session.userId || null, guest_name, guest_email, guest_phone, destination,
    package_id: pkg.id, package_name: pkg.name, travel_date, travellers: travellersLabel(adults, children),
    adults, children, from_city, total_price: total, status: 'pending', notes, created_at: ts, updated_at: null });

  res.json({ success: true, ref, bookingId: id, total_price: total,
             message: 'Booking request received! Our team will contact you within 2 hours.' });
}));

// GET /api/bookings/my — own bookings (linked by account OR by the email used while booking as guest)
router.get('/my', requireLogin, ah(async (req, res) => {
  const db = await getDb();
  const u = await db.collection('users').findOne({ id: req.session.userId });
  const rows = await db.collection('bookings')
    .find({ $or: [{ user_id: req.session.userId }, { guest_email: u ? u.email : '' }] }, NO_ID).sort(SORT_NEW).toArray();
  const pkgs = await db.collection('packages').find({ id: { $in: [...new Set(rows.map((r) => r.package_id))] } }, NO_ID).toArray();
  const byId = new Map(pkgs.map((p) => [p.id, p]));
  res.json(rows.map((r) => ({ ...r, tier: byId.get(r.package_id)?.tier ?? null, package_image: byId.get(r.package_id)?.image_file ?? null })));
}));

// PATCH /api/bookings/:id/cancel — a customer cancels their own booking
router.patch('/:id(\\d+)/cancel', requireLogin, ah(async (req, res) => {
  const db = await getDb();
  const u = await db.collection('users').findOne({ id: req.session.userId });
  const bk = await db.collection('bookings').findOne({ id: intId(req.params.id), $or: [{ user_id: req.session.userId }, { guest_email: u ? u.email : '' }] });
  if (!bk) return res.status(404).json({ error: 'Booking not found.' });
  if (!['pending', 'confirmed'].includes(bk.status)) return res.status(400).json({ error: `A ${bk.status} booking cannot be cancelled.` });
  await db.collection('bookings').updateOne({ id: bk.id }, { $set: { status: 'cancelled', updated_at: now() } });
  res.json({ success: true });
}));

// GET /api/bookings/track?ref=…&email=… — guests look up a booking; needs BOTH ref and the booking email
router.get('/track', rateLimit(30, 10 * 60 * 1000), ah(async (req, res) => {
  const ref = clean(req.query.ref, 40).toUpperCase();
  const email = clean(req.query.email, 254).toLowerCase();
  const db = await getDb();
  const bk = await db.collection('bookings').findOne({ ref, guest_email: email },
    { projection: { _id: 0, ref: 1, guest_name: 1, destination: 1, package_name: 1, travel_date: 1, travellers: 1, total_price: 1, status: 1, created_at: 1 } });
  if (!bk) return res.status(404).json({ error: 'No booking found for that reference and email.' });
  res.json(bk);
}));

// GET /api/bookings — admin all
router.get('/', requireAdmin, ah(async (req, res) => {
  const { status, search } = req.query;
  const q = {};
  if (status) q.status = String(status);
  if (search) {
    const re = new RegExp(escRe(String(search).slice(0, 100)), 'i');
    q.$or = [{ guest_name: re }, { guest_email: re }, { ref: re }, { destination: re }];
  }
  const db = await getDb();
  res.json(await db.collection('bookings').find(q, NO_ID).sort(SORT_NEW).toArray());
}));

// PATCH /api/bookings/:id/status — admin
router.patch('/:id(\\d+)/status', requireAdmin, ah(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const db = await getDb();
  const r = await db.collection('bookings').updateOne({ id: intId(req.params.id) }, { $set: { status, updated_at: now() } });
  if (!r.matchedCount) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ success: true });
}));

// DELETE /api/bookings/:id — admin
router.delete('/:id(\\d+)', requireAdmin, ah(async (req, res) => {
  const db = await getDb();
  await db.collection('bookings').deleteOne({ id: intId(req.params.id) });
  res.json({ success: true });
}));

module.exports = router;
