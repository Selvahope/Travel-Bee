// db/session-store.js — express-session store backed by the same SQLite DB.
// Replaces the default MemoryStore (which forgets every login on restart and
// leaks memory in production).
const session = require('express-session');
const db = require('./database');

const get = db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expires > ?');
const set = db.prepare('INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires');
const del = db.prepare('DELETE FROM sessions WHERE sid = ?');
const touch = db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
const sweep = db.prepare('DELETE FROM sessions WHERE expires <= ?');

const DAY = 24 * 60 * 60 * 1000;

class SqliteStore extends session.Store {
  constructor() {
    super();
    sweep.run(Date.now());
    this._timer = setInterval(() => sweep.run(Date.now()), 60 * 60 * 1000);
    this._timer.unref();
  }
  _exp(sess) {
    const e = sess && sess.cookie && sess.cookie.expires;
    return e ? new Date(e).getTime() : Date.now() + 7 * DAY;
  }
  get(sid, cb) {
    try {
      const row = get.get(sid, Date.now());
      cb(null, row ? JSON.parse(row.sess) : null);
    } catch (e) { cb(e); }
  }
  set(sid, sess, cb) {
    try { set.run(sid, JSON.stringify(sess), this._exp(sess)); cb && cb(null); }
    catch (e) { cb && cb(e); }
  }
  destroy(sid, cb) {
    try { del.run(sid); cb && cb(null); } catch (e) { cb && cb(e); }
  }
  touch(sid, sess, cb) {
    try { touch.run(this._exp(sess), sid); cb && cb(null); } catch (e) { cb && cb(e); }
  }
}

module.exports = SqliteStore;
