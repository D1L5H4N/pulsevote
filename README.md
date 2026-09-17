# Quorum — Real-Time Live Polling Platform

> A production-ready, full-stack real-time polling application built with Go, React, MongoDB, and Redis.

Quorum lets users create polls, share them instantly via link or QR code, and watch every vote stream in live — no page refresh, no polling APIs, true WebSocket-powered real-time updates. Your audience votes, you see it happen.

---

## 🌐 Live Demo

| Service  | URL |
|----------|-----|
| **Frontend** | [https://pulsevote-gamma.vercel.app](https://pulsevote-gamma.vercel.app) |
| **Backend**  | Deployed on Render (Go/Gin) |
| **GitHub**   | [D1L5H4N/pulsevote](https://github.com/D1L5H4N/pulsevote) |

---

## ✨ Feature Overview

### Core Features
- 🗳️ **Create Polls** — Up to 6 options, optional expiry deadline
- 🔗 **Instant Sharing** — Copy link or scan QR code
- ⚡ **Live Voting** — WebSocket-powered; votes appear for all viewers instantly
- 📊 **Real-Time Results** — Animated bar charts (Recharts) update as votes come in
- 🔐 **Authentication** — JWT-based login/register system
- 🗂️ **My Polls Dashboard** — Manage, close, and delete your polls
- 📋 **Poll Detail View** — View full stats and vote breakdown per option
- 📱 **Mobile Responsive** — Optimised for all screen sizes

### Progressive Web App (PWA)
- 📲 **Installable on Android** via Chrome/Edge — native install prompt
- 📲 **Installable on iPhone/iPad** via Safari — step-by-step guide modal
- 🖥️ **Installable on Desktop** — Windows/macOS/Linux Chrome/Edge
- 🏠 **Home Screen / Desktop Shortcut** support
- 📴 **Offline Asset Caching** via Workbox service worker
- 🔄 **Auto-Update** — New deployments apply automatically
- 🟣 **Download App button** in the navbar — one click to install

### UX & Design
- 🌑 **Dark-mode first** design system (slate-950 base)
- 🎨 **Violet/Purple gradient** branding throughout
- 🪄 **SplashScreen animation** — custom SVG logo assembles on first visit
- 📸 **QR Code Modal** — Canvas-based QR code with PNG download, copy link, and native share (Web Share API)
- 🖼️ **Landing Page** — SaaS-style hero with animated background orbs, features grid, use-cases
- 🧭 **Navbar** — Sticky, mobile hamburger menu, Download App button, auth-aware

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    React (Vercel)                             │
│  LandingPage │ Auth │ Dashboard │ CreatePoll │ Results        │
│  axios REST calls          WebSocket (useWebSocket hook)      │
└──────────────────┬──────────────────────────┬────────────────┘
                   │ HTTPS REST               │ WSS WebSocket
                   ▼                          ▼
┌──────────────────────────────────────────────────────────────┐
│                   Go / Gin (Render)                           │
│                                                               │
│  /api/auth/*         → auth.Handler                          │
│  /api/polls/*        → poll.Handler                          │
│  /api/polls/:id/vote → vote.Handler                          │
│  /ws/polls/:id       → websocket.Handler → Hub               │
│                                                               │
│  JWT Middleware  │  CORS  │  Input Validation                │
└────────┬─────────────────────────────────┬────────────────────┘
         │ mongo-driver                     │ go-redis
         ▼                                  ▼
┌──────────────────┐           ┌───────────────────────────────┐
│  MongoDB (Atlas) │           │  Redis (Upstash)              │
│                  │           │                               │
│  users           │           │  Counters:                    │
│  polls           │           │  pulsevote:poll:{id}:opt:{n}  │
│  votes           │           │                               │
│                  │           │  Pub/Sub:                     │
│  Source of Truth │           │  Channel: pulsevote:poll:{id} │
└──────────────────┘           └───────────────────────────────┘
```

---

## ⚡ Real-Time Vote Flow

```
User          React           Go/Gin          MongoDB        Redis          WS Clients
 │              │                │               │              │               │
 │──click──────►│                │               │              │               │
 │              │──POST /vote───►│               │              │               │
 │              │                │──validate──►  │              │               │
 │              │                │  poll active  │              │               │
 │              │                │  no duplicate │              │               │
 │              │                │──InsertOne───►│              │               │
 │              │                │◄──saved───────│              │               │
 │              │                │──INCR counter──────────────► │               │
 │              │                │──MGET counts───────────────► │               │
 │              │                │◄──counts──────────────────── │               │
 │              │                │──compute %s   │              │               │
 │              │                │──PUBLISH results───────────► │               │
 │              │◄──results──────│               │   Redis Pub/Sub delivers     │
 │              │                │               │   to Hub goroutine ─────────►│
 │              │                │               │              │  WS broadcast►│
 │◄──UI update──│                │               │              │               │
```

---

## 🛠️ Tech Stack

| Layer        | Technology                      | Purpose                                                            |
|--------------|---------------------------------|--------------------------------------------------------------------|
| **Frontend** | React 18 + Vite + TypeScript    | Component model ideal for live-updating UI                         |
| **Styling**  | Tailwind CSS                    | Utility-first, consistent dark-mode design system                  |
| **Charts**   | Recharts                        | Animated, accessible bar charts with smooth live re-renders        |
| **QR Code**  | qrcode.react (Canvas)           | High-resolution PNG QR generation, avoids XML/SVG download issues  |
| **Icons**    | Lucide React                    | Consistent, lightweight SVG icon set                               |
| **Routing**  | React Router DOM v6             | Client-side SPA routing, nested protected routes                   |
| **Backend**  | Go 1.21 + Gin                   | Goroutine-per-connection, excellent WebSocket support               |
| **Auth**     | JWT HS256 (golang-jwt)          | Stateless, works well with Vercel → Render CORS setup              |
| **Database** | MongoDB Atlas                   | Flexible document model for polls/votes, compound indexes          |
| **Realtime** | Redis Pub/Sub (Upstash)         | Decouples vote ingestion from WebSocket broadcast                   |
| **WS**       | Gorilla WebSocket               | Per-poll WebSocket hub with Redis subscription                     |
| **PWA**      | vite-plugin-pwa + Workbox       | Service worker, offline caching, auto-update, installable          |
| **Deploy**   | Vercel (frontend) + Render (backend) | Zero-downtime deployments via GitHub push                     |

---

## 📁 Project Structure

```
quorum/
├── frontend/                              # React + Vite app (→ Vercel)
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── apple-touch-icon.png           # iOS home screen icon
│   │   ├── pwa-192x192.png               # PWA icon (small)
│   │   ├── pwa-512x512.png               # PWA icon (large + maskable)
│   │   ├── quorum-icon.png               # App logo
│   │   ├── quorum-logo.png               # Full wordmark logo
│   │   └── quorum-q.png                  # Lettermark / favicon source
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx                 # Sticky nav, mobile menu, Download App button
│   │   │   ├── ProtectedRoute.tsx         # Auth guard, redirects to /login
│   │   │   ├── InstallPwaButton.tsx       # PWA install button (Android/Desktop prompt + iOS modal)
│   │   │   ├── QRCodeModal.tsx            # Full-screen QR modal — copy, share, PNG download
│   │   │   ├── PollCard.tsx              # Reusable poll card for dashboard/my-polls
│   │   │   ├── ResultsChart.tsx          # Recharts bar chart for live results
│   │   │   ├── SplashScreen.tsx          # Animated intro — SVG ring logo assembles on load
│   │   │   └── SplashScreen.css          # Splash keyframe animations
│   │   ├── context/
│   │   │   └── AuthContext.tsx            # JWT + user state, localStorage session management
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts            # Auto-reconnecting WebSocket hook
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx            # SaaS-style hero, features grid, use-cases, CTA
│   │   │   ├── LoginPage.tsx              # Email + password login form
│   │   │   ├── RegisterPage.tsx           # Username + email + password register form
│   │   │   ├── DashboardPage.tsx          # Stats overview + poll table (owner)
│   │   │   ├── MyPollsPage.tsx            # Paginated list of user's polls
│   │   │   ├── CreatePollPage.tsx         # Dynamic options form (2–6 options), expiry picker
│   │   │   ├── PollSharePage.tsx          # QR code + copy link + share after poll creation
│   │   │   ├── PollDetailPage.tsx         # Full poll stats breakdown, manage controls
│   │   │   ├── VotingPage.tsx             # Public voting UI (no auth required)
│   │   │   └── ResultsPage.tsx            # Live results with WebSocket + Recharts
│   │   ├── services/
│   │   │   └── api.ts                     # Axios instance + fully typed API calls
│   │   ├── App.tsx                        # Root component — routing + SplashScreen orchestration
│   │   ├── index.css                      # Global design system, animations, utilities
│   │   └── vite-env.d.ts
│   ├── index.html                         # Entry HTML, SEO meta tags
│   ├── vite.config.ts                     # Vite + PWA plugin + dev proxy config
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
│
└── backend/                               # Go service (→ Render)
    ├── cmd/server/main.go                 # Entry point, graceful shutdown (SIGINT/SIGTERM)
    ├── configs/config.go                  # Env var loader, fail-fast validation on startup
    ├── routes/router.go                   # Gin router, dependency wiring, CORS setup
    ├── internal/
    │   ├── auth/
    │   │   ├── models.go                  # User struct
    │   │   ├── repository.go              # MongoDB CRUD for users
    │   │   ├── service.go                 # bcrypt password hashing, JWT generation
    │   │   └── handler.go                 # HTTP handlers: POST /register, POST /login
    │   ├── poll/
    │   │   ├── models.go                  # Poll struct — active / closed / expired states
    │   │   ├── repository.go              # MongoDB CRUD for polls
    │   │   ├── service.go                 # Lazy expiration, ownership checks
    │   │   └── handler.go                 # HTTP handlers: CRUD + close + dashboard
    │   ├── vote/
    │   │   ├── models.go                  # Vote struct, VoteResult struct
    │   │   ├── repository.go              # MongoDB unique index on (poll_id, voter_fingerprint)
    │   │   ├── service.go                 # Redis INCR + MongoDB fallback on cold start
    │   │   └── handler.go                 # POST /vote + GET /results
    │   ├── websocket/
    │   │   ├── hub.go                     # Per-poll rooms, one Redis subscription per room
    │   │   └── handler.go                 # WebSocket upgrade handler
    │   ├── middleware/
    │   │   └── auth.go                    # JWT Bearer validation middleware
    │   ├── mongodb/
    │   │   └── client.go                  # MongoDB connection + ping on startup
    │   ├── redis/
    │   │   ├── client.go                  # Redis TLS connection (Upstash)
    │   │   └── pubsub.go                  # Pub/Sub helpers
    │   └── validation/                    # Input validation helpers
    ├── go.mod
    ├── go.sum
    └── .env.example
```

---

## 🔑 Pages & Routes

| Route                  | Auth Required | Description                                      |
|------------------------|:-------------:|--------------------------------------------------|
| `/`                    | No            | Landing page with hero, features, and CTA        |
| `/login`               | No            | Login form                                       |
| `/register`            | No            | Registration form                                |
| `/poll/:id`            | No            | Public voting page — anyone can vote             |
| `/results/:id`         | No            | Live results page — real-time bar chart          |
| `/dashboard`           | ✅ JWT         | Stats overview + poll list                       |
| `/my-polls`            | ✅ JWT         | Full paginated poll management list              |
| `/polls/create`        | ✅ JWT         | Create a new poll                                |
| `/polls/:id/share`     | ✅ JWT         | QR code + share page after poll creation         |
| `/polls/:id/detail`    | ✅ JWT         | Detailed poll breakdown with management controls |

---

## 📡 API Reference

| Method   | Path                        | Auth  | Description                           |
|----------|-----------------------------|:-----:|---------------------------------------|
| `POST`   | `/api/auth/register`        | No    | Create user account                   |
| `POST`   | `/api/auth/login`           | No    | Login, receive JWT                    |
| `GET`    | `/api/polls/:id`            | No    | Get poll details                      |
| `POST`   | `/api/polls/:id/vote`       | No    | Submit a vote                         |
| `GET`    | `/api/polls/:id/results`    | No    | Get current vote counts + percentages |
| `GET`    | `/api/polls`                | JWT   | List the authenticated user's polls   |
| `POST`   | `/api/polls`                | JWT   | Create a new poll                     |
| `PATCH`  | `/api/polls/:id/close`      | JWT   | Close a poll (owner only)             |
| `DELETE` | `/api/polls/:id`            | JWT   | Delete a poll (owner only)            |
| `GET`    | `/api/dashboard`            | JWT   | Dashboard stats (totals, active count)|
| `GET`    | `/ws/polls/:id`             | No    | WebSocket upgrade for live results    |
| `GET`    | `/health`                   | No    | Health check                          |

---

## 🎬 Splash Screen

The app opens with an animated **Quorum logo assembly** on every fresh session:

- 12 evenly-spaced dots on a true circle (center 230,230 radius 150) starting at 12 o'clock
- **Slot 5** is empty — occupied by an animated tail (curved arc)
- **Dots 9, 10, 11** (upper-left arc) start dimmed (`#31304a`) and illuminate full violet on cue
- **Phase 1 (0–1.8 s)** — dots fade in one by one with a stagger, tail draws itself
- **Phase 2 (1.8–2.8 s)** — dim dots illuminate; wordmark "Quorum" and tagline slide up
- **Phase 3 (2.8–3.3 s)** — everything fades to black, hands off to the main app
- Uses `sessionStorage` — only plays once per browser session (or when `?splash=1` param is present)
- Implemented as a React component (`SplashScreen.tsx`) with CSS keyframe animations

---

## 📲 Progressive Web App (PWA)

Quorum is a fully installable PWA powered by **vite-plugin-pwa** and **Workbox**.

### Installation

| Platform            | How to Install                                                      |
|---------------------|---------------------------------------------------------------------|
| **Android (Chrome)**| Click **"Download App"** in navbar → tap Install in native prompt   |
| **Desktop (Chrome/Edge)** | Click **"Download App"** in navbar or the install icon in the address bar |
| **iPhone/iPad (Safari)** | Click **"Download App"** → follow the 3-step guide (Share → Add to Home Screen → Add) |

### PWA Configuration (`vite.config.ts`)
- `registerType: 'autoUpdate'` — new app versions apply automatically
- `skipWaiting: true` + `clientsClaim: true` — immediate takeover on update
- `cleanupOutdatedCaches: true` — removes stale Workbox caches
- Icons: 192×192 and 512×512 PNG (maskable), Apple touch icon 180×180

### InstallPwaButton Component
- Detects `beforeinstallprompt` event (Chrome/Edge/Android)
- Detects iOS Safari via `navigator.userAgent`
- Hides itself when app is already running in standalone mode
- Shows native install dialog on Android/Desktop
- Shows a 3-step iOS Safari guide modal on iPhone/iPad

---

## 🧩 Component Reference

### `SplashScreen.tsx`
Animated intro screen. Assembles the Quorum ring logo with staggered dot animations, draws the tail arc, fades in the wordmark, then exits. Uses `sessionStorage` to show only once per session.

### `Navbar.tsx`
Sticky top navigation bar with:
- Quorum logo + wordmark (links to `/`)
- Desktop nav links (Dashboard, My Polls, Create Poll, Login/Register or Logout)
- Mobile hamburger menu with slide-down drawer
- `InstallPwaButton` (Download App) visible when PWA is installable

### `InstallPwaButton.tsx`
Handles cross-platform PWA installation:
- Android/Desktop: captures `beforeinstallprompt`, triggers native dialog on click
- iOS: detects Safari, shows a modal with a step-by-step visual guide
- Hides automatically when already installed (`display-mode: standalone`)

### `QRCodeModal.tsx`
Full-screen modal displayed from the Poll Share page and Poll Detail page:
- Renders QR code using `QRCodeCanvas` (HTML5 Canvas — no XML/SVG issues)
- **Copy Link** — copies the poll URL to clipboard with animated feedback
- **Share** — uses the native Web Share API (falls back gracefully)
- **Download Image** — exports the canvas as a high-resolution `.png` file

### `ResultsChart.tsx`
Recharts `BarChart` connected to WebSocket data. Animates on every vote update.

### `PollCard.tsx`
Reusable card component used in Dashboard and My Polls. Shows title, status badge, vote count, and action buttons.

### `ProtectedRoute.tsx`
Wraps protected pages. Reads JWT from `AuthContext`. Redirects to `/login` if no valid token is found.

---

## 🔐 Authentication & Security

| Concern                      | Implementation                                                              |
|------------------------------|-----------------------------------------------------------------------------|
| **Password storage**         | bcrypt (cost 12) — never stored in plaintext                                |
| **Session tokens**           | JWT HS256, stored in `localStorage`, sent as `Authorization: Bearer <token>`|
| **Protected routes**         | `ProtectedRoute` component + Go JWT middleware on all `/api/polls` mutations|
| **Ownership enforcement**    | `poll.CreatorID == requestingUserID` checked in the service layer           |
| **Duplicate vote prevention**| SHA-256 hash of `IP + "\|" + User-Agent` stored as `voter_fingerprint`      |
| **Database-level guard**     | MongoDB compound unique index on `(poll_id, voter_fingerprint)`             |
| **CORS**                     | `gin-contrib/cors` configured to allow only the Vercel frontend origin      |
| **Input validation**         | `go-playground/validator` on all request bodies                             |

> **Voter fingerprinting note:** The IP + User-Agent hash is a basic duplicate-prevention measure. It is not foolproof — shared NAT (office/university networks) or VPN changes can bypass it. For production, signed HTTP-only cookies or device fingerprinting would be more reliable.

---

## ⚙️ Engineering Decisions

### Why Redis Pub/Sub for real-time?
Vote ingestion and WebSocket broadcast are fully decoupled. When a vote arrives, the handler publishes one message to Redis. Any number of hub goroutines (across multiple server instances) subscribed to that channel receive it and broadcast to their local WebSocket clients. This scales horizontally without a central bottleneck.

### Why one Redis subscription per poll room?
Each active poll room has exactly **one** Redis subscription goroutine, regardless of how many WebSocket clients are watching. This prevents N subscriptions for N viewers and keeps Redis traffic at one message per vote per active poll.

### Redis-first, MongoDB-fallback for vote counts
On a hot system, vote counts are fetched with a single `MGET` (one network round-trip). If Redis restarts or keys expire, the service detects all-zero counters and rebuilds them from MongoDB votes, restoring Redis. This guarantees correctness while keeping the hot-path fast.

### Lazy poll expiration
Polls are not marked `expired` by a background cron. Instead, expiration is checked the first time the poll is fetched after its deadline has passed. This avoids running a scheduled job and is accurate enough for a polling platform.

### Poll status lifecycle
Three states (`active` → `closed` | `expired`) instead of a boolean `isActive` makes the API expressive, enables accurate dashboard statistics, and allows the UI to show the correct badge without ambiguity.

---

## 🖥️ Local Development

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Go** | 1.21+ | [go.dev/dl](https://go.dev/dl/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **MongoDB** | Atlas free tier | [cloud.mongodb.com](https://cloud.mongodb.com) |
| **Redis** | Upstash free tier | [upstash.com](https://upstash.com) |

---

### Backend Setup

```bash
cd backend

# Copy and fill in env values
cp .env.example .env

# Install Go dependencies
go mod tidy

# Start the server
go run ./cmd/server/main.go
# Runs on http://localhost:8080
# Health: http://localhost:8080/health
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file (Vite proxy handles API/WS routing in dev)
cp .env.example .env

# Start dev server
npm run dev
# Opens on http://localhost:5173
```

Vite automatically proxies `/api/*` → `http://localhost:8080` and `/ws/*` → `ws://localhost:8080`.

---

## 🌍 Environment Variables

### Backend (`backend/.env`)

| Variable           | Required | Default     | Description                               |
|--------------------|:--------:|-------------|-------------------------------------------|
| `PORT`             | No       | `8080`      | HTTP server port                          |
| `MONGODB_URI`      | **Yes**  | —           | MongoDB Atlas connection string           |
| `DB_NAME`          | No       | `pulsevote` | MongoDB database name                     |
| `JWT_SECRET`       | **Yes**  | —           | Long random string for JWT signing        |
| `REDIS_URL`        | **Yes**  | —           | Upstash Redis URL (`rediss://...`)        |
| `REDIS_PASSWORD`   | No       | —           | Usually embedded in `REDIS_URL`           |
| `FRONTEND_URL`     | No       | `http://localhost:5173` | Vercel URL for CORS          |

### Frontend (`frontend/.env`)

| Variable        | Required | Description                                       |
|-----------------|:--------:|---------------------------------------------------|
| `VITE_API_URL`  | No       | Backend URL (empty = Vite proxy for local dev)    |
| `VITE_WS_URL`   | No       | WebSocket URL (empty = Vite proxy for local dev)  |

---

## 🚀 Deployment

### Backend → Render

1. Push code to GitHub
2. Go to [render.com](https://render.com) → **New Web Service** → connect your repo
3. Set root directory to `backend`
4. Configure:
   - **Build Command:** `go build -o server ./cmd/server`
   - **Start Command:** `./server`
5. Add all environment variables from `backend/.env.example`
6. Set `FRONTEND_URL` to your Vercel URL
7. Deploy and note your Render URL

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo
2. Set root directory to `frontend`
3. Add environment variables:
   - `VITE_API_URL` = `https://your-render-service.onrender.com`
   - `VITE_WS_URL` = `wss://your-render-service.onrender.com`
4. Deploy
5. Go back to Render and update `FRONTEND_URL` to your Vercel URL

---

## 📦 Key Dependencies

### Frontend

| Package                  | Purpose                                              |
|--------------------------|------------------------------------------------------|
| `react` + `react-dom`    | UI framework                                         |
| `react-router-dom`       | Client-side routing                                  |
| `axios`                  | HTTP client with interceptors                        |
| `recharts`               | Animated charts for results page                     |
| `qrcode.react`           | Canvas-based QR code generation                      |
| `lucide-react`           | SVG icon library                                     |
| `vite-plugin-pwa`        | Service worker + PWA manifest generation             |
| `workbox-*`              | Offline caching, auto-update strategies              |
| `tailwindcss`            | Utility CSS framework                                |

### Backend

| Package                   | Purpose                                              |
|---------------------------|------------------------------------------------------|
| `gin-gonic/gin`           | HTTP router and middleware framework                 |
| `gin-contrib/cors`        | CORS middleware for Gin                              |
| `golang-jwt/jwt`          | JWT generation and validation                        |
| `gorilla/websocket`       | WebSocket server (per-connection goroutine model)    |
| `go.mongodb.org/mongo-driver` | Official MongoDB Go driver                      |
| `redis/go-redis`          | Redis client (supports TLS for Upstash)              |
| `golang.org/x/crypto`     | bcrypt for password hashing                          |
| `joho/godotenv`           | `.env` file loading                                  |
| `go-playground/validator` | Request body validation                              |

---

## 🧪 Verification Checklist

| Feature                         | Status |
|---------------------------------|--------|
| User registration & login       | ✅     |
| Create poll (2–6 options)       | ✅     |
| Vote on public poll (no auth)   | ✅     |
| Live results via WebSocket      | ✅     |
| Duplicate vote prevention       | ✅     |
| Poll close (owner)              | ✅     |
| Poll delete (owner)             | ✅     |
| Dashboard stats                 | ✅     |
| My Polls page                   | ✅     |
| Poll detail page                | ✅     |
| QR code modal (copy/share/PNG)  | ✅     |
| PWA install — Android/Desktop   | ✅     |
| PWA install — iOS Safari guide  | ✅     |
| Splash screen animation         | ✅     |
| Auto-update via service worker  | ✅     |
| Deployed to Vercel + Render     | ✅     |
| GitHub auto-deploy (push→live)  | ✅     |

---

## 📝 License

This project was built as a hands-on full-stack engineering exercise.

---

*Quorum — Where every vote counts, instantly.*
