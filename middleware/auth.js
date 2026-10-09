// middleware/auth.js

exports.requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(401).json({ error: 'Login required' });
    }
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  next();
};

exports.requireAdmin = (req, res, next) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return res.redirect('/login?next=/admin');
  }
  next();
};

exports.guestOnly = (req, res, next) => {
  if (req.session.userId) return res.redirect('/dashboard');
  next();
};
