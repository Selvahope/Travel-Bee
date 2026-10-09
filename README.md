# 🐝 TravelBeey — Full Stack Tour Booking Platform

Node.js + Express + SQLite full-stack web app.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
# http://localhost:3000
```

## Default Credentials

| Role  | Email                    | Password    |
|-------|--------------------------|-------------|
| Admin | admin@travelbeey.com     | Admin@1234  |

## Pages

| URL          | Description                       |
|--------------|-----------------------------------|
| /            | Homepage with booking search      |
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

- Change session secret in server.js
- Set `NODE_ENV=production`
- Use a reverse proxy (nginx) in front
- Set up HTTPS (Let's Encrypt)
