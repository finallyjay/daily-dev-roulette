# 🎲 Bookmark Roulette

A daily.dev hackathon project. Your bookmarks pile up and rot — this forces a reckoning. One spin serves one bookmark: **read it** (spared) or **pull the trigger** (deleted forever). Funny, but it actually drains your backlog.

## Two ways to play

- **Demo mode** — click "Play the demo." Runs entirely in the browser on a fake bookmark pile. No account, no token, no daily.dev Plus required. This is the headline experience and always works.
- **Real mode** — paste a daily.dev API token (Settings → API, requires Plus). The token is validated server-side and stored in an httpOnly cookie; every API call is proxied through Astro server routes, so the token never touches client JS and there are no CORS issues. Deletes hit the real `DELETE /bookmarks/{id}` endpoint.

## Run locally

```bash
npm install
npm run dev      # http://localhost:4321
```

Optional: copy `.env.example` to `.env` and set `DAILY_TOKEN` to enable a server-side demo account (not required for demo mode).

## Deploy

Targets Vercel out of the box (`@astrojs/vercel`, `output: "server"`). Push and import, or `vercel`.

## Architecture

- `src/pages/index.astro` — login + the roulette game (single client island)
- `src/pages/api/auth.ts` — sign in (validate token → set cookie) / sign out
- `src/pages/api/bookmarks/*` — server-side proxy: list + delete
- `src/lib/daily.ts` — daily.dev Public API client (server only)
- `src/lib/session.ts` — httpOnly cookie session
- `src/lib/mock.ts` — demo-mode fake bookmarks

## API notes

daily.dev's Public API is REST + Bearer personal tokens (no OAuth), and requires Plus. Endpoints used: `GET /bookmarks/`, `DELETE /bookmarks/{id}` (also available: search, move-to-list, folders). See `spike/spike.mjs` for a standalone API probe.
