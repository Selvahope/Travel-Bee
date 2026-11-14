# 🐝 TravelBeey — Full Stack Tour Booking Platform

Node.js + Express + SQLite full-stack web app.

## Quick Start

```bash
# 1. Install dependencies
npm install   # Node 22 or newer required

# 2. Start the server
npm start

# 3. Open in browser
# http://localhost:3000
```

## Default Credentials

| Role  | Email                    | Password    |
|-------|--------------------------|-------------|
| Admin | admin@travelbeey.com     | Admin@1234  |

## What's new in this version
- New professional storefront (MakeMyTrip/Goibibo-style): search bar, destination cards, package cards, sticky booking card with live price.
- Everything is stored in SQLite (`db/travelbeey.db`): users, bookings, enquiries (`contacts`), newsletter `subscribers`, and login `sessions` (logins now survive restarts).
- Booking total is calculated on the server: adults x price + children x 75% of price.
- New pages: `/track` (guest booking lookup by reference + email), `/contact`; admin has an Enquiries tab.

## Pages

| URL          | Description                       |
|--------------|-----------------------------------|
| /            | Homepage with search, destinations, packages |
| /explore?id= | Destination page + booking        |
| /package?id= | Package page + booking            |
| /track       | Track a booking (ref + email)     |
| /contact     | Contact form (saved to DB)        |
| /login       | User login                        |
| /register    | New user registration             |
| /dashboard   | User dashboard + my bookings      |
| /admin       | Admin dashboard (admin only)      |

## API Endpoints

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login`    — Login
- `POST /api/auth/logout`   — Logout
- `GET  /api/auth/me`       — Current session info

### Bookings
- `POST   /api/bookings`           — Create booking (public)
- `GET    /api/bookings/my`        — My bookings (logged in)
- `GET    /api/bookings`           — All bookings (admin)
- `PATCH  /api/bookings/:id/status`— Update status (admin)
- `DELETE /api/bookings/:id`       — Delete booking (admin)

### Packages
- `GET    /api/packages`            — All packages (public)
- `GET    /api/packages/destinations` — All destinations (public)
- `POST   /api/packages`            — Add package (admin)
- `PUT    /api/packages/:id`        — Update package (admin)
- `DELETE /api/packages/:id`        — Deactivate package (admin)

### Admin
- `GET    /api/admin/stats`         — Dashboard stats
- `GET    /api/admin/users`         — All users
- `PATCH  /api/admin/users/:id/role`— Change user role
- `DELETE /api/admin/users/:id`     — Delete user

## Project Structure

```
travelbeey/
├── server.js            # Express app entry point
├── db/
│   └── database.js      # SQLite setup + seed data
├── middleware/
│   └── auth.js          # Session auth middleware
├── routes/
│   ├── auth.js          # Auth routes
│   ├── bookings.js      # Booking CRUD
│   ├── packages.js      # Packages + destinations
│   └── admin.js         # Admin stats + users
└── public/
    ├── index.html       # Homepage
    ├── login.html       # Login page
    ├── register.html    # Register page
    ├── dashboard.html   # User dashboard
    ├── admin.html       # Admin dashboard
    ├── 404.html         # 404 page
    ├── css/
    │   ├── main.css     # Global styles
    │   ├── dashboard.css
    │   └── admin.css
    └── js/
        ├── main.js      # Homepage logic
        ├── auth.js      # Auth forms
        ├── dashboard.js # User dashboard
        └── admin.js     # Admin dashboard
```

## Production Tips

- **Data persistence on Render:** the free plan has an ephemeral disk, so the DB resets on every deploy. Attach a Render Disk (paid) and set `DATA_DIR` to its mount path (e.g. `/var/data`), or move to a hosted DB.
- Set `SESSION_SECRET` (render.yaml already generates one)
- Set `NODE_ENV=production`
- Use a reverse proxy (nginx) in front
- Set up HTTPS (Let's Encrypt)
