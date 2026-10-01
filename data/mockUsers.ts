import type { Admin, User } from "@/types";
import { loc } from "./locations";

export const currentUser: User = {
  id: "u-1001",
  fullName: "Ahmed Hassan",
  email: "ahmed.hassan@mail.pk",
  phone: "0321 4478123",
  bloodGroup: "O+",
  gender: "male",
  dateOfBirth: "1996-04-12",
  location: loc("Lahore", "Johar Town"),
  address: "House 118, Block R2, Johar Town",
  role: "donor",
  status: "active",
  verified: true,
  joinedAt: "2024-02-18",
  emergencyContact: { name: "Farah Hassan", phone: "0300 5521109", relation: "Sister" },
};

export const currentAdmin: Admin = {
  id: "u-0001",
  fullName: "Sana Mirza",
  email: "sana.mirza@qatra.pk",
  phone: "0333 9087712",
  bloodGroup: "A+",
  gender: "female",
  dateOfBirth: "1989-11-03",
  location: loc("Lahore", "Gulberg"),
  role: "admin",
  status: "active",
  verified: true,
  joinedAt: "2023-06-01",
  permissions: ["users", "donors", "requests", "inventory", "reports", "settings"],
};

type Row = [string, string, string, User["bloodGroup"], User["gender"], string, string, User["role"], User["status"], boolean, string];

// name, email, phone, group, gender, city, area, role, status, verified, joined
const rows: Row[] = [
  ["Ayesha Siddiqui", "ayesha.siddiqui@mail.pk", "0300 1127745", "A+", "female", "Lahore", "Gulberg", "donor", "active", true, "2024-05-11"],
  ["Bilal Chaudhry", "bilal.ch@mail.pk", "0312 8834521", "B+", "male", "Lahore", "Model Town", "donor", "active", true, "2024-01-22"],
  ["Hira Nadeem", "hira.nadeem@mail.pk", "0345 2219087", "O-", "female", "Lahore", "DHA Phase 5", "donor", "active", true, "2023-11-09"],
  ["Usman Tariq", "usman.tariq@mail.pk", "0301 6690214", "AB+", "male", "Lahore", "Iqbal Town", "user", "active", false, "2025-03-02"],
  ["Mahnoor Iqbal", "mahnoor.i@mail.pk", "0333 7781240", "B-", "female", "Lahore", "Shadman", "donor", "pending", false, "2026-09-20"],
  ["Hamza Sheikh", "hamza.sheikh@mail.pk", "0322 4401938", "O+", "male", "Sheikhupura", "Kot Abdul Malik", "donor", "active", true, "2025-07-14"],
  ["Zainab Qureshi", "zainab.q@mail.pk", "0304 9912376", "A-", "female", "Lahore", "Township", "user", "active", true, "2025-12-01"],
  ["Imran Aslam", "imran.aslam@mail.pk", "0315 3308812", "B+", "male", "Karachi", "Clifton", "donor", "suspended", true, "2024-08-30"],
  ["Rabia Anwar", "rabia.anwar@mail.pk", "0343 1276650", "O+", "female", "Islamabad", "F-7", "donor", "active", true, "2024-10-05"],
  ["Faisal Mehmood", "faisal.m@mail.pk", "0300 8812093", "AB-", "male", "Lahore", "Cantt", "donor", "active", true, "2023-09-17"],
  ["Sadia Rehman", "sadia.rehman@mail.pk", "0321 6654902", "A+", "female", "Faisalabad", "Madina Town", "user", "inactive", false, "2025-02-26"],
  ["Kamran Javed", "kamran.javed@mail.pk", "0334 2290761", "O+", "male", "Lahore", "Wapda Town", "donor", "active", true, "2024-04-19"],
  ["Noor Fatima", "noor.fatima@mail.pk", "0307 5543218", "B+", "female", "Lahore", "Faisal Town", "user", "active", true, "2026-01-08"],
  ["Ali Raza", "ali.raza@mail.pk", "0311 7732904", "A+", "male", "Lahore", "Johar Town", "donor", "active", true, "2025-05-23"],
  ["Maryam Khalid", "maryam.khalid@mail.pk", "0346 1180437", "O-", "female", "Karachi", "PECHS", "donor", "active", true, "2024-06-12"],
  ["Tahir Abbas", "tahir.abbas@mail.pk", "0302 9941275", "B-", "male", "Sheikhupura", "Civil Lines", "user", "pending", false, "2026-09-24"],
  ["Iqra Hussain", "iqra.hussain@mail.pk", "0323 4450189", "AB+", "female", "Islamabad", "G-9", "donor", "active", false, "2026-08-02"],
  ["Waqas Ahmed", "waqas.ahmed@mail.pk", "0335 6609342", "O+", "male", "Lahore", "Gulberg", "user", "active", true, "2025-10-15"],
];

export const mockUsers: User[] = [
  currentUser,
  ...rows.map(([fullName, email, phone, bloodGroup, gender, city, area, role, status, verified, joinedAt], i): User => ({
    id: `u-${1002 + i}`,
    fullName,
    email,
    phone,
    bloodGroup,
    gender,
    dateOfBirth: `${1985 + (i % 16)}-0${(i % 9) + 1}-1${i % 9}`,
    location: loc(city, area, (i % 5) - 2),
    role,
    status,
    verified,
    joinedAt,
  })),
];
