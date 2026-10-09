// routes/admin.js
const express = require('express');
const db      = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const router  = express.Router();

// GET /api/admin/stats
router.get('/stats', requireAdmin, (req, res) => {
  const totalBookings   = db.prepare("SELECT COUNT(*) as c FROM bookings").get().c;
  const pendingBookings = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='pending'").get().c;
  const confirmedBookings = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status='confirmed'").get().c;
  const totalRevenue    = db.prepare("SELECT COALESCE(SUM(total_price),0) as r FROM bookings WHERE status IN ('confirmed','completed')").get().r;
  const totalUsers      = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='user'").get().c;
  const recentBookings  = db.prepare("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5").all();
  const byStatus        = db.prepare("SELECT status, COUNT(*) as count FROM bookings GROUP BY status").all();
  const topDest         = db.prepare("SELECT destination, COUNT(*) as count FROM bookings GROUP BY destination ORDER BY count DESC LIMIT 5").all();

  res.json({ totalBookings, pendingBookings, confirmedBookings, totalRevenue, totalUsers, recentBookings, byStatus, topDest });
});

// GET /api/admin/users
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare("SELECT id,name,email,phone,role,created_at FROM users ORDER BY created_at DESC").all();
  res.json(users);
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['user','admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  res.json({ success: true });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAdmin, (req, res) => {
  if (req.params.id == req.session.userId) return res.status(400).json({ error: "Cannot delete yourself." });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
