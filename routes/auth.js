// routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db/database');
const { guestOnly } = require('../middleware/auth');
const router  = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already registered.' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), email.toLowerCase(), hash, phone || null);

  req.session.userId = result.lastInsertRowid;
  req.session.name   = name.trim();
  req.session.role   = 'user';

  res.json({ success: true, message: 'Account created!', redirect: '/dashboard' });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password.' });

  req.session.userId = user.id;
  req.session.name   = user.name;
  req.session.role   = user.role;

  const redirect = user.role === 'admin' ? '/admin' : '/dashboard';
  res.json({ success: true, message: 'Welcome back, ' + user.name + '!', redirect });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true, redirect: '/' }));
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, name: req.session.name, role: req.session.role });
});

module.exports = router;
