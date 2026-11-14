// routes/packages.js
const express = require('express');
const multer  = require('multer');
const { ObjectId, Binary } = require('mongodb');
const { getDb, nextId } = require('../db/mongo');
const ah = require('../middleware/async');
const { requireAdmin } = require('../middleware/auth');
const router  = express.Router();

// Admin text is rendered with innerHTML in places, so strip angle brackets from every string field.
const S = (v) => (v == null ? '' : String(v).replace(/[<>]/g, '').trim());
const N = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : NaN; };
const intId = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };
const TIERS = ['starter', 'premium', 'adventure'];
const NO_ID = { projection: { _id: 0 } };

// ── PHOTO UPLOAD ───────────────────────────────────────────────
// Vercel's disk is read-only, so photos are stored inside MongoDB (collection "images")
// and served from /uploads/img/<id>. That path is saved in the image_file column, exactly
// like the old local-disk path, so the frontend needs no changes.
// Vercel limits request bodies to ~4.5MB, so uploads are capped at 4MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed.'));
    cb(null, true);
  }
});

// POST /api/packages/upload-image — admin, used by the destination & package photo dropzones
router.post('/upload-image', requireAdmin, (req, res, next) => {
  upload.single('photo')(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image is larger than 4MB.' : (err.message || 'Upload failed.') });
      if (!req.file) return res.status(400).json({ error: 'No file received.' });
      const db = await getDb();
      const r = await db.collection('images').insertOne({
        type: req.body.type === 'packages' ? 'packages' : 'destinations',
        contentType: req.file.mimetype, name: req.file.originalname.slice(0, 120),
        data: new Binary(req.file.buffer), created_at: new Date() });
      res.json({ success: true, path: `/uploads/img/${r.insertedId}` });
    } catch (e) { next(e); }
  });
});

// GET /uploads/img/:id — public image serving (mounted in server.js)
const imageRouter = express.Router();
imageRouter.get('/img/:id', ah(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(404).end();
  const db = await getDb();
  const img = await db.collection('images').findOne({ _id: new ObjectId(req.params.id) });
  if (!img) return res.status(404).end();
  res.set('Content-Type', img.contentType);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(Buffer.from(img.data.buffer));
}));
router.imageRouter = imageRouter;

// GET /api/packages — public
router.get('/', ah(async (req, res) => {
  const db = await getDb();
  res.json(await db.collection('packages').find({ active: 1 }, NO_ID).sort({ id: 1 }).toArray());
}));

// GET /api/destinations — public
router.get('/destinations', ah(async (req, res) => {
  const db = await getDb();
  res.json(await db.collection('destinations').find({ active: 1 }, NO_ID).sort({ id: 1 }).toArray());
}));

// GET /api/destinations/admin/all — admin (includes inactive, for the dashboard list)
// NOTE: must be declared before the /destinations/:id route below.
router.get('/destinations/admin/all', requireAdmin, ah(async (req, res) => {
  const db = await getDb();
  res.json(await db.collection('destinations').find({}, NO_ID).sort({ id: -1 }).toArray());
}));

// GET /api/destinations/:id — public (single destination for the explore page)
router.get('/destinations/:id', ah(async (req, res) => {
  const db = await getDb();
  const dest = await db.collection('destinations').findOne({ id: intId(req.params.id), active: 1 }, NO_ID);
  if (!dest) return res.status(404).json({ error: 'Destination not found.' });
  res.json(dest);
}));

// POST /api/destinations — admin
router.post('/destinations', requireAdmin, ah(async (req, res) => {
  const b = req.body, price_from = N(b.price_from);
  if (!S(b.name) || !S(b.country) || !(price_from > 0)) return res.status(400).json({ error: 'Name, state and a valid starting price are required.' });
  const db = await getDb();
  const id = await nextId('destinations');
  await db.collection('destinations').insertOne({
    id, name: S(b.name), country: S(b.country), emoji: S(b.emoji) || '✈️', price_from, badge: S(b.badge),
    description: S(b.description), highlights: S(b.highlights), gallery: S(b.gallery), duration: S(b.duration),
    best_time: S(b.best_time), image_file: S(b.image_file), itinerary: S(b.itinerary), active: 1 });
  res.json({ success: true, id });
}));

// PUT /api/destinations/:id — admin
router.put('/destinations/:id', requireAdmin, ah(async (req, res) => {
  const b = req.body, price_from = N(b.price_from);
  if (!S(b.name) || !S(b.country) || !(price_from > 0)) return res.status(400).json({ error: 'Name, state and a valid starting price are required.' });
  const db = await getDb();
  const r = await db.collection('destinations').updateOne({ id: intId(req.params.id) }, { $set: {
    name: S(b.name), country: S(b.country), emoji: S(b.emoji) || '✈️', price_from, badge: S(b.badge),
    description: S(b.description), highlights: S(b.highlights), gallery: S(b.gallery), duration: S(b.duration),
    best_time: S(b.best_time), image_file: S(b.image_file), itinerary: S(b.itinerary),
    active: b.active !== undefined ? (b.active ? 1 : 0) : 1 } });
  if (!r.matchedCount) return res.status(404).json({ error: 'Destination not found.' });
  res.json({ success: true });
}));

// DELETE /api/destinations/:id — admin (soft delete, same pattern as packages)
router.delete('/destinations/:id', requireAdmin, ah(async (req, res) => {
  const db = await getDb();
  await db.collection('destinations').updateOne({ id: intId(req.params.id) }, { $set: { active: 0 } });
  res.json({ success: true });
}));

// GET /api/packages/:id — public (single package, for the package detail page)
router.get('/:id(\\d+)', ah(async (req, res) => {
  const db = await getDb();
  const pkg = await db.collection('packages').findOne({ id: intId(req.params.id), active: 1 }, NO_ID);
  if (!pkg) return res.status(404).json({ error: 'Package not found.' });
  res.json(pkg);
}));

// POST /api/packages — admin
router.post('/', requireAdmin, ah(async (req, res) => {
  const b = req.body, price = N(b.price);
  if (!S(b.name) || !(price > 0)) return res.status(400).json({ error: 'Name and a valid price are required.' });
  const db = await getDb();
  const id = await nextId('packages');
  await db.collection('packages').insertOne({
    id, name: S(b.name), tier: TIERS.includes(b.tier) ? b.tier : 'starter', description: S(b.description), price,
    duration: S(b.duration), includes: S(b.includes), image_file: S(b.image_file), highlights: S(b.highlights),
    itinerary: S(b.itinerary), best_time: S(b.best_time), map_query: S(b.map_query), active: 1 });
  res.json({ success: true, id });
}));

// PUT /api/packages/:id — admin
router.put('/:id', requireAdmin, ah(async (req, res) => {
  const b = req.body, price = N(b.price);
  if (!S(b.name) || !(price > 0)) return res.status(400).json({ error: 'Name and a valid price are required.' });
  const db = await getDb();
  const r = await db.collection('packages').updateOne({ id: intId(req.params.id) }, { $set: {
    name: S(b.name), tier: TIERS.includes(b.tier) ? b.tier : 'starter', description: S(b.description), price,
    duration: S(b.duration), includes: S(b.includes), active: b.active !== undefined ? (b.active ? 1 : 0) : 1,
    image_file: S(b.image_file), highlights: S(b.highlights), itinerary: S(b.itinerary),
    best_time: S(b.best_time), map_query: S(b.map_query) } });
  if (!r.matchedCount) return res.status(404).json({ error: 'Package not found.' });
  res.json({ success: true });
}));

// DELETE /api/packages/:id — admin
router.delete('/:id', requireAdmin, ah(async (req, res) => {
  const db = await getDb();
  await db.collection('packages').updateOne({ id: intId(req.params.id) }, { $set: { active: 0 } });
  res.json({ success: true });
}));

module.exports = router;
