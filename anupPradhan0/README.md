# Full-stack Monorepo (pnpm workspace)

```
.
├── frontend/   Vite + React + TypeScript + TanStack Query
├── backend/    Node.js + Express + TypeScript + Mongoose
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json    (root — runs both apps with one command)
```

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm` once, or use corepack: `corepack enable`)
- Docker (for MongoDB only)

## Run

### 1. Start MongoDB

```bash
docker compose up -d
```

`mongo:7` on `localhost:27017`, database `appdb`, persisted to named volume `mongo-data`.

### 2. Install dependencies (once)

From the repo root:

```bash
pnpm install
```

This installs root + `backend/` + `frontend/` in one pass.

### 3. Start backend + frontend together

```bash
pnpm dev
```

This runs both apps concurrently with prefixed output:

- backend → `http://localhost:4000`
- frontend → `http://localhost:5173`

Want only one?

```bash
pnpm dev:backend
pnpm dev:frontend
```

### 4. Seed the default user

```bash
pnpm seed
```

Creates:

- email: `admin@example.com`
- password: `password123`

## Auth Flow

- App boot calls `GET /api/auth/me`.
- On `401`, the router redirects to `/login/auth`.
- `POST /api/auth/login` returns a JWT, stored in `localStorage` and as an
  httpOnly cookie (server-side).
- `POST /api/auth/logout` clears both.

## Feature: Events + PDF export

Once signed in, the dashboard at `/` lets you:

- Add events with **name**, **time/date**, **number**, and **location**.
- Delete events.
- Download all your events as a single multi-page A4 PDF, styled in the same
  blue palette as the UI. The backend uses `pdfkit` and computes how many
  event cards fit per page, paginating manually so content never overflows.

## API

### Auth

| Method | Path                 | Auth | Body                          | Response                              |
| ------ | -------------------- | ---- | ----------------------------- | ------------------------------------- |
| POST   | `/api/auth/register` | no   | `{ email, password, name? }`  | `{ token, user }` (201)               |
| POST   | `/api/auth/login`    | no   | `{ email, password }`         | `{ token, user }`                     |
| POST   | `/api/auth/logout`   | no   | —                             | `{ ok: true }` and clears the cookie  |
| GET    | `/api/auth/me`       | yes  | —                             | `{ user }`                            |

### Events

All routes require auth. Send the JWT as `Authorization: Bearer <token>` or
rely on the `token` httpOnly cookie set on login.

| Method | Path                  | Body                                       | Response                          |
| ------ | --------------------- | ------------------------------------------ | --------------------------------- |
| GET    | `/api/events`         | —                                          | `{ events: EventItem[] }`         |
| POST   | `/api/events`         | `{ name, datetime, number, location }`     | `{ event: EventItem }` (201)      |
| DELETE | `/api/events/:id`     | —                                          | `{ ok: true }` or `404`           |
| GET    | `/api/events/pdf`     | —                                          | `application/pdf` (download)      |

`EventItem`: `{ id, name, datetime (ISO), number, location }`

## Root scripts

- `pnpm dev` — start backend + frontend together
- `pnpm dev:backend` — backend only
- `pnpm dev:frontend` — frontend only
- `pnpm build` — build both
- `pnpm seed` — seed default user

## Environment

### backend/.env

```
PORT=4000
MONGO_URI=mongodb://localhost:27017/appdb
JWT_SECRET=replace-me-with-a-long-random-string
CORS_ORIGIN=http://localhost:5173
```

### frontend/.env

```
VITE_API_URL=http://localhost:4000/api
```
