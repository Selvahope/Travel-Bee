// routes/admin.js
const express = require('express');
const { getDb } = require('../db/mongo');
const ah = require('../middleware/async');
const { requireAdmin } = require('../middleware/auth');
const router  = express.Router();

const NO_ID = { projection: { _id: 0 } };
const SORT_NEW = { created_at: -1, id: -1 };
const intId = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };

// GET /api/admin/stats
router.get('/stats', requireAdmin, ah(async (req, res) => {
  const db = await getDb();
  const B = db.collection('bookings');
  let [totalBookings, pendingBookings, confirmedBookings, totalUsers, newEnquiries, subscribers,
         revenue, recentBookings, byStatus, topDest] = await Promise.all([
    B.countDocuments({}),
    B.countDocuments({ status: 'pending' }),
    B.countDocuments({ status: 'confirmed' }),
    db.collection('users').countDocuments({ role: 'user' }),
    db.collection('contacts').countDocuments({ status: 'new' }),
    db.collection('subscribers').countDocuments({}),
    B.aggregate([{ $match: { status: { $in: ['confirmed', 'completed'] } } }, { $group: { _id: null, r: { $sum: '$total_price' } } }]).toArray(),
    B.find({}, NO_ID).sort(SORT_NEW).limit(5).toArray(),
    B.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
    B.aggregate([{ $group: { _id: '$destination', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }]).toArray(),
  ]);
  byStatus = byStatus.map((x) => ({ status: x._id, count: x.count }));
  topDest  = topDest.map((x) => ({ destination: x._id, count: x.count }));
  res.json({ totalBookings, pendingBookings, confirmedBookings, totalRevenue: revenue[0] ? revenue[0].r : 0,
             totalUsers, newEnquiries, subscribers, recentBookings, byStatus, topDest });
}));

// GET /api/admin/users
router.get('/users', requireAdmin, ah(async (req, res) => {
  const db = await getDb();
  res.json(await db.collection('users').find({}, { projection: { _id: 0, password: 0 } }).sort(SORT_NEW).toArray());
}));

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', requireAdmin, ah(async (req, res) => {
  const { role } = req.body;
  const id = intId(req.params.id);
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  if (id === req.session.userId && role !== 'admin') return res.status(400).json({ error: "You can't remove your own admin access." });
  const db = await getDb();
  await db.collection('users').updateOne({ id }, { $set: { role } });
  res.json({ success: true });
}));

// DELETE /api/admin/users/:id — bookings are kept (user_id set to null) so revenue history isn't lost
router.delete('/users/:id', requireAdmin, ah(async (req, res) => {
  const id = intId(req.params.id);
  if (id === req.session.userId) return res.status(400).json({ error: 'Cannot delete yourself.' });
  const db = await getDb();
  await db.collection('bookings').updateMany({ user_id: id }, { $set: { user_id: null } });
  await db.collection('users').deleteOne({ id });
  res.json({ success: true });
}));

// GET /api/admin/contacts — enquiries from the Contact form
router.get('/contacts', requireAdmin, ah(async (req, res) => {
  const db = await getDb();
  res.json(await db.collection('contacts').find({}, NO_ID).sort(SORT_NEW).toArray());
}));
router.patch('/contacts/:id', requireAdmin, ah(async (req, res) => {
  const status = req.body.status;
  if (!['new', 'replied', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const db = await getDb();
  await db.collection('contacts').updateOne({ id: intId(req.params.id) }, { $set: { status } });
  res.json({ success: true });
}));
router.delete('/contacts/:id', requireAdmin, ah(async (req, res) => {
  const db = await getDb();
  await db.collection('contacts').deleteOne({ id: intId(req.params.id) });
  res.json({ success: true });
}));

// GET /api/admin/subscribers
router.get('/subscribers', requireAdmin, ah(async (req, res) => {
  const db = await getDb();
  res.json(await db.collection('subscribers').find({}, NO_ID).sort(SORT_NEW).toArray());
}));

module.exports = router;
