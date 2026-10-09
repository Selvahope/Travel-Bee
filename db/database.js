// db/database.js — SQLite database setup
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// DATA_DIR lets a host (Render disk, Railway volume) keep the DB on persistent storage.
const DATA_DIR = process.env.DATA_DIR || __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'travelbeey.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── CREATE TABLES ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    phone       TEXT,
    role        TEXT    NOT NULL DEFAULT 'user',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS packages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    tier        TEXT    NOT NULL,
    description TEXT,
    price       REAL    NOT NULL,
    duration    TEXT,
    includes    TEXT,
    active      INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS destinations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    country     TEXT    NOT NULL,
    emoji       TEXT,
    price_from  REAL    NOT NULL,
    badge       TEXT,
    active      INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    ref           TEXT    NOT NULL UNIQUE,
    user_id       INTEGER REFERENCES users(id),
    guest_name    TEXT    NOT NULL,
    guest_email   TEXT    NOT NULL,
    guest_phone   TEXT    NOT NULL,
    destination   TEXT    NOT NULL,
    package_id    INTEGER REFERENCES packages(id),
    package_name  TEXT    NOT NULL,
    travel_date   TEXT    NOT NULL,
    travellers    TEXT    NOT NULL,
    total_price   REAL,
    status        TEXT    NOT NULL DEFAULT 'pending',
    notes         TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    message    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── MIGRATE: rich content columns for destination explore pages ─
const destCols = db.prepare("PRAGMA table_info(destinations)").all().map(c => c.name);
const addDestCol = (col, def) => { if (!destCols.includes(col)) db.exec(`ALTER TABLE destinations ADD COLUMN ${col} ${def}`); };
addDestCol('description', 'TEXT');
addDestCol('highlights',  'TEXT'); // pipe-separated
addDestCol('gallery',     'TEXT'); // pipe-separated emoji
addDestCol('duration',    'TEXT');
addDestCol('best_time',   'TEXT');
addDestCol('image_file',  'TEXT'); // Wikimedia Commons file title, rendered at multiple sizes client-side
addDestCol('itinerary',   'TEXT'); // day-by-day plan — days separated by "||", each day is "Title::Description"

// ── MIGRATE: same rich-content columns for package detail pages ─
// Packages already had description/duration; this adds the same
// image/highlights/itinerary/map fields destinations have, so a package can
// get its own Kesari-style detail page (hero photo, day-by-day itinerary,
// embedded map) instead of being just a price-tier card.
const pkgCols = db.prepare("PRAGMA table_info(packages)").all().map(c => c.name);
const addPkgCol = (col, def) => { if (!pkgCols.includes(col)) db.exec(`ALTER TABLE packages ADD COLUMN ${col} ${def}`); };
addPkgCol('image_file', 'TEXT'); // local upload path or legacy Wikimedia Commons file title
addPkgCol('highlights', 'TEXT'); // pipe-separated
addPkgCol('itinerary',  'TEXT'); // day-by-day plan — days separated by "||", each day is "Title::Description"
addPkgCol('best_time',  'TEXT');
addPkgCol('map_query',  'TEXT'); // free-text location fed to the embedded Google Map, e.g. "Puri, Odisha, India"

// ── SEED DATA ──────────────────────────────────────────────────
const seedPackages = db.prepare('SELECT COUNT(*) as c FROM packages').get();
if (seedPackages.c === 0) {
  const insertPkg = db.prepare(`
    INSERT INTO packages (name, tier, description, price, duration, includes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertPkg.run('Honey Starter',   'starter',   'Perfect for first-time travellers. Clean, simple, sweet.',              34999,  '3-5 Days',  'Return flights,3-star hotel,Airport transfers,Guided city tour,Travel insurance');
  insertPkg.run('Worker Bee',      'starter',   'Budget-smart city breaks for travellers who move fast and pack light.', 24999,  '2-4 Days',  'Return flights,Budget hotel,Airport transfers,Self-guided city map,Travel insurance');
  insertPkg.run('Queen Bee',       'premium',   'The complete experience with personal travel concierge.',               89999,  '7-10 Days', 'Business class flights,5-star hotel + breakfast,Private transfers,5 guided excursions,Personal concierge,Premium insurance');
  insertPkg.run('Royal Jelly',     'premium',   'Our top-tier luxury escape — private villas and bespoke everything.',   149999, '10-14 Days','First class flights,Private villa or suite,Chauffeur-driven transfers,Michelin-recommended dining,24/7 personal concierge,Spa credits,Premium insurance');
  insertPkg.run('Wild Nectar',     'adventure', 'Off-the-beaten-path adventures for bold explorers.',                    59999,  '5-8 Days',  'Eco-lodge stay,Adventure activity passes,Native local guide,Sustainable travel credits,Gear & kit rental');
  insertPkg.run('Swarm Trail',     'adventure', 'Multi-country backpacking trail for groups who love the outdoors.',     69999,  '9-12 Days', 'Hostel & eco-lodge mix,Multi-country rail passes,Trekking guide,Group gear rental,Adventure sports pass,Travel insurance');
  insertPkg.run('Honeymoon Hive',  'premium',   'Romance-first itineraries for newlyweds and anniversary trips.',        109999, '6-9 Days',  'Business class flights,5-star honeymoon suite,Candlelit private dinner,Couples spa session,Private excursions,Premium insurance');
  insertPkg.run('Family Comb',     'starter',   'Kid-friendly pacing, family rooms and activities for every age.',       79999,  '6-8 Days',  'Return flights (family fares),Family-size rooms,Kid-friendly excursions,Airport transfers,Travel insurance for all');
}

// Backfill rich detail-page content (photo, highlights, itinerary, map) for
// packages that don't have it yet — same idea as the destinations backfill
// below, so upgrading an existing DB still gets example content to preview.
const pkgDetails = {
  'Honey Starter': {
    image_file: 'Hawa Mahal 2011.jpg',
    highlights: 'Guided city tour with a local expert|3-star centrally located hotel|Airport pickup & drop included|Flexible reschedule up to 7 days out',
    best_time: 'Oct – Mar',
    map_query: 'Jaipur, Rajasthan, India',
    itinerary: 'Day 1: Arrival::Land, transfer to your hotel and settle in — evening free to explore nearby markets.||Day 2: Guided City Tour::Full-day guided tour covering the city\'s must-see forts, palaces and bazaars.||Day 3: Free Day::A day at your own pace — optional add-on excursions available on request.||Day 4: Departure::Check out and transfer to the airport for your flight home.',
  },
  'Queen Bee': {
    image_file: 'Allepy Backwaters, Kerala, India.jpg',
    highlights: 'Private transfers throughout|5-star stay with breakfast included|Personal travel concierge on call|5 curated guided excursions',
    best_time: 'Sep – Mar',
    map_query: 'Alleppey, Kerala, India',
    itinerary: 'Day 1: Arrival & Check-in::Private transfer to your 5-star stay, evening welcome dinner.||Day 2: Guided Excursion One::First of five curated excursions with a private guide.||Day 3: Guided Excursion Two::Continue exploring with your concierge-arranged itinerary.||Day 4: Leisure Day::Free day to relax, spa or optional add-ons.||Day 5: Guided Excursion Three::Another concierge-picked highlight of the region.||Day 6: Guided Excursion Four::Continuing the curated route.||Day 7: Guided Excursion Five & Departure::Final excursion, then private transfer to the airport.',
  },
};
const updPkg = db.prepare("UPDATE packages SET image_file=?, highlights=?, itinerary=?, best_time=?, map_query=? WHERE name=? AND (image_file IS NULL OR image_file = '')");
for (const [name, d] of Object.entries(pkgDetails)) {
  updPkg.run(d.image_file, d.highlights, d.itinerary, d.best_time, d.map_query, name);
}

const seedDest = db.prepare('SELECT COUNT(*) as c FROM destinations').get();
if (seedDest.c === 0) {
  const insertDest = db.prepare(`
    INSERT INTO destinations (name, country, emoji, price_from, badge) VALUES (?, ?, ?, ?, ?)
  `);
  insertDest.run('Jaipur',             'Rajasthan',        '🏰', 12999, 'Best Seller');
  insertDest.run('Udaipur',            'Rajasthan',        '🛶', 14999, 'Honeymoon');
  insertDest.run('Leh-Ladakh',         'Ladakh',           '🏔️', 24999, 'Adventure');
  insertDest.run('Rishikesh',          'Uttarakhand',      '🧘', 8999,  'Adventure');
  insertDest.run('Varanasi',           'Uttar Pradesh',    '🛕', 9999,  'Popular');
  insertDest.run('Kerala Backwaters',  'Kerala',           '🌴', 15999, 'Honeymoon');
  insertDest.run('Goa',                'Goa',              '🏖️', 10999, 'Best Seller');
  insertDest.run('Hampi',              'Karnataka',        '🏛️', 8999,  'New');
  insertDest.run('Darjeeling',         'West Bengal',      '🍃', 11999, 'New');
  insertDest.run('Andaman Islands',    'Andaman & Nicobar','🏝️', 21999, 'Bucket List');
}

// Backfill rich explore-page content for destinations that don't have it yet
const destDetails = {
  'Jaipur':      { description: "Rajasthan's Pink City, where sandstone forts and mirror-worked palaces rise above bazaars selling block-print textiles, gemstones and puppets. A living capital of Rajput history and craft.", highlights: "Hawa Mahal at sunrise|Amber Fort elephant gate|City Palace museum|Johari Bazaar shopping", gallery: "🏰|🐘|💎|🧵", duration: "3-4 Days", best_time: "Oct – Mar", image_file: "Hawa Mahal 2011.jpg",
    itinerary: "Day 1: Arrive in Jaipur::Land or arrive by train, check in and an evening stroll through the Old City bazaars.||Day 2: Amber Fort & City Palace::Morning at Amber Fort, afternoon touring the City Palace and Jantar Mantar observatory.||Day 3: Hawa Mahal & Bazaars::Photo stop at Hawa Mahal, then shopping for textiles and gemstones in Johari and Bapu Bazaar.||Day 4: Depart Jaipur::Check out and transfer to the station or airport for onward travel." },
  'Udaipur':     { description: "The City of Lakes, where the white marble City Palace floats above Lake Pichola and every rooftop café frames a postcard view. Rajasthan's most romantic city.", highlights: "Lake Pichola boat ride at sunset|City Palace complex|Jag Mandir island palace|Saheliyon-ki-Bari gardens", gallery: "🏯|🚤|🌅|🌺", duration: "3-4 Days", best_time: "Sep – Mar", image_file: "City Palace by lake Pichola, Udaipur.jpg",
    itinerary: "Day 1: Arrive in Udaipur::Check into a lakeside hotel and an evening boat ride on Lake Pichola.||Day 2: City Palace & Jagdish Temple::Full tour of the City Palace complex, followed by the nearby Jagdish Temple.||Day 3: Sajjangarh & Gardens::Sunset at Sajjangarh (Monsoon Palace) and a stroll through Saheliyon-ki-Bari gardens.||Day 4: Depart Udaipur::Check out and transfer for onward travel." },
  'Leh-Ladakh':  { description: "A high-altitude desert of Buddhist monasteries, turquoise lakes and passes above 17,000 feet. Ladakh trades palm trees for prayer flags and is unlike anywhere else in India.", highlights: "Pangong Lake's changing blues|Nubra Valley sand dunes|Thiksey Monastery at dawn|Khardung La high-altitude pass", gallery: "🏔️|🐫|🙏|🛕", duration: "6-8 Days", best_time: "May – Sep", image_file: "Pangong Tso Lake.jpg",
    itinerary: "Day 1: Arrive in Leh::Land in Leh and rest for altitude acclimatisation; short evening walk around the market.||Day 2: Leh Local Sightseeing::Visit Shanti Stupa, Leh Palace and the local market at an easy pace.||Day 3: Nubra Valley::Cross Khardung La to the Nubra Valley for sand dunes and double-humped camels.||Day 4: Pangong Lake::Drive to Pangong Tso, overnight by the lake to see its colours shift at sunset and sunrise.||Day 5: Return to Leh::Scenic drive back to Leh via Chang La pass.||Day 6: Monasteries & Leisure::Visit Thiksey and Hemis monasteries, free afternoon for shopping.||Day 7: Depart Leh::Transfer to the airport for your departure flight." },
  'Rishikesh':   { description: "The yoga capital of the world, where the Ganges rushes turquoise beneath suspension bridges and ashrams line the riverbanks. Equal parts spiritual retreat and adventure hub.", highlights: "Laxman Jhula & riverside temples|Ganga Aarti at Triveni Ghat|White-water rafting on the Ganges|Yoga & meditation sessions", gallery: "🧘|🌊|🛶|🕉️", duration: "3-4 Days", best_time: "Sep – Apr", image_file: "Rishikesh, Lakshman Jhula.jpg",
    itinerary: "Day 1: Arrive in Rishikesh::Check in, evening Ganga Aarti at Triveni Ghat.||Day 2: Rafting & Riverside::Morning white-water rafting session, afternoon exploring Laxman Jhula and Ram Jhula.||Day 3: Yoga & Ashrams::Optional yoga or meditation session, visit to a riverside ashram and local cafés.||Day 4: Depart Rishikesh::Check out and transfer for onward travel." },
  'Varanasi':    { description: "India's oldest living city, where stone ghats step down to the Ganges and oil lamps drift on the water each evening. Varanasi is raw, sacred and unforgettable.", highlights: "Sunrise boat ride on the Ganges|Ganga Aarti at Dashashwamedh Ghat|Kashi Vishwanath Temple|Sarnath Buddhist site", gallery: "🛕|🕯️|🚣|🙏", duration: "2-3 Days", best_time: "Oct – Mar", image_file: "Ahilya Ghat by the Ganges, Varanasi.jpg",
    itinerary: "Day 1: Arrive in Varanasi::Check in, evening Ganga Aarti ceremony at Dashashwamedh Ghat.||Day 2: Sunrise Boat Ride & Temples::Early boat ride along the ghats, visit Kashi Vishwanath Temple and explore the old city lanes.||Day 3: Sarnath & Depart::Morning excursion to Sarnath, then transfer for onward travel." },
  'Kerala Backwaters': { description: "A maze of palm-fringed canals, lagoons and rice paddies in Kerala's Kuttanad region, best explored by houseboat as village life drifts slowly by.", highlights: "Overnight houseboat cruise|Alleppey canal village life|Kumarakom bird sanctuary|Ayurvedic spa treatments", gallery: "🌴|🛶|🦜|💆", duration: "3-4 Days", best_time: "Sep – Mar", image_file: "Allepy Backwaters, Kerala, India.jpg",
    itinerary: "Day 1: Arrive in Alleppey::Check in and board your houseboat by early evening for a sunset cruise.||Day 2: Backwater Cruise::Full day cruising the backwaters, stopping at villages and coir workshops along the way.||Day 3: Kumarakom & Ayurveda::Disembark, visit the Kumarakom bird sanctuary and enjoy an Ayurvedic massage.||Day 4: Depart::Check out and transfer for onward travel." },
  'Goa':         { description: "India's beach capital, pairing laid-back Arabian Sea coastline with whitewashed Portuguese churches, spice plantations and a legendary nightlife scene.", highlights: "Baga & Palolem beach days|Old Goa's Portuguese churches|Spice plantation tour|Anjuna flea market & sunset shacks", gallery: "🏖️|⛪|🌶️|🌇", duration: "3-5 Days", best_time: "Nov – Feb", image_file: "Goa beautiful beach.JPG",
    itinerary: "Day 1: Arrive in Goa::Check into your beachfront hotel, evening at leisure on the beach.||Day 2: North Goa::Baga and Anjuna beaches by day, sunset shack dinner.||Day 3: Old Goa & Spice Plantation::Morning at Old Goa's churches, afternoon spice plantation tour and lunch.||Day 4: South Goa Beach Day::Relaxed day at Palolem or Colva beach.||Day 5: Depart Goa::Check out and transfer to the airport." },
  'Hampi':       { description: "The ruined capital of the Vijayanagara Empire, scattered across a surreal boulder-strewn landscape on the banks of the Tungabhadra river.", highlights: "Vittala Temple's stone chariot|Virupaksha Temple bazaar|Matanga Hill sunrise|Coracle ride on the Tungabhadra", gallery: "🏛️|🌄|🛶|🪨", duration: "2-3 Days", best_time: "Oct – Feb", image_file: "Vittala Temple - Hampi - Karnataka.jpg",
    itinerary: "Day 1: Arrive in Hampi::Check in, evening walk through the Virupaksha Temple bazaar.||Day 2: Ruins & Sunrise::Sunrise from Matanga Hill, full day exploring the Vittala Temple complex and royal enclosure.||Day 3: Depart Hampi::Morning coracle ride on the river, then transfer for onward travel." },
  'Darjeeling':  { description: "A former British hill station in the Himalayan foothills, famous for its tea gardens, toy train and sweeping views of Kanchenjunga.", highlights: "Tiger Hill sunrise over Kanchenjunga|Darjeeling Himalayan Railway toy train|Tea garden walk & tasting|Padmaja Naidu Zoo", gallery: "🍃|🚂|🏔️|🐼", duration: "3-4 Days", best_time: "Mar – May, Oct – Dec", image_file: "The tea gardens of Darjeeling.jpg",
    itinerary: "Day 1: Arrive in Darjeeling::Check in, evening at Mall Road and Chowrasta.||Day 2: Tiger Hill & Tea Gardens::Pre-dawn drive to Tiger Hill for sunrise over Kanchenjunga, afternoon tea garden walk and tasting.||Day 3: Toy Train & Sightseeing::Joy ride on the Darjeeling Himalayan Railway, visit the zoo and Himalayan Mountaineering Institute.||Day 4: Depart Darjeeling::Check out and transfer for onward travel." },
  'Andaman Islands': { description: "A remote archipelago in the Bay of Bengal with powder-white beaches, coral reefs and dense rainforest — India's best-kept island secret.", highlights: "Radhanagar Beach sunset|Snorkelling at Elephant Beach|Cellular Jail light & sound show|Scuba diving at Havelock", gallery: "🏝️|🐠|🤿|🌅", duration: "5-6 Days", best_time: "Nov – May", image_file: "Radhanagar beach, Havelock islands, Andaman and Nicobar.JPG",
    itinerary: "Day 1: Arrive in Port Blair::Check in, evening Cellular Jail light and sound show.||Day 2: Transfer to Havelock::Ferry to Havelock Island, evening at leisure on Radhanagar Beach.||Day 3: Snorkelling & Beach Day::Snorkelling trip to Elephant Beach, afternoon free by the water.||Day 4: Scuba or Leisure::Optional scuba diving session, or a relaxed beach day.||Day 5: Return to Port Blair::Ferry back to Port Blair, visit the Anthropological Museum.||Day 6: Depart Port Blair::Transfer to the airport for your departure flight." },
};
const updDest = db.prepare('UPDATE destinations SET description=?, highlights=?, gallery=?, duration=?, best_time=? WHERE name=? AND description IS NULL');
for (const [name, d] of Object.entries(destDetails)) {
  updDest.run(d.description, d.highlights, d.gallery, d.duration, d.best_time, name);
}
// Backfill itinerary separately (added after the columns above already existed
// for some installs) so upgrading an existing DB still gets day-by-day plans.
const updItin = db.prepare("UPDATE destinations SET itinerary=? WHERE name=? AND (itinerary IS NULL OR itinerary = '')");
for (const [name, d] of Object.entries(destDetails)) {
  if (d.itinerary) updItin.run(d.itinerary, name);
}
// Backfill image_file separately so it also applies to rows that already had
// description text (e.g. upgrading an existing DB from an older seed).
const updImg = db.prepare("UPDATE destinations SET image_file=? WHERE name=? AND (image_file IS NULL OR image_file = '')");
for (const [name, d] of Object.entries(destDetails)) {
  updImg.run(d.image_file, name);
}

// Seed admin user
const adminExists = db.prepare("SELECT id FROM users WHERE email = 'admin@travelbeey.com'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync('Admin@1234', 10);
  db.prepare(`
    INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
  `).run('Admin', 'admin@travelbeey.com', hash, 'admin');
  console.log('✅ Admin seeded: admin@travelbeey.com / Admin@1234');
}

module.exports = db;
