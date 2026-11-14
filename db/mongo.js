// db/mongo.js — MongoDB connection (cached for serverless), counters, indexes and seed data.
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { seedPackages, seedDestinations, pkgDetails, destDetails } = require('./seed-data');

const DB_NAME = process.env.MONGODB_DB || 'travelbeey';

// Reuse one client across warm serverless invocations.
let cache = global.__tbyMongo;
if (!cache) cache = global.__tbyMongo = { client: null, promise: null, ready: null };

// SQLite-style UTC timestamp: "YYYY-MM-DD HH:MM:SS" (the frontend already expects this shape)
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

async function connect() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set. Add your MongoDB Atlas connection string to the environment.');
  if (!cache.promise) {
    const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
    cache.promise = client.connect().then(() => client).catch((e) => { cache.promise = null; throw e; });
  }
  cache.client = await cache.promise;
  return cache.client.db(DB_NAME);
}

// Auto-increment integer ids (keeps the existing frontend, which uses numeric ids, unchanged)
async function nextId(name) {
  const db = await connect();
  const r = await db.collection('counters').findOneAndUpdate(
    { _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return (r && r.value ? r.value.seq : r.seq);
}

async function seed(db) {
  // Packages & destinations: fixed ids + upsert => safe even if two cold starts seed at once
  if ((await db.collection('packages').countDocuments({}, { limit: 1 })) === 0) {
    for (let i = 0; i < seedPackages.length; i++) {
      const [name, tier, description, price, duration, includes] = seedPackages[i];
      const d = pkgDetails[name] || {};
      await db.collection('packages').updateOne({ id: i + 1 }, { $setOnInsert: {
        id: i + 1, name, tier, description, price, duration, includes, active: 1,
        image_file: d.image_file || null, highlights: d.highlights || null, itinerary: d.itinerary || null,
        best_time: d.best_time || null, map_query: d.map_query || null } }, { upsert: true });
    }
    await db.collection('counters').updateOne({ _id: 'packages' }, { $max: { seq: seedPackages.length } }, { upsert: true });
  }
  if ((await db.collection('destinations').countDocuments({}, { limit: 1 })) === 0) {
    for (let i = 0; i < seedDestinations.length; i++) {
      const [name, country, emoji, price_from, badge] = seedDestinations[i];
      const d = destDetails[name] || {};
      await db.collection('destinations').updateOne({ id: i + 1 }, { $setOnInsert: {
        id: i + 1, name, country, emoji, price_from, badge, active: 1,
        description: d.description || null, highlights: d.highlights || null, gallery: d.gallery || null,
        duration: d.duration || null, best_time: d.best_time || null, image_file: d.image_file || null,
        itinerary: d.itinerary || null } }, { upsert: true });
    }
    await db.collection('counters').updateOne({ _id: 'destinations' }, { $max: { seq: seedDestinations.length } }, { upsert: true });
  }
  // Admin user (change this password after first login!)
  if (!(await db.collection('users').findOne({ email: 'admin@travelbeey.com' }))) {
    const id = await nextId('users');
    await db.collection('users').updateOne({ email: 'admin@travelbeey.com' }, { $setOnInsert: {
      id, name: 'Admin', email: 'admin@travelbeey.com', password: bcrypt.hashSync('Admin@1234', 10),
      phone: null, role: 'admin', created_at: now() } }, { upsert: true });
    console.log('Admin seeded: admin@travelbeey.com');
  }
}

async function init() {
  const db = await connect();
  await Promise.all([
    db.collection('users').createIndex({ id: 1 }, { unique: true }),
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('packages').createIndex({ id: 1 }, { unique: true }),
    db.collection('destinations').createIndex({ id: 1 }, { unique: true }),
    db.collection('bookings').createIndex({ id: 1 }, { unique: true }),
    db.collection('bookings').createIndex({ ref: 1 }, { unique: true }),
    db.collection('bookings').createIndex({ user_id: 1 }),
    db.collection('bookings').createIndex({ guest_email: 1 }),
    db.collection('contacts').createIndex({ id: 1 }, { unique: true }),
    db.collection('subscribers').createIndex({ email: 1 }, { unique: true }),
  ]);
  // TTL index: MongoDB (Atlas) auto-deletes expired sessions. Non-fatal if unsupported — expired sessions are ignored on read anyway.
  await db.collection('sessions').createIndex({ expires: 1 }, { expireAfterSeconds: 0 }).catch((e) => console.warn('Session TTL index skipped:', e.message));
  await seed(db);
  return db;
}

// Resolves to the ready database (indexes + seed done once per instance)
function getDb() {
  if (!cache.ready) cache.ready = init().catch((e) => { cache.ready = null; throw e; });
  return cache.ready;
}

module.exports = { getDb, nextId, now };
