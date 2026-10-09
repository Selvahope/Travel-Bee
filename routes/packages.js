// routes/packages.js
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const router  = express.Router();

// ── PHOTO UPLOAD (drag & drop / file picker in the admin panel) ─
// Files are saved under public/uploads/<type> and served statically by
// server.js's express.static('public'). We store the resulting web path
// (e.g. "/uploads/destinations/169...-santorini.jpg") in the image_file
// column — the same column that used to hold a Wikimedia Commons file title,
// so wikiImg() on the frontend just needs to tell the two apart (see main.js).
// Shared by both the destination and package admin forms; a "type" field in
// the upload determines the subfolder (defaults to "destinations" so older
// clients that don't send it keep working).
const uploadRoot = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(path.join(uploadRoot, 'destinations'), { recursive: true });
fs.mkdirSync(path.join(uploadRoot, 'packages'), { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = (req.body.type === 'packages') ? 'packages' : 'destinations';
    cb(null, path.join(uploadRoot, type));
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed.'));
    cb(null, true);
  }
});

// POST /api/packages/upload-image — admin, used by the destination & package photo dropzones
router.post('/upload-image', requireAdmin, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed.' });
    if (!req.file) return res.status(400).json({ error: 'No file received.' });
    const type = (req.body.type === 'packages') ? 'packages' : 'destinations';
    res.json({ success: true, path: `/uploads/${type}/${req.file.filename}` });
  });
});

// GET /api/packages — public
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM packages WHERE active=1').all());
});

// GET /api/destinations — public
router.get('/destinations', (req, res) => {
  res.json(db.prepare('SELECT * FROM destinations WHERE active=1').all());
});

// GET /api/admin/destinations — admin (includes inactive, for the dashboard list)
// NOTE: must be declared before the /destinations/:id route below, otherwise
// Express would match "admin" as the :id param and this route would never fire.
router.get('/destinations/admin/all', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM destinations ORDER BY id DESC').all());
});

// GET /api/destinations/:id — public (single destination for the explore page)
router.get('/destinations/:id', (req, res) => {
  const dest = db.prepare('SELECT * FROM destinations WHERE id=? AND active=1').get(req.params.id);
  if (!dest) return res.status(404).json({ error: 'Destination not found.' });
  res.json(dest);
});

// POST /api/destinations — admin
router.post('/destinations', requireAdmin, (req, res) => {
  const { name, country, emoji, price_from, badge, description, highlights, gallery, duration, best_time, image_file, itinerary } = req.body;
  if (!name || !country || !price_from) return res.status(400).json({ error: 'Name, country and starting price are required.' });
  const r = db.prepare(`
    INSERT INTO destinations (name,country,emoji,price_from,badge,description,highlights,gallery,duration,best_time,image_file,itinerary)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(name, country, emoji||'✈️', price_from, badge||'', description||'', highlights||'', gallery||'', duration||'', best_time||'', image_file||'', itinerary||'');
  res.json({ success: true, id: r.lastInsertRowid });
});

// PUT /api/destinations/:id — admin
router.put('/destinations/:id', requireAdmin, (req, res) => {
  const { name, country, emoji, price_from, badge, description, highlights, gallery, duration, best_time, image_file, itinerary, active } = req.body;
  db.prepare(`
    UPDATE destinations SET name=?,country=?,emoji=?,price_from=?,badge=?,description=?,highlights=?,gallery=?,duration=?,best_time=?,image_file=?,itinerary=?,active=?
    WHERE id=?
  `).run(name, country, emoji||'✈️', price_from, badge||'', description||'', highlights||'', gallery||'', duration||'', best_time||'', image_file||'', itinerary||'', active!==undefined?active:1, req.params.id);
  res.json({ success: true });
});

// DELETE /api/destinations/:id — admin (soft delete, same pattern as packages)
router.delete('/destinations/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE destinations SET active=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/packages/:id — public (single package, for the package detail page)
// Registered after all /destinations routes above so "destinations" is never
// swallowed by this :id wildcard.
router.get('/:id(\\d+)', (req, res) => {
  const pkg = db.prepare('SELECT * FROM packages WHERE id=? AND active=1').get(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Package not found.' });
  res.json(pkg);
});

// POST /api/packages — admin
router.post('/', requireAdmin, (req, res) => {
  const { name, tier, description, price, duration, includes, image_file, highlights, itinerary, best_time, map_query } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Name and price required.' });
  const r = db.prepare(`
    INSERT INTO packages (name,tier,description,price,duration,includes,image_file,highlights,itinerary,best_time,map_query)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(name, tier||'starter', description||'', price, duration||'', includes||'', image_file||'', highlights||'', itinerary||'', best_time||'', map_query||'');
  res.json({ success: true, id: r.lastInsertRowid });
});

// PUT /api/packages/:id — admin
router.put('/:id', requireAdmin, (req, res) => {
  const { name, tier, description, price, duration, includes, active, image_file, highlights, itinerary, best_time, map_query } = req.body;
  db.prepare(`
    UPDATE packages SET name=?,tier=?,description=?,price=?,duration=?,includes=?,active=?,image_file=?,highlights=?,itinerary=?,best_time=?,map_query=?
    WHERE id=?
  `).run(name, tier, description, price, duration, includes, active!==undefined?active:1, image_file||'', highlights||'', itinerary||'', best_time||'', map_query||'', req.params.id);
  res.json({ success: true });
});

// DELETE /api/packages/:id — admin
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE packages SET active=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
