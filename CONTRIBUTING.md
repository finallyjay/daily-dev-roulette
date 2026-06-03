# Contributing to daily.dev Roulette

Thanks for your interest in contributing! This project started as a daily.dev
hackathon hack, and it's built to grow — the long-term idea is a hub of
"roulette" modes, so new modes and improvements are very welcome.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By
participating, you're expected to uphold it. Report unacceptable behavior to
**finallyjay@gmail.com**.

## Getting started

```bash
git clone https://github.com/finallyjay/daily-dev-roulette.git
cd daily-dev-roulette
npm install
npm run dev      # http://localhost:4321
```

No environment variables are required — **demo mode** (`/roulette?demo=1`) runs
entirely in the browser on a fake bookmark pile, so you can develop without a
daily.dev Plus account or token.

Optionally, copy `.env.example` to `.env` and set `DAILY_TOKEN` to power the
"Try the demo" button with a real token (see the file for details).

## Project layout

See the **Architecture** section of the [README](./README.md) for a file-by-file
map. In short:

- `src/pages/` — routes (hub, roulette, and the `api/` server proxy)
- `src/lib/` — server-only daily.dev client, session/auth, and demo data
- `src/layouts/` — shared shell

## Making a change

1. **Open an issue first** for anything non-trivial, so we can agree on the
   approach before you invest time.
2. Create a branch off `main`: `git checkout -b my-feature`.
3. Keep changes focused — one logical change per pull request.
4. Match the existing style: TypeScript, Astro components, and the current
   conventions. Linting and formatting are enforced in CI:
   - `npm run lint` — [oxlint](https://oxc.rs) (fast Rust linter)
   - `npm run format` — [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html)
     to auto-format, or `npm run format:check` to verify
     (oxfmt is still alpha and does not format `.astro` files yet, so keep those
     tidy by hand.)
5. **Test your change**: `npm test` runs the Playwright E2E suite against the
   demo flow. Also exercise it manually with `npm run dev` (and real mode if you
   have Plus), and run `npm run build` to confirm the production build passes.

All of the above (`lint`, `format:check`, `build`, `test`) run automatically on
every pull request via GitHub Actions, and must pass before a PR can be merged.

## Security

The daily.dev token is sensitive. Never log it, never expose it to client JS,
and keep all token handling inside the server-side `src/lib/` and `src/pages/api/`
code. If you find a vulnerability, please follow [SECURITY.md](./SECURITY.md)
instead of opening a public issue.

## Pull requests

- Fill out the pull request template.
- Reference the issue your PR addresses (e.g. "Closes #12").
- Make sure `npm run build` succeeds.
- Be patient and kind in review — this is a small, friendly project.

## Ideas for new roulette modes

daily.dev's Public API exposes more than bookmarks (feeds, follows, tech stack).
Those are great candidates for future roulette modes — see the **API notes** in
the README and `spike/spike.mjs` for a standalone API probe.

Thanks for helping put daily.dev habits on the line, one spin at a time. 🎲
