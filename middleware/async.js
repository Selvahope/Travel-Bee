// Express 4 doesn't catch rejected promises — wrap async handlers so errors reach the error handler.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
