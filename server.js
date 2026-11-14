// server.js — TravelBeey Express app (runs locally with `npm start` and on Vercel via api/index.js)
try { process.loadEnvFile && process.loadEnvFile('.env'); } catch (e) { /* no .env file — fine on Vercel/Render */ }

const express     = require('express');
const session     = require('express-session');
const cors        = require('cors');
const path        = require('path');
const MongoStore  = require('./db/session-store');
const { getDb }   = require('./db/mongo');

const app  = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // behind Vercel/Render proxy (needed for secure cookies)
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ─────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Uploaded photos live in MongoDB and are served from /uploads/img/<id>
app.use('/uploads', require('./routes/packages').imageRouter);

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) console.warn('⚠️  Set SESSION_SECRET in production!');
app.use(session({
  store: new MongoStore(),
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
app.use('/api',          require('./routes/contact'));

// ── PAGE ROUTES (serve HTML files from public/) ───────────────
const pages = ['/', '/login', '/register', '/dashboard', '/admin', '/explore', '/package', '/contact', '/track'];
pages.forEach(p => {
  const file = p === '/' ? 'index' : p.slice(1);
  app.get(p, (req, res) => res.sendFile(path.join(__dirname, 'public', file + '.html')));
});

// API 404s return JSON, not an HTML page
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// 404 fallback
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// Central error handler — malformed JSON, upload errors, DB errors never leak stack traces
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  if (req.path.startsWith('/api')) return res.status(status).json({ error: status >= 500 ? 'Server error. Please try again.' : (err.message || 'Bad request.') });
  res.status(status).send('Something went wrong.');
});

module.exports = app;

// ── START (local / Render only — Vercel imports the app instead) ──
if (require.main === module) {
  getDb().then(() => {
    const BASE_PORT = parseInt(PORT, 10) || 3000;
    const MAX_TRIES = process.env.PORT ? 1 : 10;
    (function start(port, attempt = 1) {
      const server = app.listen(port, () => {
        console.log('');
        console.log('  🐝 TravelBeey server running!');
        console.log('  ─────────────────────────────────');
        console.log('  Local:   http://localhost:' + port);
        console.log('  Admin:   http://localhost:' + port + '/admin');
        console.log('  ─────────────────────────────────');
        console.log('  Admin login: admin@travelbeey.com / Admin@1234  (change it!)');
        console.log('');
      });
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && attempt < MAX_TRIES) {
          console.warn('⚠️  Port ' + port + ' is already in use, trying ' + (port + 1) + '...');
          return start(port + 1, attempt + 1);
        }
        if (err.code === 'EADDRINUSE') { console.error('❌ Port ' + port + ' is already in use.'); process.exit(1); }
        throw err;
      });
    })(BASE_PORT);
  }).catch((e) => { console.error('❌ Could not connect to MongoDB:', e.message); process.exit(1); });
}
