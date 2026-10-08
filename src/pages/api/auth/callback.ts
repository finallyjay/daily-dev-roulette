import type { APIRoute } from "astro";
import { exchangeCode, isExpectedIssuer, oauthEnabled, redirectUri } from "../../../lib/oauth";
import { setOAuthSession, takeOAuthRequest } from "../../../lib/session";

// GET /api/auth/callback?code&state — daily.dev sends the user back here.
// Every failure lands on the hub with a `login` reason the page turns into a message.
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  if (!oauthEnabled()) return redirect("/?login=unavailable");

  const pending = takeOAuthRequest(cookies);
  const params = url.searchParams;

  if (params.get("error") === "access_denied") return redirect("/?login=denied");

  const code = params.get("code");
  if (
    !code ||
    !pending ||
    params.get("state") !== pending.state ||
    !isExpectedIssuer(params.get("iss"))
  ) {
    return redirect("/?login=failed");
  }

  try {
    const tokens = await exchangeCode({
      code,
      verifier: pending.verifier,
      redirectUri: redirectUri(url),
    });
    setOAuthSession(cookies, tokens);
  } catch (err) {
    console.error("[auth:callback] ", err);
    return redirect("/?login=failed");
  }

  return redirect("/?login=ok");
};
