# <img src="public/favicon.svg" alt="" width="32" height="32" align="top" /> daily.dev Roulette

[![Play it live](https://img.shields.io/website?url=https%3A%2F%2Fdaily-dev-roulette.vercel.app&label=play%20it%20live&up_message=online&logo=vercel)](https://daily-dev-roulette.vercel.app)
[![CI](https://github.com/finallyjay/daily-dev-roulette/actions/workflows/ci.yml/badge.svg)](https://github.com/finallyjay/daily-dev-roulette/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Astro](https://img.shields.io/github/package-json/dependency-version/finallyjay/daily-dev-roulette/astro?logo=astro&color=BC52EE)](https://astro.build)
[![Node 24](https://img.shields.io/badge/node-24.x-5FA04E?logo=nodedotjs&logoColor=white)](./package.json)
[![Tested with Playwright](https://img.shields.io/badge/tested%20with-Playwright-2EAD33?logo=playwright&logoColor=white)](./tests/e2e)

A daily.dev hackathon project. Put your daily.dev habits on the line, one spin at a time. It's built as a hub of "roulette" modes — the first (and currently only) mode is **Bookmarks Roulette**, with room to add more.

<p align="center">
  <img src="docs/home.png" alt="The hub: a WANTED poster for Bookmarks Roulette with Sign in with daily.dev and the Demo" width="380" />
  <img src="docs/roulette.png" alt="Bookmarks Roulette: spin the cylinder, then spare or shoot each bookmark" width="380" />
</p>

## Bookmarks Roulette

Your bookmarks pile up and rot — this forces a reckoning. One spin serves one bookmark: **read it** (spared) or **pull the trigger** (deleted forever). Funny, but it actually drains your backlog.

### Two ways to play

- **Demo mode** — runs entirely in the browser on a fake bookmark pile. No account, no token required. This is the headline experience and always works.
- **Real mode** — **Sign in with daily.dev** (OAuth, authorization code + PKCE; no Plus subscription needed). Tokens are stored in httpOnly cookies and access tokens are refreshed server-side; every API call is proxied through Astro server routes, so no token ever touches client JS and there are no CORS issues. Deletes hit the real `DELETE /bookmarks/{id}` endpoint.

The deployed app never asks for a personal API token. Under `pnpm dev` only, a "paste an API token" form is available, since daily.dev's OAuth can't redirect to localhost.

## Run locally

```bash
pnpm install
pnpm dev      # http://localhost:4321
```

## Deploy

Targets Vercel out of the box (`@astrojs/vercel`, `output: "server"`). Push and import, or `vercel`. No env vars required (demo mode is fully client-side).

## Architecture

- `src/layouts/Layout.astro` — shared shell: global styles + header (avatar/name + sign out)
- `src/pages/index.astro` — the hub: sign-in + the list of roulette modes
- `src/pages/roulette.astro` — Bookmarks Roulette game (demo via `?demo=1`, else requires login)
- `src/pages/api/auth/index.ts` — sign in with a token (validate → set cookie) / sign out
- `src/pages/api/auth/login.ts`, `callback.ts` — "Sign in with daily.dev" OAuth flow (`src/lib/oauth.ts`)
- `src/middleware.ts` — refreshes expiring OAuth access tokens before each request
- `src/pages/api/bookmarks/*` — server-side proxy: list (paginated) + delete
- `src/lib/daily.ts` — daily.dev Public API client (server only): bookmarks + profile
- `src/lib/auth.ts` — resolves the current user from the session cookie
- `src/lib/session.ts` — httpOnly cookie session
- `src/lib/mock.ts` — demo-mode fake bookmarks

## API notes

daily.dev's Public API is REST + Bearer tokens (personal tokens or [OAuth app](https://docs.daily.dev/oauth-apps/) tokens), available to any daily.dev account. Set `DAILY_OAUTH_CLIENT_ID` / `DAILY_OAUTH_CLIENT_SECRET` (see `.env.example`) to enable sign-in; without them a deployment only offers the demo. Endpoints used: `GET /bookmarks/` (cursor-paginated), `DELETE /bookmarks/{id}`, `GET /profile/`. Other resources exist (feeds, follows, tech stack) — candidates for future roulette modes. See `spike/spike.mjs` for a standalone API probe.
