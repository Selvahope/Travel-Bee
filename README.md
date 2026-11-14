# 🐝 TravelBeey — Tour Booking Platform

Node.js + Express + **MongoDB Atlas**. Ready to deploy on **Vercel** (or Render / run locally).

## 1. MongoDB Atlas (one-time)
1. Create a free cluster at mongodb.com/atlas.
2. **Database Access** → add a user (username + password).
3. **Network Access** → Add IP Address → `0.0.0.0/0` (Vercel uses changing IPs).
4. **Connect → Drivers** → copy the connection string, e.g.
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   (if the password has special characters like `@ : /`, URL-encode them).

## 2. Run locally
```bash
npm install
cp .env.example .env        # then edit MONGODB_URI and SESSION_SECRET
npm start                   # http://localhost:3000
```

## 3. Deploy to Vercel
1. Push this folder to GitHub.
2. vercel.com → Add New → Project → import the repo (leave build settings as default).
3. Environment Variables:
   - `MONGODB_URI` = your Atlas connection string
   - `SESSION_SECRET` = any long random text
   - `NODE_ENV` = `production`
4. Deploy. Every `git push` redeploys automatically.

## Admin
`/admin` — default login `admin@travelbeey.com` / `Admin@1234`. **Change it right after first login.**
The first request to the site creates the collections, indexes, sample packages/destinations and the admin user.

## Notes
- Product photos uploaded in the admin panel are stored in MongoDB (max 4MB each — Vercel's request limit).
- Sessions are stored in MongoDB, so logins work across serverless instances.
- The login/booking rate limiter is in-memory (per serverless instance) — good basic protection, not a hard global limit.

## Structure
`api/index.js` Vercel entry · `server.js` Express app · `db/mongo.js` connection/seed · `routes/` API · `public/` frontend
