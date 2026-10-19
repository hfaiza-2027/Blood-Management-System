import type { AccountStatus, User } from "@/types";
import { dataCall } from "./client";

export const userService = {
  list: () => dataCall<User[]>("users", "list"),
  update: (user: User) => dataCall<User>("users", "update", { user }),
  /** Save part of the signed-in member's own profile. */
  updateSelf: (patch: Partial<User> & { id: string }) => dataCall<Partial<User>>("users", "update", { user: patch }),
  /** Sign the member out of every device (revokes all sessions). */
  signOutEverywhere: () => dataCall<{ ok: boolean }>("users", "revokeSessions"),
  setStatus: (id: string, status: AccountStatus) => dataCall<{ id: string; status: AccountStatus }>("users", "setStatus", { id, status }),
  verify: (id: string) => dataCall<{ id: string; verified: boolean }>("users", "verify", { id }),
  remove: (id: string) => dataCall<{ id: string }>("users", "remove", { id }),
};
