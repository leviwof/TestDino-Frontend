# TestDino Frontend

Next.js 14 (App Router) + Tailwind CSS frontend for TestDino — generate tailored
interview-prep kits, watch generation progress, and practice questions/flashcards.

It talks to the [TestDino backend](https://github.com/leviwof/TestDino-Backend),
deployed at **https://testdino-backend.onrender.com**.

## Requirements

- Node.js >= 20

## Setup

```bash
npm install
npm run dev      # http://localhost:3000
```

By default the app points at the deployed backend, so it works with no extra
config. To run against a local backend instead:

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the dev server                         |
| `npm run build`     | Production build                             |
| `npm start`         | Serve the production build                   |
| `npm run typecheck` | `tsc --noEmit`                               |
| `npm test`          | Run the test suite (vitest)                  |

## Backend URL

The API base URL comes from `NEXT_PUBLIC_API_BASE_URL`. It is **public** (exposed
to the browser) and **baked in at build time** — set it before `next build`, not
just at runtime. If unset, it falls back to the deployed backend (see
[`lib/config.ts`](./lib/config.ts)). It is not a secret.

## Deploy

### Vercel (recommended for Next.js)
1. Import this repo.
2. Add env var `NEXT_PUBLIC_API_BASE_URL=https://testdino-backend.onrender.com`.
3. Deploy (Vercel auto-detects Next.js; no config needed).

### Render / Docker
- Render (Node web service): build `npm ci && npm run build`, start `npm start`,
  and set `NEXT_PUBLIC_API_BASE_URL` in the environment.
- Docker: `docker build --build-arg NEXT_PUBLIC_API_BASE_URL=<backend-url> -t testdino-frontend .`

After deploying, add the frontend's URL to the backend's `CORS_ORIGIN` env var.
