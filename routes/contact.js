// routes/contact.js — contact-us enquiries + newsletter signups (both stored in the DB)
const express = require('express');
const db      = require('../db/database');
const { clean, cleanText, isEmail, isPhone, rateLimit } = require('../middleware/security');
const router  = express.Router();

// POST /api/contact
router.post('/contact', rateLimit(8, 10 * 60 * 1000), (req, res) => {
  const name = clean(req.body.name, 80), email = clean(req.body.email, 254).toLowerCase();
  const phone = clean(req.body.phone, 20), subject = clean(req.body.subject, 120);
  const message = cleanText(req.body.message, 2000);
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message are required.' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (phone && !isPhone(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  db.prepare('INSERT INTO contacts (name,email,phone,subject,message) VALUES (?,?,?,?,?)').run(name, email, phone || null, subject || null, message);
  res.json({ success: true, message: 'Thanks! Our travel experts will get back to you shortly.' });
});

// POST /api/newsletter
router.post('/newsletter', rateLimit(10, 10 * 60 * 1000), (req, res) => {
  const email = clean(req.body.email, 254).toLowerCase();
  if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  db.prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)').run(email);
  res.json({ success: true, message: "You're subscribed! Deals are on their way." });
});

module.exports = router;
