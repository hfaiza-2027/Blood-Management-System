import type { AppointmentInput, Donation } from "@/types";
import { dataCall } from "./client";

export const donationService = {
  listMine: () => dataCall<Donation[]>("donations", "listMine"),
  listAll: () => dataCall<Donation[]>("donations", "listAll"),
  bookAppointment: (input: AppointmentInput) => dataCall<Donation>("donations", "bookAppointment", { input }),
  updateStatus: (id: string, status: Donation["status"]) =>
    dataCall<{ id: string; status: Donation["status"]; certificateId?: string }>("donations", "updateStatus", { id, status }),
};
