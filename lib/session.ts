import { redirect } from "next/navigation";
import type { User } from "@/types";
import { authService } from "@/services/authService";
import { USE_MOCKS } from "@/services/client";
import { currentAdmin } from "@/data/mockUsers";

/** Server-side: the signed-in user, or null when there's no valid session. */
export async function getSessionUserOrNull(area: "user" | "admin" = "user"): Promise<User | null> {
  // Demo mode has no real sessions: show the demo member or the demo admin.
  if (USE_MOCKS) return area === "admin" ? currentAdmin : authService.getCurrentUser();
  try {
    return await authService.getCurrentUser();
  } catch {
    return null;
  }
}

/** Server-side: the signed-in user, or a redirect to log in. */
export async function requireUser(area: "user" | "admin" = "user"): Promise<User> {
  const user = await getSessionUserOrNull(area);
  if (!user) redirect(area === "admin" ? "/auth/login?next=/admin" : "/auth/login?next=/dashboard");
  return user;
}
