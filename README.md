# Ghar Ka Sathi — Backend

Node.js + Express + MongoDB backend for the Ghar Ka Sathi local-services marketplace — User panel,
Service Provider panel, and Admin panel.

## Setup

```
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, FIREBASE_*, RAZORPAY_* and ADMIN_SEED_*
npm run seed:admin      # creates the first admin account
npm run dev              # or: npm start
```

## Testing the API

Import `postman_collection.json` and `postman_environment.json` into Postman (or Insomnia / Thunder Client),
select the "Ghar Ka Sathi - Local" environment, and run requests folder by folder — every request that
returns a token or id (Admin Login, Get My Profile, Create Category, Create Booking, File Complaint) auto-saves
it into the environment, so later requests fill in `{{adminToken}}`, `{{categoryId}}`, `{{bookingId}}`, etc.
automatically. Full usage notes are in the collection's own description (visible in Postman when you open it).

`Auth > Verify OTP` needs a real Firebase phone-auth idToken, which isn't obtainable from Postman alone — either
use a Firebase test phone number from a client app, or seed a test User/ServiceProvider directly in MongoDB and
hand-craft a JWT the way this was validated during development (see `src/utils/generateToken.js`).

This collection was run end-to-end through Newman (`npx newman run postman_collection.json -e postman_environment.json`)
against a live local instance — all 50 requests, including the full booking → payment → chat → complaint →
admin-analytics lifecycle, work as documented.

## Auth model

- **User / Service Provider**: phone OTP via Firebase Auth on the client. Client sends the resulting
  Firebase `idToken` to `POST /api/auth/verify-otp` with `role: "user" | "provider"`. Backend verifies
  the token, finds-or-creates the account, and returns our own JWT for subsequent requests
  (`Authorization: Bearer <token>`).
- **Admin**: email/password via `POST /api/auth/admin/login` (seeded with `npm run seed:admin`).

Suspended accounts (`isActive: false`, set by admin) are rejected at the auth middleware regardless of role.

## Endpoints

| Panel | Endpoints |
|---|---|
| Auth | `POST /api/auth/verify-otp`, `POST /api/auth/admin/login` |
| User | `GET/PUT /api/users/me`, `PUT /api/users/me/location` |
| Service Provider | `GET/PUT /api/providers/me`, `PUT /api/providers/me/location`, `GET /api/providers/search?categoryId=&lat=&lng=&radiusKm=` (public, nearby search), `PUT /api/providers/me/availability`, `GET /api/providers/me/earnings` |
| Categories | `GET /api/categories` (public, active only), `POST/PUT /api/categories` (admin, includes `commissionPercent`), `GET /api/admin/categories` (admin, includes inactive), `PUT /api/categories/:id/activate`\|`deactivate` (admin), `DELETE /api/categories/:id` (admin — hard-deletes only if no provider/booking references it, else 409 telling you to deactivate instead) |
| Bookings | `POST /api/bookings` (rejects if the provider doesn't offer the given category, or isn't approved/available), `GET /api/bookings/my`, `GET /api/bookings/:id` (track — user or assigned provider), `PUT /api/bookings/:id/cancel`, `POST /api/bookings/:id/review`, `GET /api/bookings/provider`, `PUT /api/bookings/:id/status` (provider accepts/rejects/completes; attach a `price` quote when accepting) |
| Payments | `POST /api/payments/create-order` (user, Razorpay), `POST /api/payments/verify` (user), `POST /api/payments/cash` (provider records cash collection) — both paths split the booking price into provider payout vs. platform commission per the category's `commissionPercent`, then credit provider earnings |
| Chat | `GET/POST /api/chat/:bookingId` (user or assigned provider) — messages also broadcast in real time over Socket.io to room `booking:<id>`; connect with `auth: { token: <JWT> }` and emit `join-booking`/`leave-booking` |
| Complaints | `POST /api/complaints`, `GET /api/complaints/my` (user) |
| Admin | `GET /api/admin/providers?approved=`, `PUT /api/admin/providers/:id/approve\|suspend\|reinstate`, `GET /api/admin/users`, `PUT /api/admin/users/:id/suspend\|reinstate`, `GET /api/admin/complaints?status=`, `PUT /api/admin/complaints/:id/resolve`, `GET /api/admin/payments`, `GET /api/admin/payments/summary`, `GET /api/admin/analytics` |

Provider onboarding flow: client verifies OTP → `PUT /api/providers/me` sets name/categories/address/documents
→ admin approves via `PUT /api/admin/providers/:id/approve` → provider becomes searchable/bookable.

Booking → payment flow: user books → provider `accepted` with a `price` quote → provider marks `completed` →
payment settled either online (`create-order` + client Razorpay checkout + `verify`) or in cash (`/payments/cash`) →
provider `earnings` credited with `price - commission`.

## Not yet built

- Push notifications for booking status changes
- Client apps (this repo is backend only)
- Shop/medicine/grocery delivery, emergency services (future scale-out mentioned in the product spec) — the
  `Category` + `ServiceProvider` + `Booking` model shape already generalizes to these; they'd mostly need new
  category rows and, for delivery, an item/cart concept in front of `Booking`.
