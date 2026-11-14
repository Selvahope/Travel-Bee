// routes/admin.js
const express = require('express');
const db      = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const router  = express.Router();

// GET /api/admin/stats
router.get('/stats', requireAdmin, (req, res) => {
  const c = (sql) => db.prepare(sql).get().c;
  const totalBookings     = c("SELECT COUNT(*) as c FROM bookings");
  const pendingBookings   = c("SELECT COUNT(*) as c FROM bookings WHERE status='pending'");
  const confirmedBookings = c("SELECT COUNT(*) as c FROM bookings WHERE status='confirmed'");
  const totalRevenue    = db.prepare("SELECT COALESCE(SUM(total_price),0) as r FROM bookings WHERE status IN ('confirmed','completed')").get().r;
  const totalUsers      = c("SELECT COUNT(*) as c FROM users WHERE role='user'");
  const newEnquiries    = c("SELECT COUNT(*) as c FROM contacts WHERE status='new'");
  const subscribers     = c("SELECT COUNT(*) as c FROM subscribers");
  const recentBookings  = db.prepare("SELECT * FROM bookings ORDER BY created_at DESC, id DESC LIMIT 5").all();
  const byStatus        = db.prepare("SELECT status, COUNT(*) as count FROM bookings GROUP BY status").all();
  const topDest         = db.prepare("SELECT destination, COUNT(*) as count FROM bookings GROUP BY destination ORDER BY count DESC LIMIT 5").all();
  res.json({ totalBookings, pendingBookings, confirmedBookings, totalRevenue, totalUsers, newEnquiries, subscribers, recentBookings, byStatus, topDest });
});

// GET /api/admin/users
router.get('/users', requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT id,name,email,phone,role,created_at FROM users ORDER BY created_at DESC, id DESC").all());
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  if (req.params.id == req.session.userId && role !== 'admin') return res.status(400).json({ error: "You can't remove your own admin access." });
  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  res.json({ success: true });
});

// DELETE /api/admin/users/:id — bookings are kept (user_id set to NULL) so revenue history isn't lost
router.delete('/users/:id', requireAdmin, (req, res) => {
  if (req.params.id == req.session.userId) return res.status(400).json({ error: "Cannot delete yourself." });
  db.transaction(() => {
    db.prepare('UPDATE bookings SET user_id=NULL WHERE user_id=?').run(req.params.id);
    db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  })();
  res.json({ success: true });
});

// GET /api/admin/contacts — enquiries from the Contact form
router.get('/contacts', requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM contacts ORDER BY created_at DESC, id DESC").all());
});
router.patch('/contacts/:id', requireAdmin, (req, res) => {
  const status = req.body.status;
  if (!['new', 'replied', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  db.prepare('UPDATE contacts SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});
router.delete('/contacts/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/admin/subscribers
router.get('/subscribers', requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM subscribers ORDER BY created_at DESC, id DESC").all());
});

module.exports = router;
