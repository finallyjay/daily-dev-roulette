import { defineConfig, envField } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

// Server output so our /api routes run as Vercel serverless functions.
// All daily.dev calls go through them, keeping the token off the client.
export default defineConfig({
  // Canonical production URL — used as a fallback when building absolute OG/
  // canonical URLs (behind Vercel's proxy the request host can read as localhost).
  site: "https://daily-dev-roulette.vercel.app",
  output: "server",
  // "Sign in with daily.dev" OAuth app credentials. Optional: when unset, the
  // OAuth button is hidden and only the personal-token sign-in is offered.
  env: {
    schema: {
      DAILY_OAUTH_CLIENT_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      DAILY_OAUTH_CLIENT_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  adapter: vercel({
    // Inject the Vercel Web Analytics script in production.
    webAnalytics: { enabled: true },
  }),
  // Tailwind v4 via the Vite plugin (the @astrojs/tailwind integration is
  // deprecated for v4).
  vite: {
    plugins: [tailwindcss()],
  },
});
