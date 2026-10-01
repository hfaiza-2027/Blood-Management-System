import type { Donation } from "@/types";
import { BLOOD_GROUPS } from "@/lib/constants";
import { mockHospitals } from "./mockHospitals";

const centers = mockHospitals.filter((h) => h.type !== "hospital" || h.id === "h1");

/** The signed-in donor's own history (Ahmed Hassan, O+). */
export const myDonations: Donation[] = [
  { id: "dn-9001", donorId: "d-self", donorName: "Ahmed Hassan", bloodGroup: "O+", centerId: "h6", centerName: "Canal View Donation Centre", city: "Lahore", date: "2026-11-14", units: 1, status: "scheduled" },
  { id: "dn-9002", donorId: "d-self", donorName: "Ahmed Hassan", bloodGroup: "O+", centerId: "h4", centerName: "Model Town Thalassaemia & Blood Bank", city: "Lahore", date: "2026-06-28", units: 1, status: "completed", certificateId: "QTR-C-88412" },
  { id: "dn-9003", donorId: "d-self", donorName: "Ahmed Hassan", bloodGroup: "O+", centerId: "h1", centerName: "Ravi Valley General Hospital", city: "Lahore", date: "2026-03-21", units: 1, status: "completed", certificateId: "QTR-C-81077", linkedRequestCode: "REQ-23788" },
  { id: "dn-9004", donorId: "d-self", donorName: "Ahmed Hassan", bloodGroup: "O+", centerId: "h6", centerName: "Canal View Donation Centre", city: "Lahore", date: "2025-12-13", units: 1, status: "completed", certificateId: "QTR-C-76503" },
  { id: "dn-9005", donorId: "d-self", donorName: "Ahmed Hassan", bloodGroup: "O+", centerId: "h5", centerName: "Iqbal Town Community Blood Bank", city: "Lahore", date: "2025-10-02", units: 1, status: "deferred" },
  { id: "dn-9006", donorId: "d-self", donorName: "Ahmed Hassan", bloodGroup: "O+", centerId: "h4", centerName: "Model Town Thalassaemia & Blood Bank", city: "Lahore", date: "2025-06-21", units: 1, status: "completed", certificateId: "QTR-C-66230" },
  { id: "dn-9007", donorId: "d-self", donorName: "Ahmed Hassan", bloodGroup: "O+", centerId: "h8", centerName: "DHA Mobile Donation Unit", city: "Lahore", date: "2025-02-08", units: 1, status: "completed", certificateId: "QTR-C-60918" },
  { id: "dn-9008", donorId: "d-self", donorName: "Ahmed Hassan", bloodGroup: "O+", centerId: "h6", centerName: "Canal View Donation Centre", city: "Lahore", date: "2024-09-14", units: 1, status: "cancelled" },
];

const NAMES = ["Ayesha Siddiqui", "Bilal Chaudhry", "Hira Nadeem", "Kamran Javed", "Rabia Anwar", "Faisal Mehmood", "Ali Raza", "Maryam Khalid", "Hamza Sheikh", "Saad Butt", "Amna Yousaf", "Omer Farooq"];
const STATUSES: Donation["status"][] = ["completed", "completed", "completed", "completed", "scheduled", "deferred", "cancelled"];

/** Platform-wide donation records for admin screens. */
export const allDonations: Donation[] = [
  ...myDonations,
  ...Array.from({ length: 34 }, (_, i): Donation => {
    const c = centers[i % centers.length];
    const status = STATUSES[(i * 5) % STATUSES.length];
    const day = new Date(Date.UTC(2026, 8, 26) - i * 2.3 * 86_400_000);
    if (status === "scheduled") day.setUTCDate(day.getUTCDate() + 10);
    return {
      id: `dn-${9100 + i}`,
      donorId: `d-${2001 + i}`,
      donorName: NAMES[i % NAMES.length],
      bloodGroup: BLOOD_GROUPS[(i * 3) % 8],
      centerId: c.id,
      centerName: c.name,
      city: c.city,
      date: day.toISOString().slice(0, 10),
      units: 1,
      status,
      certificateId: status === "completed" ? `QTR-C-${90000 + i * 37}` : undefined,
    };
  }),
];
