import type { Donor } from "@/types";
import { BLOOD_GROUPS } from "@/lib/constants";
import { AREA_POINTS } from "./locations";

/**
 * Deterministic generator so the mock dataset is realistic in size
 * (and identical on server and client renders).
 */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const MALE = ["Ahmed Khan", "Bilal Chaudhry", "Hamza Sheikh", "Usman Ghani", "Faisal Mehmood", "Kamran Javed", "Ali Raza", "Saad Butt", "Omer Farooq", "Zeeshan Akhtar", "Adnan Malik", "Haris Nawaz", "Junaid Iqbal", "Shahzaib Ali", "Rizwan Haider", "Talha Anjum", "Asad Mirza", "Moiz Rafiq", "Danish Saleem", "Waleed Arshad"];
const FEMALE = ["Ayesha Siddiqui", "Hira Nadeem", "Rabia Anwar", "Maryam Khalid", "Mahnoor Iqbal", "Iqra Hussain", "Sana Tariq", "Amna Yousaf", "Kiran Shahid", "Fatima Zahra", "Areeba Khan", "Mehwish Latif", "Sidra Imtiaz", "Hafsa Qamar", "Anum Bashir"];

// weight groups roughly by prevalence in Pakistan (B+ and O+ most common)
const GROUP_WEIGHTS: Record<string, number> = { "B+": 30, "O+": 27, "A+": 22, "AB+": 7, "B-": 4, "O-": 4, "A-": 4, "AB-": 2 };

function pickGroup(r: number) {
  const total = Object.values(GROUP_WEIGHTS).reduce((a, b) => a + b, 0);
  let acc = 0;
  for (const g of BLOOD_GROUPS) {
    acc += GROUP_WEIGHTS[g] / total;
    if (r <= acc) return g;
  }
  return "O+" as const;
}

function build(): Donor[] {
  const rand = rng(20260927);
  const places: [string, string][] = [];
  for (const [city, areas] of Object.entries(AREA_POINTS)) {
    for (const area of Object.keys(areas)) {
      // Lahore gets more donors
      const n = city === "Lahore" ? 5 : city === "Sheikhupura" ? 3 : 2;
      for (let i = 0; i < n; i++) places.push([city, area]);
    }
  }

  return places.map(([city, area], i) => {
    const female = rand() < 0.38;
    const pool = female ? FEMALE : MALE;
    const name = pool[Math.floor(rand() * pool.length)];
    const base = AREA_POINTS[city][area];
    const daysSince = Math.floor(rand() * 400);
    const neverDonated = rand() < 0.12;
    const availRoll = rand();
    const last = neverDonated ? null : new Date(Date.UTC(2026, 8, 27) - daysSince * 86_400_000).toISOString().slice(0, 10);
    const tooSoon = last !== null && daysSince < 90;
    return {
      id: `d-${2001 + i}`,
      userId: `u-${5001 + i}`,
      name,
      bloodGroup: pickGroup(rand()),
      gender: female ? "female" : "male",
      age: 19 + Math.floor(rand() * 38),
      weightKg: 52 + Math.floor(rand() * 40),
      location: {
        city,
        area,
        point: { lat: base.lat + (rand() - 0.5) * 0.03, lng: base.lng + (rand() - 0.5) * 0.03 },
      },
      availability: tooSoon ? "temporarily_unavailable" : availRoll < 0.78 ? "available" : availRoll < 0.9 ? "temporarily_unavailable" : "unavailable",
      verification: rand() < 0.8 ? "verified" : rand() < 0.7 ? "pending" : "rejected",
      lastDonationDate: last,
      totalDonations: neverDonated ? 0 : 1 + Math.floor(rand() * 14),
      preferredContact: (["phone", "whatsapp", "sms", "email"] as const)[Math.floor(rand() * 4)],
      status: rand() < 0.96 ? "active" : "suspended",
    } satisfies Donor;
  });
}

export const mockDonors: Donor[] = build();
