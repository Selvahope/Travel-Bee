// routes/contact.js — contact-us enquiries + newsletter signups (both stored in MongoDB)
const express = require('express');
const { getDb, nextId, now } = require('../db/mongo');
const ah = require('../middleware/async');
const { clean, cleanText, isEmail, isPhone, rateLimit } = require('../middleware/security');
const router  = express.Router();

// POST /api/contact
router.post('/contact', rateLimit(8, 10 * 60 * 1000), ah(async (req, res) => {
  const name = clean(req.body.name, 80), email = clean(req.body.email, 254).toLowerCase();
  const phone = clean(req.body.phone, 20), subject = clean(req.body.subject, 120);
  const message = cleanText(req.body.message, 2000);
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message are required.' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (phone && !isPhone(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  const db = await getDb();
  await db.collection('contacts').insertOne({ id: await nextId('contacts'), name, email, phone: phone || null, subject: subject || null, message, status: 'new', created_at: now() });
  res.json({ success: true, message: 'Thanks! Our travel experts will get back to you shortly.' });
}));

// POST /api/newsletter
router.post('/newsletter', rateLimit(10, 10 * 60 * 1000), ah(async (req, res) => {
  const email = clean(req.body.email, 254).toLowerCase();
  if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  const db = await getDb();
  const exists = await db.collection('subscribers').findOne({ email });
  if (!exists) {
    try { await db.collection('subscribers').insertOne({ id: await nextId('subscribers'), email, created_at: now() }); }
    catch (e) { if (e.code !== 11000) throw e; }
  }
  res.json({ success: true, message: "You're subscribed! Deals are on their way." });
}));

module.exports = router;
