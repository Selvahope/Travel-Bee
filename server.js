// server.js — TravelBeey Express Server
const express        = require('express');
const session        = require('express-session');
const cors           = require('cors');
const path           = require('path');
const SqliteStore    = require('./db/session-store');

const app  = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // behind Render/Railway proxy
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ─────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
// Uploaded photos: persistent DATA_DIR when set, otherwise public/uploads
if (process.env.DATA_DIR) app.use('/uploads', express.static(path.join(process.env.DATA_DIR, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) console.warn('⚠️  Set SESSION_SECRET in production!');
app.use(session({
  store: new SqliteStore(),
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

// Central error handler — malformed JSON, upload errors etc. never leak stack traces
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  if (req.path.startsWith('/api')) return res.status(status).json({ error: status >= 500 ? 'Server error. Please try again.' : (err.message || 'Bad request.') });
  res.status(status).send('Something went wrong.');
});

// ── START ──────────────────────────────────────────────────────
// If the port is busy (e.g. an earlier copy is still running), try the next ports
// instead of crashing. On a host like Render, PORT is fixed, so we do not hop there.
const BASE_PORT = parseInt(PORT, 10) || 3000;
const MAX_TRIES = process.env.PORT ? 1 : 10;

function start(port, attempt = 1) {
  const server = app.listen(port, () => {
    console.log('');
    console.log('  🐝 TravelBeey server running!');
    console.log('  ─────────────────────────────────');
    console.log('  Local:   http://localhost:' + port);
    console.log('  Admin:   http://localhost:' + port + '/admin');
    console.log('  ─────────────────────────────────');
    console.log('  Admin login: admin@travelbeey.com / Admin@1234');
    console.log('');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (attempt < MAX_TRIES) {
        console.warn('⚠️  Port ' + port + ' is already in use, trying ' + (port + 1) + '...');
        return start(port + 1, attempt + 1);
      }
      console.error('❌ Port ' + port + ' is already in use. Stop the other process or set a different PORT, e.g.  PORT=4000 npm start');
      process.exit(1);
    }
    throw err;
  });
}

start(BASE_PORT);
