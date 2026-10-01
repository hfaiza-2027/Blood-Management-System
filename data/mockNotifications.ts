import type { Notification } from "@/types";

export const mockNotifications: Notification[] = [
  { id: "n1", kind: "emergency_nearby", title: "O- needed at Shalimar Heart & Trauma Centre", body: "3 units for a road accident patient, 6.8 km from you. Needed within 4 hours.", createdAt: "2026-09-27T08:32:00+05:00", read: false, href: "/dashboard/blood-requests?tab=emergency" },
  { id: "n2", kind: "donor_responded", title: "A donor responded to REQ-24073", body: "Ali Raza (A-compatible) offered to donate for Parveen Akhtar at Ravi Valley General Hospital.", createdAt: "2026-09-27T07:10:00+05:00", read: false, href: "/dashboard/requests/r-3007" },
  { id: "n3", kind: "emergency_nearby", title: "O+ needed urgently in Shadman", body: "2 units for emergency surgery, 7.1 km from you.", createdAt: "2026-09-27T10:02:00+05:00", read: false, href: "/dashboard/blood-requests?tab=emergency" },
  { id: "n4", kind: "appointment_reminder", title: "Appointment booked for 14 Nov", body: "Canal View Donation Centre at 11:00, the first week you are eligible again. We will remind you the day before.", createdAt: "2026-09-26T18:00:00+05:00", read: true, href: "/dashboard/donations" },
  { id: "n5", kind: "request_accepted", title: "Your request REQ-24122 was approved", body: "We're now matching compatible donors near Ravi Valley General Hospital.", createdAt: "2026-09-27T05:50:00+05:00", read: true, href: "/dashboard/requests/r-3014" },
  { id: "n6", kind: "request_fulfilled", title: "REQ-24059 fulfilled", body: "All 2 units for Ghulam Rasool have been donated. Thank you for coordinating.", createdAt: "2026-09-17T13:20:00+05:00", read: true, href: "/dashboard/requests/r-3005" },
  { id: "n7", kind: "account_verified", title: "Donor profile verified", body: "Your verified badge is now visible to people searching for donors.", createdAt: "2026-08-14T11:00:00+05:00", read: true },
  { id: "n8", kind: "announcement", title: "Blood drive at Punjab University, 5 Oct", body: "The DHA Mobile Donation Unit will be at the Old Campus from 10:00 to 16:00.", createdAt: "2026-09-25T09:00:00+05:00", read: false },
];
