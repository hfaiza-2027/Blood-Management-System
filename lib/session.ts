import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@/types";
import { authService } from "@/services/authService";
import { ApiError } from "@/services/client";
import { homeFor } from "@/lib/routing";

/**
 * Server-side: the signed-in user, or null when there's no valid session.
 * Wrapped in React's cache() so the layout and the page share one session check per request.
 *
 * Only a missing or rejected session counts as signed out. A temporary server
 * problem is re-thrown so the page shows its retry screen instead of sending a
 * signed-in person back to the login page.
 */
export const getSessionUserOrNull = cache(async (): Promise<User | null> => {
  try {
    return await authService.getCurrentUser();
  } catch (e) {
    if (e instanceof ApiError && [401, 404, 503].includes(e.status)) return null;
    throw e;
  }
});

/** For public pages: any problem simply means "show the signed-out view". */
export async function getSessionUserQuietly(): Promise<User | null> {
  try {
    return await getSessionUserOrNull();
  } catch {
    return null;
  }
}

/** Server-side: the signed-in user, or a redirect to log in. */
export async function requireUser(area: "user" | "admin" = "user"): Promise<User> {
  const user = await getSessionUserOrNull();
  if (!user) redirect(area === "admin" ? "/auth/login?next=/admin" : "/auth/login?next=/dashboard");
  return user;
}

/** Server-side: signed-in people skip the auth screens and go to their own home. */
export async function redirectIfSignedIn() {
  const user = await getSessionUserQuietly();
  if (user && user.status !== "suspended" && user.status !== "inactive") redirect(homeFor(user.role));
}
