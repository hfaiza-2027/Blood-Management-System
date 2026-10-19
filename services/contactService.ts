import { dataCall } from "./client";

export interface ContactInput { name: string; email: string; phone?: string; topic: string; message: string; website?: string }

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
  status: "new" | "read" | "resolved";
  createdAt: string;
  handledBy?: string;
}

export const contactService = {
  submit: (input: ContactInput) => dataCall<{ ok: boolean }>("contact", "submit", { input }),
  list: () => dataCall<ContactMessage[]>("contactMessages", "list"),
  setStatus: (id: string, status: ContactMessage["status"]) => dataCall<{ id: string; status: string }>("contactMessages", "setStatus", { id, status }),
  newCount: async () => (await dataCall<{ count: number }>("contactMessages", "newCount")).count,
};
