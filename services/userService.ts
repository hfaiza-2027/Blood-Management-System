import type { AccountStatus, User } from "@/types";
import { mockUsers } from "@/data/mockUsers";
import { dataCall, mock, USE_MOCKS } from "./client";
export const userService = {
  async list(): Promise<User[]> { return USE_MOCKS ? mock(mockUsers) : dataCall<User[]>("users","list"); },
  async update(user: User): Promise<User> { return USE_MOCKS ? mock(user,600) : dataCall<User>("users","update",{user}); },
  /** Save part of the signed-in member's own profile. */
  async updateSelf(patch: Partial<User> & { id: string }): Promise<Partial<User>> { return USE_MOCKS ? mock(patch,500) : dataCall<Partial<User>>("users","update",{user:patch}); },
  /** Sign the member out of every device (revokes all sessions). */
  async signOutEverywhere(): Promise<{ ok: boolean }> { return USE_MOCKS ? mock({ ok: true },600) : dataCall<{ ok: boolean }>("users","revokeSessions"); },
  async setStatus(id:string,status:AccountStatus){ return USE_MOCKS ? mock({id,status},400) : dataCall<{id:string;status:AccountStatus}>("users","setStatus",{id,status}); },
  async verify(id:string){ return USE_MOCKS ? mock({id,verified:true},400) : dataCall<{id:string;verified:boolean}>("users","verify",{id}); },
  async remove(id:string){ return USE_MOCKS ? mock({id},500) : dataCall<{id:string}>("users","remove",{id}); },
};
