// db/session-store.js — express-session store backed by MongoDB (works on serverless/Vercel).
const session = require('express-session');
const { getDb } = require('./mongo');

const DAY = 24 * 60 * 60 * 1000;

class MongoStore extends session.Store {
  _exp(sess) {
    const e = sess && sess.cookie && sess.cookie.expires;
    return e ? new Date(e) : new Date(Date.now() + 7 * DAY);
  }
  async _col() { return (await getDb()).collection('sessions'); }
  get(sid, cb) {
    this._col().then((c) => c.findOne({ _id: sid, expires: { $gt: new Date() } }))
      .then((row) => cb(null, row ? JSON.parse(row.sess) : null), cb);
  }
  set(sid, sess, cb) {
    this._col().then((c) => c.updateOne({ _id: sid }, { $set: { sess: JSON.stringify(sess), expires: this._exp(sess) } }, { upsert: true }))
      .then(() => cb && cb(null), (e) => cb && cb(e));
  }
  destroy(sid, cb) {
    this._col().then((c) => c.deleteOne({ _id: sid })).then(() => cb && cb(null), (e) => cb && cb(e));
  }
  touch(sid, sess, cb) {
    this._col().then((c) => c.updateOne({ _id: sid }, { $set: { expires: this._exp(sess) } }))
      .then(() => cb && cb(null), (e) => cb && cb(e));
  }
}

module.exports = MongoStore;
