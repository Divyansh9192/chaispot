# ☕ ChaiSpot

Discover, review, and earn rewards at chai shops near you.

ChaiSpot is a full-stack web application for finding chai shops on an interactive map, reading and writing reviews, and earning points that can be redeemed for coupon codes. Think "Yelp for chai" with a built-in loyalty program.

## Live URL

- Live: https://chaispot.vercel.app
- Repository: https://github.com/Divyansh9192/chaispot

---

## Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React 19, Vite 8, React Router 7, Mapbox GL JS |
| **Backend** | Node.js, Express 4, Mongoose / MongoDB |
| **Auth** | JWT (bcrypt-hashed passwords) |
| **Maps** | Mapbox Geocoding + Directions (proxied through backend) |
| **Testing** | Jest (unit tests on points/rewards logic) |

---

## Setup & Run Locally (< 5 minutes)

### Prerequisites

- **Node.js** ≥ 18
- **npm** (comes with Node)
- A **MongoDB** instance — a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works, or a local install (`mongodb://localhost:27017/chaispot`)
- A **Mapbox** access token — free from [account.mapbox.com](https://account.mapbox.com/access-tokens/)

### 1. Clone the repo

```bash
git clone https://github.com/Divyansh9192/chaispot
cd chaispot
```

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file (or copy `.env.example` if present):

```env
PORT=5000
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<any-long-random-string>
MAPBOX_TOKEN=<your-mapbox-public-token>
CLIENT_URL=http://localhost:3000
```

Start the server:

```bash
npm run dev      # uses nodemon, auto-restarts on changes
# or
npm start        # plain node, no auto-restart
```

Verify it's running: `GET http://localhost:5000/api/health` → `{ "status": "ok" }`

### 3. Frontend

Open a **second terminal**:

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
VITE_MAPBOX_TOKEN=<your-mapbox-public-token>
```

Start the dev server:

```bash
npm run dev
```

Open **http://localhost:3000** — the frontend proxies all `/api` requests to the backend on port 5000 automatically.

### 4. Run tests

```bash
cd backend
npm test
```

Runs a Jest suite against `utils/points.js` — the points-earning and redemption logic. No database or Express dependencies needed.

---

## Data Model

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    User      │       │    Shop      │       │  Transaction │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ name         │       │ name         │       │ user  → User │
│ email (uniq) │       │ address      │       │ type (earn/  │
│ password     │  ┌───→│ description  │       │       redeem)│
│  (hashed)    │  │    │ photoUrl     │       │ points       │
│ points       │  │    │ location     │       │ reason       │
└──────┬───────┘  │    │  (GeoJSON)   │       │ couponCode   │
       │          │    │ addedBy→User │       └──────────────┘
       │          │    │ avgRating ★  │
       │          │    │ numReviews ★ │         ★ = denormalized
       │          │    └──────────────┘         from Reviews
       │          │
       │    ┌─────┘
       ▼    ▼
┌──────────────┐
│   Review     │
├──────────────┤
│ shop → Shop  │
│ user → User  │
│ rating (1-5) │
│ text         │
└──────────────┘
 unique(shop, user)
```

### Key design choices

- **`User.points`** is a running total kept directly on the user document so balance reads are a single-document lookup, not an aggregation across the transaction history.
- **`Shop.avgRating` / `numReviews`** are denormalized onto the shop so the map view and listing page can render directly without joining against reviews on every load. They're recalculated from scratch (not incrementally) on each new/edited review to avoid drift.
- **`Review`** has a compound unique index on `{shop, user}` — "one review per user per shop" is enforced at the database level, not just in application code, so even concurrent submissions can't create duplicates.
- **`Transaction`** is a ledger of every earn/redeem event. Not strictly required, but it means every point change has a record of *why* it happened, which made the redemption logic easier to reason about.

### Points & rewards rules

| Action | Points |
|---|---|
| Write a review | **+10** |
| First review on a shop | **+15** (bonus) |
| Redeem a coupon | **−50** |

Redemption is a fixed cost (50 points = 1 coupon code). Points can't go negative — enforced with an atomic conditional update.

---

## API Overview

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | – | Create account |
| `POST` | `/api/auth/login` | – | Log in, receive JWT |
| `GET` | `/api/auth/me` | ✅ | Current user profile + points |
| `GET` | `/api/shops` | – | List shops (`?q=`, `?minRating=`) |
| `GET` | `/api/shops/:id` | – | Shop detail + reviews |
| `POST` | `/api/shops` | ✅ | Add a shop (address geocoded server-side) |
| `POST` | `/api/reviews` | ✅ | Submit review (awards points) |
| `PUT` | `/api/reviews/:id` | ✅ | Edit your own review (no extra points) |
| `GET` | `/api/points/balance` | ✅ | Point balance |
| `GET` | `/api/points/history` | ✅ | Earn/redeem ledger |
| `POST` | `/api/points/redeem` | ✅ | Trade 50 pts for a coupon code |
| `POST` | `/api/directions` | – | Route between two coordinates |

Protected routes expect `Authorization: Bearer <token>`.

---

## Known Limitations / What I'd Do With More Time

- **UI polish is lacking.** The frontend is functional but visually rough — given more time I'd invest in a proper design system, better responsive layouts, loading skeletons, and overall visual consistency.
- **No rate-limiting** on any endpoint (reviews, auth, etc.). A production version should add rate-limiting middleware (e.g. `express-rate-limit`) to prevent spam and abuse, especially on review submissions and login attempts.
- **No proximity search endpoint** — the schema supports geospatial queries (`2dsphere` index is already in place), but no "shops near me" route exists yet.
- **No pagination** on `GET /api/shops` — works at prototype scale, would need cursor- or offset-based pagination in production.
- **No password reset or email verification** — auth is intentionally minimal.
- **Coupon codes** are randomly generated but not checked for uniqueness in the database. Collision odds are negligible at this scale but a production system should verify.
- **No image upload** — shops reference a `photoUrl` but there's no upload endpoint; images need to be hosted externally.
- **Mapbox Geocoding/Directions v5** used for simplicity; would consider v6 if extending further.

---

## Project Structure

```
chaispot/
├── backend/
│   ├── config/          # DB connection
│   ├── middleware/       # Auth middleware, error handler
│   ├── models/          # Mongoose schemas (User, Shop, Review, Transaction)
│   ├── routes/          # Express route handlers
│   ├── utils/           # Points logic, Mapbox helpers
│   ├── tests/           # Jest unit tests
│   ├── server.js        # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # Navbar, Stars, Toast
│   │   ├── context/     # AuthContext (React Context + JWT)
│   │   ├── pages/       # Home, ShopDetail, AddShop, Rewards, Leaderboard, Auth
│   │   ├── api.js       # Fetch wrapper for all backend calls
│   │   ├── config.js    # Mapbox token from env
│   │   ├── App.jsx      # Routes + protected route wrapper
│   │   └── index.css    # Global styles
│   ├── vite.config.js   # Dev server on :3000, proxy /api → :5000
│   └── package.json
└── README.md            # ← you are here
```
