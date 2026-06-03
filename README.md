# 🎲 daily.dev Roulette

[![CI](https://github.com/finallyjay/daily-dev-roulette/actions/workflows/ci.yml/badge.svg?event=pull_request)](https://github.com/finallyjay/daily-dev-roulette/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A daily.dev hackathon project. Put your daily.dev habits on the line, one spin at a time. It's built as a hub of "roulette" modes — the first (and currently only) mode is **Bookmarks Roulette**, with room to add more.

## Bookmarks Roulette

Your bookmarks pile up and rot — this forces a reckoning. One spin serves one bookmark: **read it** (spared) or **pull the trigger** (deleted forever). Funny, but it actually drains your backlog.

### Two ways to play

- **Demo mode** — runs entirely in the browser on a fake bookmark pile. No account, no token, no daily.dev Plus required. This is the headline experience and always works.
- **Real mode** — sign in with a daily.dev API token (Settings → API, requires Plus). The token is validated server-side and stored in an httpOnly cookie; every API call is proxied through Astro server routes, so the token never touches client JS and there are no CORS issues. Deletes hit the real `DELETE /bookmarks/{id}` endpoint.

## Run locally

```bash
npm install
npm run dev      # http://localhost:4321
```

## Deploy

Targets Vercel out of the box (`@astrojs/vercel`, `output: "server"`). Push and import, or `vercel`. No env vars required (demo mode is fully client-side).

## Architecture

- `src/layouts/Layout.astro` — shared shell: global styles + header (avatar/name + sign out)
- `src/pages/index.astro` — the hub: sign-in + the list of roulette modes
- `src/pages/roulette.astro` — Bookmarks Roulette game (demo via `?demo=1`, else requires login)
- `src/pages/api/auth.ts` — sign in (validate token → set cookie) / sign out
- `src/pages/api/bookmarks/*` — server-side proxy: list (paginated) + delete
- `src/lib/daily.ts` — daily.dev Public API client (server only): bookmarks + profile
- `src/lib/auth.ts` — resolves the current user from the session cookie
- `src/lib/session.ts` — httpOnly cookie session
- `src/lib/mock.ts` — demo-mode fake bookmarks

## API notes

daily.dev's Public API is REST + Bearer personal tokens (no OAuth), and requires Plus. Endpoints used: `GET /bookmarks/` (cursor-paginated), `DELETE /bookmarks/{id}`, `GET /profile/`. Other resources exist (feeds, follows, tech stack) — candidates for future roulette modes. See `spike/spike.mjs` for a standalone API probe.
