# ChaiSpot — Backend

Backend API for ChaiSpot: chai shop listings, map-ready shop data, reviews, and a points/rewards
system. This repo is the **backend only** (Node/Express/MongoDB) — no frontend included.

## Tech stack

- Node.js + Express
- MongoDB + Mongoose
- JWT for auth (email/password, bcrypt-hashed)
- Mapbox Geocoding API (address → lat/lng) and Directions API (route between two points),
  both called server-side

## Setup (local, should take < 5 minutes)

1. `cd chaispot-backend`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in the values:
   - `MONGO_URI` — a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works fine, or
     point it at a local Mongo instance (`mongodb://localhost:27017/chaispot`)
   - `JWT_SECRET` — any random string
   - `MAPBOX_TOKEN` — free from [Mapbox](https://account.mapbox.com/access-tokens/)
4. `npm run dev` (uses nodemon) or `npm start`
5. Server runs at `http://localhost:5000`. Check `GET /api/health` to confirm it's up.

## Running tests

```
npm test
```

This runs a small Jest suite against `utils/points.js` — the points-earning and
redemption logic. That file has no database or Express dependencies on purpose, so the
trickiest business logic (the one thing the assignment says matters most) can be tested
in isolation, fast, without spinning up MongoDB.

## API overview

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | – | Create an account |
| POST | `/api/auth/login` | – | Log in, get a JWT |
| GET | `/api/auth/me` | ✅ | Current user's profile + points |
| GET | `/api/shops` | – | List shops. Supports `?q=` (name search) and `?minRating=` |
| GET | `/api/shops/:id` | – | Shop detail + its reviews |
| POST | `/api/shops` | ✅ | Add a shop (address is geocoded server-side) |
| POST | `/api/reviews` | ✅ | Add a review (`{ shopId, rating, text }`) — awards points |
| PUT | `/api/reviews/:id` | ✅ | Edit your own review (no extra points) |
| GET | `/api/points/balance` | ✅ | Current point balance |
| GET | `/api/points/history` | ✅ | Ledger of past earn/redeem events |
| POST | `/api/points/redeem` | ✅ | Redeem `REDEMPTION_THRESHOLD` points for a coupon code |
| POST | `/api/directions` | – | `{ origin: {lat,lng}, destination: {lat,lng} }` → route |

Protected routes expect `Authorization: Bearer <token>`.

## Data model

**User** — `name`, `email`, `password` (hashed), `points`. Points is a running total kept
on the user document so reads (e.g. "what's my balance") are cheap and don't require
summing a transaction history every time.

**Shop** — `name`, `address`, `description`, `photoUrl`, `location` (GeoJSON `Point`,
`[lng, lat]`, 2dsphere-indexed), `addedBy`, plus denormalized `avgRating` and `numReviews`.
Storing the rating/count on the shop itself means the map/listing view can render directly
from the shop document instead of joining against reviews on every page load. It's
recalculated from scratch (not incrementally) whenever a review is added or edited — a
little more DB work per write, but much less room for the average to drift out of sync,
which felt like the right trade-off for a review count this small.

**Review** — `shop`, `user`, `rating` (1–5), `text`. A compound unique index on
`{shop, user}` enforces "one review per user per shop" at the database level, not just in
application code — so even a race condition (two near-simultaneous submit clicks) can't
create two reviews.

**Transaction** — `user`, `type` (`earn`/`redeem`), `points`, `reason`, `couponCode`.
This is a simple ledger, separate from `User.points`. It's not strictly required to satisfy
the assignment, but it means every point change has a record of *why* it happened, which
made the redemption logic much easier to reason about (and debug) while building it.

## Design decisions worth flagging

- **Geocoding and directions are both proxied through the backend.** The frontend never
  needs a Mapbox token or needs to know these APIs exist — it just sends an address or two
  coordinates and gets back what it needs. This also keeps the Mapbox token off the client.
- **Redemption is a fixed cost** (`REDEMPTION_THRESHOLD` = 50 points per coupon), rather
  than letting a user type in an arbitrary amount to redeem. The spec's wording ("once a
  user crosses a threshold... they can redeem a coupon code") reads more like "pay the
  threshold, get a coupon" than a variable-amount system, and it's a lot simpler to reason
  about and test.
- **Points can't go negative** — enforced with an atomic conditional update
  (`findOneAndUpdate` with a `points: { $gte: threshold }` guard) rather than
  "read balance, then write," which would have a race condition if two redeem requests
  landed at the same time.
- **Duplicate reviews** are blocked both in application logic (a clear check before
  insert, for a friendly error message) and at the database level (unique index, as a
  safety net for concurrent requests).
- Shop's `location` is stored as a GeoJSON `Point` with a `2dsphere` index even though no
  current endpoint queries by proximity — it was easy to set up correctly now, and it's
  what a future "chai shops near me" search would need.

## Known limitations / what I'd do with more time

- No frontend in this deliverable — this is the backend/API only.
- No rate-limiting or cooldown on review submissions (listed as a stretch goal in the
  brief; skipped here for time).
- No proximity search endpoint yet, even though the schema is ready for one.
- No password reset or email verification flow — signup/login is intentionally minimal.
- No pagination on `GET /api/shops` — fine at prototype scale, would need it in production.
- Coupon codes are randomly generated but not checked for uniqueness against existing
  codes in the database. Collision odds are extremely low at this scale, but a production
  version should check-and-retry.
- Currently using Mapbox Geocoding/Directions v5 endpoints for simplicity; would consider
  v6 (or swapping providers) if extending this further.
