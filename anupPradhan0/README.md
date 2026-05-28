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

## API

| Method | Path              | Auth | Body                  |
| ------ | ----------------- | ---- | --------------------- |
| POST   | `/api/auth/login` | no   | `{ email, password }` |
| POST   | `/api/auth/logout`| no   | —                     |
| GET    | `/api/auth/me`    | yes  | —                     |

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
