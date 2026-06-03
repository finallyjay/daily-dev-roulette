import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

// Server output so our /api routes run as Vercel serverless functions.
// All daily.dev calls go through them, keeping the token off the client.
export default defineConfig({
  output: "server",
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
