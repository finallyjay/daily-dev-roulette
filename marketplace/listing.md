# Marketplace listing

The fields of the daily.dev marketplace plugin, kept here so updates start from what is live. The SKILL.md field is [`SKILL.md`](./SKILL.md). The About field can't contain links or images.

## Name

daily.dev Roulette

## Link

https://daily-dev-roulette.vercel.app

## Short description

Your bookmarks pile up and rot. Spin the cylinder and one forgotten bookmark comes up: spare it and go read it, or pull the trigger and it's deleted from daily.dev for good. Try the demo first, no account needed.

## About

<!-- about:start -->

## What it is

A Wild West duel against your bookmark backlog. Every link you saved "for later" and never opened is an outlaw. Spin the cylinder, one bookmark comes up, and you decide: **spare it** (go read it) or **pull the trigger** (it's removed from your daily.dev bookmarks, for good).

## How to play

1. **Spin** the cylinder to draw a random bookmark.
2. **Face the outlaw**: title, source, read time and when you saved it.
3. **Read 'em or bury 'em.** Your tally of buried and pardoned bookmarks is kept for the run.

Bookmarks come in batches of 50. Clear a batch and you ride on to older ones, so the most forgotten bookmarks get their turn too.

## Demo mode

Runs entirely in your browser on a fake bookmark pile. No account, no token, nothing is deleted.

## Agent skill

Prefer the terminal? The included SKILL.md lets your coding agent run the same duel through the daily.dev MCP server or the Public API, one bookmark at a time, and it only removes a bookmark when you explicitly pull the trigger.

## API quota

Playing uses your daily.dev API quota, which is shared with your other tokens, apps and agents, and is small on free accounts. The app keeps it lean: loading the roulette costs two requests (your profile and one batch of 50 bookmarks), plus one per bookmark you shoot.

## Access it asks for

Sign in with daily.dev (OAuth). The app never asks for a personal API token. It requests:

- **read**: to list your bookmarks
- **write**: only used to delete a bookmark when you pull the trigger. You can untick it on the consent screen and still browse.
- **profile / openid**: to show your name and avatar
- **offline_access**: to refresh the session while you play

Tokens live in httpOnly cookies (8-hour session) and every API call goes through the app's server. No bookmarks or personal data are stored; your browser only remembers which batch you were on. Signing out revokes the token.

## Built with

Astro on Vercel, open source under the MIT license.

<!-- about:end -->
