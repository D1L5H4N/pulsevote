# PulseVote — Real-Time Live Polling Platform

> **HCL GUVI Developer Internship Project**

A production-ready real-time polling platform where users create polls, share links, and watch votes stream in live — no page refresh, no polling APIs, true WebSocket-powered real-time.

---

## Live Demo

| Service  | URL |
|----------|-----|
| Frontend | `https://pulsevote.vercel.app` *(update after deploy)* |
| Backend  | `https://pulsevote-api.onrender.com` *(update after deploy)* |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        React (Vercel)                        │
│  LandingPage │ Auth │ Dashboard │ CreatePoll │ Results       │
│  axios REST calls        WebSocket (useWebSocket hook)       │
└───────────────┬─────────────────────────┬───────────────────┘
                │ HTTPS REST              │ WSS WebSocket
                ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Go / Gin (Render)                          │
│                                                              │
│  /api/auth/*      → auth.Handler                            │
│  /api/polls/*     → poll.Handler                            │
│  /api/polls/:id/vote → vote.Handler                         │
│  /ws/polls/:id    → websocket.Handler → Hub                 │
│                                                              │
│  JWT Middleware  │  CORS  │  Input Validation               │
└──────┬──────────────────────────────┬────────────────────────┘
       │ mongo-driver                  │ go-redis
       ▼                               ▼
┌──────────────┐              ┌────────────────────────────────┐
│  MongoDB     │              │  Redis (Upstash)               │
│  (Atlas)     │              │                                │
│  users       │              │  Counters:                     │
│  polls       │              │  pulsevote:poll:{id}:option:{n}│
│  votes       │              │                                │
│              │              │  Pub/Sub:                      │
│  Source of   │              │  Channel: pulsevote:poll:{id}  │
│  Truth       │              │  Real-time driver              │
└──────────────┘              └────────────────────────────────┘
```

---

## Real-Time Vote Flow (Sequence Diagram)

```
User          React          Go/Gin         MongoDB        Redis         WebSocket Clients
 │              │               │               │              │                │
 │──click──────►│               │               │              │                │
 │              │──POST /vote──►│               │              │                │
 │              │               │──validate──►  │              │                │
 │              │               │  poll active  │              │                │
 │              │               │  no duplicate │              │                │
 │              │               │──InsertOne───►│              │                │
 │              │               │◄──saved───────│              │                │
 │              │               │──INCR counter─────────────►  │                │
 │              │               │──MGET counts──────────────►  │                │
 │              │               │◄──counts──────────────────── │                │
 │              │               │──compute %s   │              │                │
 │              │               │──PUBLISH results──────────►  │                │
 │              │◄──results─────│               │    Redis Pub/Sub delivers      │
 │              │               │               │    to Hub goroutine ──────────►│
 │              │               │               │              │  WS broadcast ►│
 │◄──UI update──│               │               │              │                │
```

---

## Tech Stack

| Layer     | Technology          | Why                                                                 |
|-----------|---------------------|---------------------------------------------------------------------|
| Frontend  | React + Vite + TypeScript | Component model ideal for live-updating UI                    |
| Styling   | Tailwind CSS        | Utility-first, consistent design system                             |
| Charts    | Recharts            | Animated, accessible charts with smooth re-renders                  |
| Backend   | Go + Gin            | Goroutine-per-connection model, excellent WebSocket support          |
| Database  | MongoDB Atlas       | Flexible document model for polls/votes, compound indexes           |
| Realtime  | Redis Pub/Sub       | Decouples vote ingestion from WebSocket broadcast                   |
| Auth      | JWT (HS256)         | Stateless, works well with Vercel → Render CORS setup               |

---

## Project Structure

```
pulsevote/
├── frontend/                          # React + Vite app (deployed to Vercel)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Sticky nav, mobile-responsive
│   │   │   └── ProtectedRoute.tsx     # Auth guard with redirect
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # JWT + user state, localStorage session
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts        # Auto-reconnecting WS hook
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx        # SaaS-style hero + features
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx      # Stats + poll table
│   │   │   ├── CreatePollPage.tsx     # Dynamic options form
│   │   │   ├── PollSharePage.tsx      # Copy link + QR code
│   │   │   ├── VotingPage.tsx         # Public voting UI
│   │   │   └── ResultsPage.tsx        # Live results (Recharts + WS)
│   │   ├── services/
│   │   │   └── api.ts                 # Axios instance + typed API calls
│   │   ├── App.tsx                    # React Router config
│   │   └── index.css                  # Design system + animations
│   ├── .env.example
│   └── package.json
│
└── backend/                           # Go service (deployed to Render)
    ├── cmd/server/main.go             # Entry point, graceful shutdown
    ├── configs/config.go              # Env var loader, fail-fast validation
    ├── routes/router.go               # Gin router, dependency wiring
    ├── internal/
    │   ├── auth/                      # Register, Login, JWT
    │   │   ├── models.go
    │   │   ├── repository.go          # MongoDB CRUD
    │   │   ├── service.go             # bcrypt, JWT generation
    │   │   └── handler.go             # HTTP handlers
    │   ├── poll/                      # Poll CRUD + lifecycle
    │   │   ├── models.go              # active/closed/expired status
    │   │   ├── repository.go
    │   │   ├── service.go             # lazy expiration, ownership
    │   │   └── handler.go
    │   ├── vote/                      # Vote submission + results
    │   │   ├── models.go
    │   │   ├── repository.go          # compound unique index
    │   │   ├── service.go             # Redis INCR + MongoDB fallback
    │   │   └── handler.go
    │   ├── websocket/
    │   │   ├── hub.go                 # Per-poll rooms + Redis sub
    │   │   └── handler.go             # WS upgrade
    │   ├── middleware/auth.go          # JWT Bearer validation
    │   ├── mongodb/client.go
    │   └── redis/
    │       ├── client.go
    │       └── pubsub.go
    ├── go.mod
    └── .env.example
```

---

## Local Development Setup

### Prerequisites

Install the following:

1. **Go 1.21+** — https://go.dev/dl/
   - Windows: Download the `.msi` installer and run it
   - Verify: open a new terminal and run `go version`

2. **Node.js 18+** — https://nodejs.org/
   - Windows: Download the LTS `.msi` installer
   - Verify: `node --version` and `npm --version`

3. **MongoDB Atlas** — https://cloud.mongodb.com (free tier works)
   - Create a cluster → get the connection string

4. **Upstash Redis** — https://upstash.com (free tier works)
   - Create a database → get the `rediss://` URL

---

### Backend Setup

```bash
# 1. Enter backend directory
cd backend

# 2. Copy env file and fill in your values
cp .env.example .env
# Edit .env with your MongoDB URI, Redis URL, JWT secret

# 3. Download dependencies
go mod tidy

# 4. Run the server
go run ./cmd/server/main.go

# Server starts on http://localhost:8080
# Health check: http://localhost:8080/health
```

### Frontend Setup

```bash
# 1. Enter frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Copy env file (leave values empty for local dev — Vite proxy handles it)
cp .env.example .env

# 4. Start dev server
npm run dev

# App opens on http://localhost:5173
# API calls proxied to localhost:8080 automatically
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 8080) |
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string |
| `DB_NAME` | No | Database name (default: pulsevote) |
| `JWT_SECRET` | **Yes** | Long random string for JWT signing |
| `REDIS_URL` | **Yes** | Upstash Redis URL (`rediss://...`) |
| `REDIS_PASSWORD` | No | Usually embedded in REDIS_URL |
| `FRONTEND_URL` | No | Vercel URL for CORS (default: localhost:5173) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend URL (empty = Vite proxy for local dev) |
| `VITE_WS_URL` | No | WebSocket URL (empty = Vite proxy for local dev) |

---

## Deployment Guide

### 1. Backend → Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → **Web Service**
3. Connect your GitHub repo, select the `backend` directory
4. Set:
   - **Build Command**: `go build -o server ./cmd/server`
   - **Start Command**: `./server`
5. Add all environment variables from `backend/.env.example`
6. Set `FRONTEND_URL` to your Vercel URL (after deploying frontend)
7. Deploy → note your Render URL (e.g., `https://pulsevote-api.onrender.com`)

### 2. Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → import your GitHub repo
2. Set root directory to `frontend`
3. Add environment variables:
   - `VITE_API_URL` = `https://pulsevote-api.onrender.com`
   - `VITE_WS_URL`  = `wss://pulsevote-api.onrender.com`
4. Deploy → note your Vercel URL
5. **Go back to Render** and update `FRONTEND_URL` to your Vercel URL

---

## Key Engineering Decisions

### Why Redis Pub/Sub for real-time?

Redis Pub/Sub decouples the vote ingestion path from the WebSocket broadcast. When a vote arrives, the Go handler publishes a single message to Redis. Any number of hub goroutines subscribed to that channel (across multiple server instances) receive it and broadcast to their local WebSocket clients. This design scales horizontally without a single bottleneck.

### Why one Redis subscription per poll room?

Each poll room has exactly one Redis subscription goroutine regardless of how many WebSocket clients are watching. This prevents N subscriptions for N viewers and means Redis only sends one message per vote per active poll — efficient at any audience size.

### Redis-first, MongoDB-fallback for results

When Redis is warm (normal operation), vote counts are fetched with a single `MGET` (one network round-trip). If Redis restarts or keys expire, the service detects all-zero counters and rebuilds from MongoDB votes, then restores Redis. This ensures correctness at the cost of one slower request on cold-start.

### Voter fingerprinting with SHA-256

For anonymous voters, we hash `IP + "|" + User-Agent` with SHA-256 and store the hex digest. This provides basic duplicate-vote prevention without storing PII. **Limitations**: shared NAT (office networks) or VPNs can bypass this; so can clearing browser data. For an internship project, this is a reasonable trade-off — enterprise solutions would use signed cookies or device fingerprinting.

### Poll status lifecycle (active → closed | expired)

Three states (vs a boolean `isActive`) makes the API more expressive and enables accurate dashboard stats. Expiration is "lazy" — polls are marked expired the first time they are fetched after their deadline, avoiding the need for a background cron job.

### Ownership enforcement in the service layer

Poll close and delete operations check `poll.CreatorID == requestingUserID` inside the service, not just at the middleware level. This prevents bypass if routes are ever misconfigured.

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login, receive JWT |
| GET | `/api/polls/:id` | No | Get poll |
| POST | `/api/polls/:id/vote` | No | Submit vote |
| GET | `/api/polls/:id/results` | No | Get current results |
| GET | `/api/polls` | JWT | List creator's polls |
| POST | `/api/polls` | JWT | Create poll |
| PATCH | `/api/polls/:id/close` | JWT | Close poll (owner only) |
| DELETE | `/api/polls/:id` | JWT | Delete poll (owner only) |
| GET | `/api/dashboard` | JWT | Dashboard stats |
| GET | `/ws/polls/:id` | No | WebSocket upgrade |
| GET | `/health` | No | Health check |

---

## Duplicate Vote Prevention — Limitations

The current approach hashes `IP + User-Agent`. This is not foolproof:
- Users behind NAT share an IP — one person can prevent others from voting
- Clearing cookies or changing User-Agent bypasses the check
- The MongoDB unique index on `(poll_id, voter_fingerprint)` provides a hard database-level guard against race conditions

For production, consider signed HTTP-only cookies as a more reliable voter identifier.

## Progressive Web App (PWA)

Quorum supports installation as a Progressive Web App (PWA).

Features:

- Installable on Android
- Installable on iPhone/iPad
- Installable on Desktop
- Home-screen support
- Standalone fullscreen mode
- Automatic updates
- Offline asset caching

The Quorum logo is used as the application icon across all supported platforms.

---

*Built for the HCL GUVI Developer Internship*
