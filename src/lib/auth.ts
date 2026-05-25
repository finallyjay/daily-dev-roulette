import type { AstroCookies } from "astro";
import { getProfile, type Profile } from "./daily";
import { getToken, clearSession } from "./session";

// Resolves the signed-in user for a page render. Returns null when logged out.
// If the stored token is rejected (expired/revoked), the session is cleared.
export async function currentUser(cookies: AstroCookies): Promise<Profile | null> {
  const token = getToken(cookies);
  if (!token) return null;
  try {
    return await getProfile(token);
  } catch {
    clearSession(cookies);
    return null;
  }
}
