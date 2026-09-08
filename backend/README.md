# Shiplist — Feature Request & Public Roadmap Portal

A **Canny / Featurebase-inspired** backend API built with Node.js, Express, MongoDB, and JWT authentication. Users can submit feature requests, vote on them, and leave threaded comments. Admins can move items through a public roadmap.

---

## Project Overview

| Feature | Details |
|---|---|
| Authentication | JWT (access 15 min + refresh 7 days) in httpOnly cookies with rotation |
| Roles | `USER`, `ADMIN` |
| Feature Requests | CRUD with category, status, full-text search, pagination, sorting |
| Voting | Atomic MongoDB ops ($addToSet / $pull / $inc) — no duplicate votes |
| Comments | Threaded replies via `parentComment` |
| Admin Roadmap | Status transitions: Under Review → Planned → In Progress → Completed |
| Validation | Zod on every request body + query params |
| Security | Helmet, CORS, bcrypt, rate limiting on auth routes |

---

## Setup Instructions

### 1. Prerequisites
- **Node.js** v18+ — [download](https://nodejs.org)
- **MongoDB** running locally (or MongoDB Atlas URI)

### 2. Install Dependencies

```bash
cd server
npm install
```

### 3. Environment Variables

```bash
cp .env.example .env
```

Open `.env` and set the values:

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default: `5000`) |
| `NODE_ENV` | `development` or `production` |
| `MONGO_URI` | MongoDB connection string |
| `MONGO_URI_TEST` | MongoDB URI for the test database |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens — use a long random string |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens — use a different long random string |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (default: `7d`) |
| `COOKIE_SECRET` | Secret for cookie signing |
| `CLIENT_URL` | Frontend URL for CORS (default: `http://localhost:3000`) |

> **Generate secrets:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```
> Run this twice — once for `JWT_ACCESS_SECRET`, once for `JWT_REFRESH_SECRET`.

### 4. Start MongoDB

**Option A — Local MongoDB:**
```bash
# Windows (if MongoDB is installed as a service)
net start MongoDB

# macOS/Linux
mongod --dbpath /data/db
```

**Option B — MongoDB Atlas:**  
Set `MONGO_URI` in `.env` to your Atlas connection string.

### 5. Run the Development Server

```bash
npm run dev
```

Server starts at `http://localhost:5000`.  
Health check: `GET http://localhost:5000/health`

### 6. Seed the Database

```bash
npm run seed
```

This creates:
- 1 admin user
- 5 regular users
- 15 feature request posts (mixed categories and statuses)
- Votes and threaded comments

**Demo credentials after seeding:**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shiplist.dev` | `Admin1234!` |
| User | `alice@example.com` | `Alice1234!` |
| User | `bob@example.com` | `Bob12345!` |

### 7. Run Tests

```bash
npm test
```

Tests use a separate `shiplist_test` database that is wiped between each test suite.

---

## API Endpoint Reference

All endpoints return:
```json
{ "success": true/false, "message": "...", "data": {...} }
```

### Authentication (`/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | Public | Create account. Returns `verificationToken` (simulated) |
| `GET`  | `/auth/verify-email?token=...` | Public | Verify email using the token |
| `POST` | `/auth/login` | Public | Login. Sets `accessToken` + `refreshToken` cookies |
| `POST` | `/auth/refresh` | Public (cookie) | Rotate tokens. Reads `refreshToken` cookie |
| `POST` | `/auth/logout` | 🔒 Auth | Clear tokens from DB + cookies |
| `POST` | `/auth/forgot-password` | Public | Returns `resetToken` (simulated) |
| `POST` | `/auth/reset-password` | Public | Reset password using the token |
| `GET`  | `/auth/me` | 🔒 Auth | Return current user profile |

### Feature Requests (`/api/posts`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`    | `/api/posts` | Public | List posts. Supports filters (see below) |
| `GET`    | `/api/posts/:id` | Public | Get a single post |
| `POST`   | `/api/posts` | 🔒 Auth | Create a new feature request |
| `PATCH`  | `/api/posts/:id` | 🔒 Author/Admin | Update title, description, or category |
| `DELETE` | `/api/posts/:id` | 🔒 Author/Admin | Delete a post |

**GET /api/posts — Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page, max 100 (default: 10) |
| `category` | string | `UI/UX`, `Integrations`, `Performance`, `General` |
| `status` | string | `Under Review`, `Planned`, `In Progress`, `Completed` |
| `search` | string | Full-text search across title and description |
| `sort` | string | `voteCount`, `createdAt`, `commentCount` (default: `createdAt`) |
| `order` | string | `asc` or `desc` (default: `desc`) |

### Voting

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST`   | `/api/posts/:id/vote` | 🔒 Auth | Upvote a post |
| `DELETE` | `/api/posts/:id/vote` | 🔒 Auth | Remove upvote |

Vote response includes `{ voteCount, hasVoted }` for frontend optimistic updates.

### Comments (`/api/posts/:postId/comments` and `/api/comments`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET`    | `/api/posts/:postId/comments` | Public | Get threaded comments for a post |
| `POST`   | `/api/posts/:postId/comments` | 🔒 Auth | Create comment (include `parentComment` for replies) |
| `PATCH`  | `/api/comments/:id` | 🔒 Author/Admin | Edit a comment |
| `DELETE` | `/api/comments/:id` | 🔒 Author/Admin | Delete a comment |

### Admin (`/api/admin`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `PATCH` | `/api/admin/posts/:id/status` | 🔒 Admin | Update post status |

**Allowed status body:** `{ "status": "Planned" }`

**Status transition flow:**  
`Under Review` → `Planned` → `In Progress` → `Completed`

---

## Authentication Explanation

### How It Works

1. **Signup**: User provides name, email, password. Server creates account and returns a `verificationToken` (simulated — no real email).
2. **Verify email**: `GET /auth/verify-email?token=<token>` marks the account as verified.
3. **Login**: Server validates credentials, creates an access token (15 min) and refresh token (7 days), stores the refresh token in the database, and sets both in **httpOnly cookies**.
4. **Making requests**: The browser automatically sends the `accessToken` cookie. The `authenticate` middleware verifies it on every protected route.
5. **Token refresh**: When the access token expires, the frontend calls `POST /auth/refresh`. The server reads the `refreshToken` cookie, verifies it, checks it matches the stored DB value (prevents reuse), issues a new pair, overwrites the DB value (rotation), and sets new cookies.
6. **Logout**: Server clears the refresh token from the DB and tells the client to clear cookies.

### Why httpOnly Cookies?

Storing JWTs in `localStorage` exposes them to XSS attacks. An `httpOnly` cookie cannot be read by JavaScript — only sent automatically by the browser with each request.

### Refresh Token Rotation

Each time the refresh token is used, a brand-new refresh token is issued and the old one is invalidated. If a stolen token is replayed, the DB check fails.

---

## Architecture Decisions

### routes → controllers → services → models

- **Routes**: Wire up middleware and call controllers
- **Controllers**: Thin — call one service function, send one response  
- **Services**: All business logic lives here (validation, DB queries, auth checks)
- **Models**: Mongoose schemas with indexes

### Atomic Voting

Voting uses a **single `findOneAndUpdate`** call:
```js
Post.findOneAndUpdate(
  { _id: postId, voters: { $ne: userId } },  // only if NOT already voted
  { $addToSet: { voters: userId }, $inc: { voteCount: 1 } },
  { new: true }
)
```
This prevents race conditions and duplicate votes without a read-modify-write cycle.

### Denormalised Counts

`voteCount` and `commentCount` are stored on the Post document. This avoids counting array lengths or running aggregations on every list query — much more performant at scale.

### Threaded Comments

Comments store a `parentComment` ObjectId. The service fetches all comments flat (one DB query) and builds the nested tree in JavaScript memory. Simple and avoids recursive DB queries.

---

## Common Interview Questions

**Q: Why httpOnly cookies instead of localStorage for JWTs?**  
A: httpOnly cookies are inaccessible to JavaScript, so XSS attacks can't steal the token. localStorage is vulnerable to any JS running on the page.

**Q: How does refresh token rotation work?**  
A: Every refresh rotates the refresh token — a new token is issued and the old one is invalidated in the DB. If an attacker replays an old refresh token after the legitimate user has already refreshed, the DB check fails and login is required.

**Q: Why not use a read-check-write pattern for voting?**  
A: It creates a race condition — two requests at the same time could both read "not voted", then both write a vote. The atomic `findOneAndUpdate` with the filter `{ voters: { $ne: userId } }` makes the database the single source of truth and handles concurrency correctly.

**Q: What is $addToSet and how does it help?**  
A: `$addToSet` only adds a value to an array if it doesn't already exist. Combined with the filter that requires the user NOT to be in voters, we get a bulletproof duplicate-prevention in one DB round-trip.

**Q: Why store the refresh token in the database?**  
A: So we can invalidate it on logout and detect reuse. A JWT is stateless and can't be "revoked" — storing it server-side gives us that control.

**Q: What does Zod do in this project?**  
A: Zod validates and coerces incoming request data (body, query params) before it reaches the service layer. It catches bad input early and returns structured field-level error messages.

**Q: Why Helmet?**  
A: Helmet sets HTTP response headers like `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` that protect against common web vulnerabilities (clickjacking, MIME sniffing, etc.).

**Q: How does the threaded comment tree work?**  
A: All comments for a post are fetched in a single flat query sorted by `createdAt`. We then build a map of `commentId → comment` and iterate to push each reply into its parent's `replies` array. Simple O(n) in-memory operation.

**Q: What are the MongoDB indexes and why?**  
A: 
- `User.email` — unique index, fast login lookups
- `Post` text index on `title` + `description` — enables `$text` search
- `Post.status + createdAt` — filters the roadmap view sorted by newest
- `Post.category + status` — filters by category and status simultaneously
- `Post.voteCount` — sorts by "most upvoted"
- `Comment.post + createdAt` — fetches all comments for a post in order

---

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── db.js               # Mongoose connection
│   ├── constants/
│   │   └── index.js            # Roles, categories, statuses, transitions
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── posts.controller.js
│   │   ├── votes.controller.js
│   │   ├── comments.controller.js
│   │   └── admin.controller.js
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication
│   │   ├── rbac.js             # Role-based access control
│   │   ├── validate.js         # Zod validation factory
│   │   └── errorHandler.js     # Central error handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Post.js
│   │   └── Comment.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── posts.routes.js
│   │   ├── comments.routes.js
│   │   └── admin.routes.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── posts.service.js
│   │   ├── votes.service.js
│   │   ├── comments.service.js
│   │   └── admin.service.js
│   ├── utils/
│   │   ├── jwt.js              # Token sign/verify helpers
│   │   ├── cookie.js           # Cookie option helpers
│   │   └── response.js         # Standardised JSON response helpers
│   ├── validators/
│   │   ├── auth.js             # Zod schemas for auth
│   │   ├── posts.js            # Zod schemas for posts
│   │   ├── comments.js         # Zod schemas for comments
│   │   └── query.js            # Zod schema for GET /posts query params
│   ├── app.js                  # Express app setup
│   └── server.js               # Entry point
├── tests/
│   ├── helpers.js
│   ├── auth.test.js
│   ├── posts.test.js
│   ├── votes.test.js
│   ├── comments.test.js
│   └── admin.test.js
├── scripts/
│   └── seed.js
├── .env
├── .env.example
├── package.json
└── README.md
```
