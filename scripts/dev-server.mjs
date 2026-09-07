// Starts the Astro dev server in the foreground for the Playwright webServer.
//
// `astro dev` detects AI-agent environments (via am-i-vibing: CLAUDECODE,
// AI_AGENT, CURSOR_TRACE_ID, ...) and daemonises itself, so the CLI process
// exits right away and Playwright aborts with "Process from config.webServer
// exited early". There is no opt-out, so we use Astro's programmatic API,
// which always runs in the foreground and reads astro.config.* like the CLI.
import { dev } from "astro";

await dev({});
