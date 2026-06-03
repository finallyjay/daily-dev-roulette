# Security Policy

## Supported versions

This is a small hackathon project under active, informal development. Only the
latest `main` branch is supported — security fixes land there.

| Version | Supported |
| ------- | --------- |
| `main`  | ✅        |
| older   | ❌        |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately so they can be fixed before disclosure:

- Preferred: open a [private security advisory](https://github.com/finallyjay/daily-dev-roulette/security/advisories/new)
  on GitHub, **or**
- Email **finallyjay@gmail.com** with the details.

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce (a proof of concept if possible).
- Any suggested remediation.

You can expect an initial acknowledgement within a few days. Once the issue is
confirmed and fixed, we're happy to credit you in the release notes unless you
prefer to stay anonymous.

## Scope and sensitive data

The most sensitive asset in this app is the **daily.dev API token**:

- The token is validated server-side and stored in an **httpOnly cookie**, so it
  is never exposed to client-side JavaScript.
- All daily.dev API calls are proxied through Astro server routes
  (`src/pages/api/`), so the token never reaches the browser and there are no
  CORS workarounds.

Reports about token leakage, session handling, the server-side proxy, or any way
to exfiltrate the token are especially appreciated.
