// server.js — TravelBeey Express Server
const express        = require('express');
const session        = require('express-session');
const cors           = require('cors');
const path           = require('path');

const app  = express();
app.set('trust proxy', 1); // behind Render/Railway proxy
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ─────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Uploaded photos: persistent DATA_DIR when set, otherwise public/uploads
if (process.env.DATA_DIR) app.use('/uploads', express.static(path.join(process.env.DATA_DIR, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'travelbeey-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' } // 7 days
}));

// ── API ROUTES ─────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/admin',    require('./routes/admin'));

// ── PAGE ROUTES (serve HTML files from public/) ───────────────
const pages = ['/', '/login', '/register', '/dashboard', '/admin', '/booking', '/explore', '/package'];
pages.forEach(p => {
  const file = p === '/' ? 'index' : p.slice(1);
  app.get(p, (req, res) => res.sendFile(path.join(__dirname, 'public', file + '.html')));
});

// 404 fallback
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// ── START ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  🐝 TravelBeey server running!');
  console.log('  ─────────────────────────────────');
  console.log('  Local:   http://localhost:' + PORT);
  console.log('  Admin:   http://localhost:' + PORT + '/admin');
  console.log('  ─────────────────────────────────');
  console.log('  Admin login: admin@travelbeey.com / Admin@1234');
  console.log('');
});
