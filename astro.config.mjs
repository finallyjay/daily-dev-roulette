import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";

// Server output so our /api routes run as Vercel serverless functions.
// All daily.dev calls go through them, keeping the token off the client.
export default defineConfig({
  output: "server",
  adapter: vercel({
    // Inject the Vercel Web Analytics script in production.
    webAnalytics: { enabled: true },
  }),
});
