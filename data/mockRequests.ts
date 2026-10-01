import type { BloodRequest, RequestStatus, Urgency, BloodGroup } from "@/types";
import { mockHospitals } from "./mockHospitals";
import { loc } from "./locations";

type Seed = {
  patient: string;
  age: number;
  group: BloodGroup;
  units: number;
  filled: number;
  hospital: string;
  urgency: Urgency;
  status: RequestStatus;
  reason: string;
  requester: string;
  requesterId: string;
  createdHoursAgo: number;
  neededInHours: number;
  contacted: number;
};

const seeds: Seed[] = [
  { patient: "Rukhsana Bibi", age: 54, group: "O-", units: 3, filled: 1, hospital: "h3", urgency: "emergency", status: "matching", reason: "Road traffic accident — internal bleeding", requester: "Imtiaz Ali", requesterId: "u-3100", createdHoursAgo: 2, neededInHours: 4, contacted: 14 },
  { patient: "Muhammad Ayaan", age: 7, group: "B+", units: 1, filled: 0, hospital: "h4", urgency: "urgent", status: "matching", reason: "Thalassaemia major — scheduled transfusion", requester: "Nadia Perveen", requesterId: "u-3101", createdHoursAgo: 6, neededInHours: 20, contacted: 9 },
  { patient: "Shahid Latif", age: 61, group: "A+", units: 2, filled: 0, hospital: "h1", urgency: "urgent", status: "pending", reason: "Coronary bypass surgery", requester: "Sadaf Latif", requesterId: "u-3102", createdHoursAgo: 3, neededInHours: 26, contacted: 0 },
  { patient: "Samina Akhtar", age: 29, group: "AB-", units: 2, filled: 0, hospital: "h2", urgency: "emergency", status: "matching", reason: "Postpartum haemorrhage", requester: "Kashif Akhtar", requesterId: "u-3103", createdHoursAgo: 1, neededInHours: 3, contacted: 6 },
  { patient: "Ghulam Rasool", age: 70, group: "O+", units: 2, filled: 2, hospital: "h7", urgency: "normal", status: "fulfilled", reason: "Hip replacement surgery", requester: "Ahmed Hassan", requesterId: "u-1001", createdHoursAgo: 240, neededInHours: -120, contacted: 11 },
  { patient: "Zoya Malik", age: 16, group: "B-", units: 1, filled: 0, hospital: "h2", urgency: "urgent", status: "donor_found", reason: "Dengue fever — low platelets", requester: "Tariq Malik", requesterId: "u-3104", createdHoursAgo: 9, neededInHours: 12, contacted: 5 },
  { patient: "Parveen Akhtar", age: 47, group: "A-", units: 4, filled: 2, hospital: "h1", urgency: "urgent", status: "partially_fulfilled", reason: "Chemotherapy support — acute leukaemia", requester: "Ahmed Hassan", requesterId: "u-1001", createdHoursAgo: 30, neededInHours: 18, contacted: 17 },
  { patient: "Arslan Yousaf", age: 34, group: "O+", units: 2, filled: 0, hospital: "h3", urgency: "emergency", status: "approved", reason: "Gunshot wound — emergency surgery", requester: "Shoaib Yousaf", requesterId: "u-3105", createdHoursAgo: 0.5, neededInHours: 2, contacted: 3 },
  { patient: "Nasreen Kausar", age: 58, group: "B+", units: 1, filled: 0, hospital: "h5", urgency: "normal", status: "pending", reason: "Anaemia — pre-operative top-up", requester: "Adeel Kausar", requesterId: "u-3106", createdHoursAgo: 14, neededInHours: 70, contacted: 0 },
  { patient: "Hassan Raza", age: 41, group: "AB+", units: 2, filled: 0, hospital: "h9", urgency: "normal", status: "matching", reason: "Kidney transplant", requester: "Mehreen Raza", requesterId: "u-3107", createdHoursAgo: 20, neededInHours: 96, contacted: 4 },
  { patient: "Farzana Sultana", age: 38, group: "O+", units: 3, filled: 3, hospital: "h10", urgency: "urgent", status: "fulfilled", reason: "Caesarean delivery complication", requester: "Junaid Sultan", requesterId: "u-3108", createdHoursAgo: 120, neededInHours: -96, contacted: 8 },
  { patient: "Rehan Qadir", age: 25, group: "A+", units: 1, filled: 0, hospital: "h11", urgency: "normal", status: "cancelled", reason: "Elective orthopaedic surgery", requester: "Qadir Baksh", requesterId: "u-3109", createdHoursAgo: 72, neededInHours: 24, contacted: 2 },
  { patient: "Sobia Naz", age: 31, group: "B+", units: 2, filled: 0, hospital: "h6", urgency: "urgent", status: "rejected", reason: "Duplicate of an existing request", requester: "Naz Begum", requesterId: "u-3110", createdHoursAgo: 50, neededInHours: 10, contacted: 0 },
  { patient: "Abdul Wahab", age: 66, group: "O-", units: 2, filled: 0, hospital: "h1", urgency: "normal", status: "pending", reason: "Gastrointestinal bleed — stable", requester: "Ahmed Hassan", requesterId: "u-1001", createdHoursAgo: 5, neededInHours: 50, contacted: 0 },
  { patient: "Laiba Shahzad", age: 9, group: "A+", units: 1, filled: 1, hospital: "h4", urgency: "normal", status: "fulfilled", reason: "Thalassaemia — monthly transfusion", requester: "Shahzad Anwar", requesterId: "u-3111", createdHoursAgo: 400, neededInHours: -360, contacted: 6 },
  { patient: "Waseem Akram", age: 52, group: "B+", units: 3, filled: 0, hospital: "h12", urgency: "emergency", status: "matching", reason: "Liver failure — variceal bleeding", requester: "Akram Sons", requesterId: "u-3112", createdHoursAgo: 1.5, neededInHours: 5, contacted: 12 },
];

const NOW = Date.UTC(2026, 8, 27, 5, 30); // 10:30 PKT

function timelineFor(s: Seed, created: number): BloodRequest["timeline"] {
  const t = (h: number) => new Date(created + h * 3_600_000).toISOString();
  const tl: BloodRequest["timeline"] = [{ status: "pending", at: t(0), note: "Request submitted" }];
  const flow: RequestStatus[] = ["approved", "matching", "donor_found", "partially_fulfilled", "fulfilled"];
  if (s.status === "cancelled") return [...tl, { status: "cancelled", at: t(4), note: "Cancelled by requester" }];
  if (s.status === "rejected") return [...tl, { status: "rejected", at: t(2), note: s.reason }];
  const upto = flow.indexOf(s.status);
  flow.slice(0, upto + 1).forEach((st, i) => {
    if (st === "partially_fulfilled" && s.status === "fulfilled" && s.filled === s.units && s.units === 1) return;
    tl.push({ status: st, at: t(Math.min(0.2 + i * 0.6, s.createdHoursAgo)), note: st === "matching" ? `${s.contacted} compatible donors alerted` : undefined });
  });
  return tl;
}

export const mockRequests: BloodRequest[] = seeds.map((s, i) => {
  const h = mockHospitals.find((x) => x.id === s.hospital)!;
  const created = NOW - s.createdHoursAgo * 3_600_000;
  return {
    id: `r-${3001 + i}`,
    code: `REQ-${24031 + i * 7}`,
    requesterId: s.requesterId,
    requesterName: s.requester,
    patientName: s.patient,
    patientAge: s.age,
    bloodGroup: s.group,
    unitsRequired: s.units,
    unitsFulfilled: s.filled,
    hospitalId: h.id,
    hospitalName: h.name,
    location: loc(h.city, h.area),
    requiredBy: new Date(NOW + s.neededInHours * 3_600_000).toISOString(),
    urgency: s.urgency,
    reason: s.reason,
    contactNumber: `03${(10 + i) % 50} ${4400000 + i * 13791}`.slice(0, 12),
    status: s.status,
    donorsContacted: s.contacted,
    createdAt: new Date(created).toISOString(),
    timeline: timelineFor(s, created),
  };
});
