/**
 * Where people land after signing in, and which area of the app belongs to
 * which role. Browser-safe, so the login form, the server and the tests share it.
 */
export type AppRole = "user" | "donor" | "admin" | string | undefined;

export const ADMIN_HOME = "/admin";
export const MEMBER_HOME = "/dashboard";

export function homeFor(role: AppRole): string {
  return role === "admin" ? ADMIN_HOME : MEMBER_HOME;
}

/** Only allow redirects back into this app (no other sites, no auth pages). */
export function isSafeNext(raw: string | null | undefined): raw is string {
  return Boolean(raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") && !raw.startsWith("/auth") && !raw.startsWith("/api"));
}

/**
 * The page to open after login.
 *
 * Admins always start in the admin console. A `next` link only wins when it
 * points inside the console: public buttons such as "Request blood" link into
 * the member dashboard, and following them used to strand admins there.
 * Members go back to the page they were opening, but never into the console.
 */
export function postLoginPath(role: AppRole, next?: string | null): string {
  const home = homeFor(role);
  if (!isSafeNext(next)) return home;
  if (role === "admin") return next.startsWith(ADMIN_HOME) ? next : home;
  return next.startsWith(ADMIN_HOME) ? home : next;
}
