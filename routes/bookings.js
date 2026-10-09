// routes/bookings.js
const express = require('express');
const db      = require('../db/database');
const { requireLogin, requireAdmin } = require('../middleware/auth');
const router  = express.Router();

function genRef() {
  return 'TBY-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,5).toUpperCase();
}

// POST /api/bookings
router.post('/', (req, res) => {
  const { guest_name, guest_email, guest_phone, destination, package_id, travel_date, travellers, notes } = req.body;
  if (!guest_name || !guest_email || !guest_phone || !destination || !package_id || !travel_date || !travellers)
    return res.status(400).json({ error: 'All required fields must be filled.' });

  const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(package_id);
  if (!pkg) return res.status(404).json({ error: 'Package not found.' });

  const ref = genRef();
  const result = db.prepare(
    'INSERT INTO bookings (ref,user_id,guest_name,guest_email,guest_phone,destination,package_id,package_name,travel_date,travellers,total_price,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  ).run(ref, req.session.userId||null, guest_name.trim(), guest_email.toLowerCase(), guest_phone.trim(), destination.trim(), package_id, pkg.name, travel_date, travellers, pkg.price, notes||null);

  res.json({ success: true, ref, bookingId: result.lastInsertRowid, message: 'Booking submitted! Our team will contact you within 2 hours.' });
});

// GET /api/bookings/my
router.get('/my', requireLogin, (req, res) => {
  const rows = db.prepare('SELECT b.*, p.tier FROM bookings b LEFT JOIN packages p ON b.package_id=p.id WHERE b.user_id=? ORDER BY b.created_at DESC').all(req.session.userId);
  res.json(rows);
});

// GET /api/bookings — admin all
router.get('/', requireAdmin, (req, res) => {
  const { status, search } = req.query;
  let sql = 'SELECT * FROM bookings WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status=?'; params.push(status); }
  if (search)  { const s='%'+search+'%'; sql += ' AND (guest_name LIKE ? OR guest_email LIKE ? OR ref LIKE ? OR destination LIKE ?)'; params.push(s,s,s,s); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// PATCH /api/bookings/:id/status
router.patch('/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!['pending','confirmed','cancelled','completed'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  db.prepare('UPDATE bookings SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});

// DELETE /api/bookings/:id
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM bookings WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/bookings/:ref
router.get('/:ref', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE ref=?').get(req.params.ref);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  res.json(booking);
});

module.exports = router;
