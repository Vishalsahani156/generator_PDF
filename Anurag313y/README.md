# Invoice Generator Dashboard

MERN stack project — all code lives in this folder (`Anurag313y`).

```
Anurag313y/
├── frontend/        # React (Vite) + Tailwind + TanStack Query
├── backend/         # Express + Mongoose API
├── docker-compose.yml   # (added later when you ask for Docker setup)
└── README.md
```

## Install dependencies

**Backend**

```bash
cd backend
npm install
```

**Frontend**

```bash
cd frontend
npm install
```

## Environment files

**Backend** — copy and edit:

```bash
cd backend
copy .env.example .env
```

**Frontend** — optional:

```bash
cd frontend
copy .env.example .env
```

## Run (without Docker for now)

MongoDB in Docker will be set up in this folder when you request it. Until then, the backend needs a running MongoDB at `MONGO_URI` (default `mongodb://127.0.0.1:27017/invoice_generator`).

**Terminal 1 — API**

```bash
cd backend
npm run dev
```

**Terminal 2 — UI**

```bash
cd frontend
npm run dev
```

## Test health endpoint

With the backend running:

- Browser: http://localhost:5001/api/health
- Or: `curl http://localhost:5001/api/health`

> Port **5001** is used because Docker often occupies **5000** on Windows.

The frontend uses `/api` in dev — Vite proxies requests to the backend (no CORS issues). **Restart the frontend** after changing `.env` or `vite.config.js`.

### React Query (TanStack Query)

- API calls use `useQuery` / `useMutation` hooks in `frontend/src/hooks/`
- DevTools panel available in development (bottom-left of the app)

## Next step

Auth + MongoDB models implementation (separate prompt).
