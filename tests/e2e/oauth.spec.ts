import { test, expect } from "@playwright/test";

// "Sign in with daily.dev" (src/pages/api/auth/login.ts + callback.ts).
//
// The dev server runs with a fake OAuth app (see playwright.config.ts), so the
// button renders and /api/auth/login really builds the authorize redirect.
// That redirect is read with maxRedirects: 0 rather than followed (page.route()
// can't intercept the target of a server-side 302), so daily.dev is never hit.
// page.request shares the context's cookie jar, so the pending-state cookie
// it receives is the one the callback later checks. The code-for-token
// exchange happens server-side and can't be mocked from here, so only the
// callback's rejection paths (which never reach daily.dev) are covered.

const AUTHORIZE = "https://api.daily.dev/auth/oauth2/authorize";

test.describe("sign in with daily.dev", () => {
  test("redirects to daily.dev's consent screen with PKCE and the public API resource", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#oauth-signin")).toHaveAttribute("href", "/api/auth/login");

    const res = await page.request.get("/api/auth/login", { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    const authorize = new URL(res.headers()["location"]);
    expect(`${authorize.origin}${authorize.pathname}`).toBe(AUTHORIZE);

    const params = authorize.searchParams;
    expect(params.get("response_type")).toBe("code");
    expect(params.get("client_id")).toBe("test-client-id");
    expect(params.get("redirect_uri")).toBe("http://localhost:4321/api/auth/callback");
    expect(params.get("resource")).toBe("https://api.daily.dev/public/v1");
    expect(params.get("scope")?.split(" ")).toEqual(
      expect.arrayContaining(["read", "write", "offline_access"]),
    );
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("code_challenge")).toMatch(/^[\w-]{43}$/);
    expect(params.get("state")).toBeTruthy();
    // The secret never leaves the server.
    expect(authorize.toString()).not.toContain("test-client-secret");
  });

  test("a callback with a forged state is rejected", async ({ page }) => {
    // Starts a real sign-in, so a pending-state cookie exists, then forges the reply.
    await page.request.get("/api/auth/login", { maxRedirects: 0 });

    await page.goto("/api/auth/callback?code=abc&state=not-the-real-state");

    await expect(page).toHaveURL("/"); // ?login= is stripped client-side
    await expect(page.locator("#login-error")).toHaveText(
      "Sign-in with daily.dev misfired. Give it another shot.",
    );
  });

  test("a callback with no sign-in in progress is rejected", async ({ page }) => {
    await page.goto("/api/auth/callback?code=abc&state=xyz");

    await expect(page.locator("#login-error")).toHaveText(
      "Sign-in with daily.dev misfired. Give it another shot.",
    );
  });

  test("declining on daily.dev lands back on the hub with a message", async ({ page }) => {
    await page.goto("/api/auth/callback?error=access_denied&state=xyz");

    await expect(page).toHaveURL("/");
    await expect(page.locator("#login-error")).toHaveText(
      "You turned daily.dev down. No hard feelings, partner.",
    );
    await expect(page.locator("#oauth-signin")).toBeVisible();
  });
});
