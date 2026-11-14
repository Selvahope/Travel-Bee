// routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db/database');
const { clean, isEmail, isPhone, rateLimit } = require('../middleware/security');
const router  = express.Router();

const limiter = rateLimit(20, 10 * 60 * 1000);

// Only allow redirects back into this site (prevents open-redirect via ?next=)
const safeNext = (n) => (typeof n === 'string' && /^\/[A-Za-z0-9_\-\/?=&.%]*$/.test(n) && !n.startsWith('//')) ? n : null;

// POST /api/auth/register
router.post('/register', limiter, (req, res) => {
  const name  = clean(req.body.name, 80);
  const email = clean(req.body.email, 254).toLowerCase();
  const phone = clean(req.body.phone, 20);
  const password = String(req.body.password || '');

  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (phone && !isPhone(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (password.length > 100) return res.status(400).json({ error: 'Password is too long.' });

  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email))
    return res.status(409).json({ error: 'Email already registered. Please log in.' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)')
                   .run(name, email, hash, phone || null);

  // New session id on privilege change
  req.session.regenerate(() => {
    req.session.userId = result.lastInsertRowid;
    req.session.name   = name;
    req.session.role   = 'user';
    res.json({ success: true, message: 'Account created!', redirect: safeNext(req.body.next) || '/dashboard' });
  });
});

// POST /api/auth/login
router.post('/login', limiter, (req, res) => {
  const email = clean(req.body.email, 254).toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password.' });

  req.session.regenerate(() => {
    req.session.userId = user.id;
    req.session.name   = user.name;
    req.session.role   = user.role;
    const next = safeNext(req.body.next);
    const redirect = user.role === 'admin' ? (next && next.startsWith('/admin') ? next : '/admin') : (next && !next.startsWith('/admin') ? next : '/dashboard');
    res.json({ success: true, message: 'Welcome back, ' + user.name + '!', redirect });
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true, redirect: '/' }));
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  const u = db.prepare('SELECT name,email,phone,role,created_at FROM users WHERE id=?').get(req.session.userId);
  if (!u) return req.session.destroy(() => res.json({ loggedIn: false })); // account was deleted
  res.json({ loggedIn: true, name: u.name, email: u.email, phone: u.phone, role: u.role, since: u.created_at });
});

// PATCH /api/auth/profile — update own name / phone
router.patch('/profile', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Login required' });
  const name = clean(req.body.name, 80), phone = clean(req.body.phone, 20);
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  if (phone && !isPhone(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  db.prepare('UPDATE users SET name=?, phone=? WHERE id=?').run(name, phone || null, req.session.userId);
  req.session.name = name;
  res.json({ success: true });
});

module.exports = router;
