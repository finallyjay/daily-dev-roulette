import { DAILY_OAUTH_CLIENT_ID, DAILY_OAUTH_CLIENT_SECRET } from "astro:env/server";

// "Sign in with daily.dev" — authorization code flow with PKCE (S256) for a
// confidential client. Docs: https://docs.daily.dev/oauth-apps/
const ISSUER = "https://api.daily.dev/auth";
const AUTHORIZE_URL = `${ISSUER}/oauth2/authorize`;
const TOKEN_URL = `${ISSUER}/oauth2/token`;
const REVOKE_URL = `${ISSUER}/oauth2/revoke`;
// Tokens are bound to one resource; without it they work with neither API.
const RESOURCE = "https://api.daily.dev/public/v1";
// `write` is what lets the trigger delete bookmarks. The user can untick it on
// the consent screen, in which case DELETE answers 403 insufficient_scope.
const SCOPE = "openid profile offline_access read write";

export type TokenSet = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

/** Non-2xx from the token endpoint; 400/401 mean the grant itself is dead. */
export class TokenError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }

  get invalidGrant(): boolean {
    return this.status === 400 || this.status === 401;
  }
}

export function oauthEnabled(): boolean {
  return Boolean(DAILY_OAUTH_CLIENT_ID && DAILY_OAUTH_CLIENT_SECRET);
}

export function isExpectedIssuer(iss: string | null): boolean {
  // RFC 9207: when the server sends `iss`, it must be the one we started with.
  return iss === null || iss === ISSUER;
}

/** Callback URL registered on the OAuth app. Must match one of them exactly. */
export function redirectUri(requestUrl: URL): string {
  // Behind Vercel's proxy the request host can read as localhost, so deployed
  // builds use a known origin; dev uses whatever origin the server is on.
  // Previews use the branch alias (stable per branch, so it can be registered);
  // sign in from that URL, not the per-deployment one, or the state cookie won't match.
  const branchUrl = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL;
  const origin = branchUrl
    ? `https://${branchUrl}`
    : import.meta.env.PROD
      ? import.meta.env.SITE
      : requestUrl.origin;
  return new URL("/api/auth/callback", origin).toString();
}

function randomToken(bytes = 32): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("base64url");
}

/** Fresh per-sign-in values: CSRF `state` and the PKCE verifier/challenge. */
export async function newAuthRequest() {
  const state = randomToken();
  const verifier = randomToken(48);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = Buffer.from(digest).toString("base64url");
  return { state, verifier, challenge };
}

export function authorizeUrl(opts: { redirectUri: string; state: string; challenge: string }) {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: DAILY_OAUTH_CLIENT_ID!,
    redirect_uri: opts.redirectUri,
    scope: SCOPE,
    resource: RESOURCE,
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

async function tokenRequest(params: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...params,
      resource: RESOURCE,
      client_id: DAILY_OAUTH_CLIENT_ID!,
      client_secret: DAILY_OAUTH_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TokenError(
      `daily.dev token ${params.grant_type} -> ${res.status} ${body}`,
      res.status,
    );
  }
  return (await res.json()) as TokenSet;
}

/** Trades the callback `code` for tokens. Only ever runs server-side. */
export function exchangeCode(opts: { code: string; verifier: string; redirectUri: string }) {
  return tokenRequest({
    grant_type: "authorization_code",
    code: opts.code,
    code_verifier: opts.verifier,
    redirect_uri: opts.redirectUri,
  });
}

/** Refresh tokens rotate: the response carries a new one and the old one dies. */
export function refreshTokens(refreshToken: string) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

/** Best-effort revoke on sign-out; the cookies are cleared regardless. */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const res = await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token: refreshToken,
      token_type_hint: "refresh_token",
      client_id: DAILY_OAUTH_CLIENT_ID!,
      client_secret: DAILY_OAUTH_CLIENT_SECRET!,
    }),
  }).catch((err) => {
    console.error("[auth:revoke] ", err);
    return undefined;
  });
  if (res && !res.ok) console.error(`[auth:revoke] daily.dev -> ${res.status}`);
}
