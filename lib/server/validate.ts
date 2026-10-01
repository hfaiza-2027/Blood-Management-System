/* Server-side checks. The browser validates too, but these run no matter who calls the API. */
import { BLOOD_GROUPS, CITIES } from "@/lib/constants";
import { rules } from "@/lib/validations";
import { HttpError, type Payload } from "./core";

const URGENCIES = ["normal", "urgent", "emergency"];
const AVAILABILITY = ["available", "unavailable", "temporarily_unavailable"];
const FACILITY_TYPES = ["hospital", "blood_bank", "donation_center"];

function fail(message: string): never {
  throw new HttpError(message);
}
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isGroup = (v: unknown) => (BLOOD_GROUPS as readonly string[]).includes(String(v));

export function checkRequestInput(i: Payload) {
  if (!isGroup(i.bloodGroup)) fail("Choose a valid blood group.");
  const units = Number(i.unitsRequired);
  if (!Number.isInteger(units) || units < 1 || units > 10) fail("Units required must be a whole number from 1 to 10.");
  if (str(i.patientName).length < 2) fail("Enter the patient's name.");
  const age = Number(i.patientAge);
  if (!Number.isFinite(age) || age < 0 || age > 120) fail("Enter the patient's age (0 to 120).");
  if (!str(i.hospitalId)) fail("Choose the hospital.");
  if (!URGENCIES.includes(String(i.urgency))) fail("Choose how urgent the request is.");
  const by = new Date(String(i.requiredBy));
  if (Number.isNaN(+by)) fail("Enter when the blood is needed.");
  if (+by < Date.now() - 60 * 60 * 1000) fail("The required-by time can't be in the past.");
  if (rules.phone()(str(i.contactNumber))) fail("Enter a Pakistani mobile number for the contact, like 0300 1234567.");
  if (str(i.reason).length > 500 || str(i.notes).length > 1000) fail("Keep the reason and notes shorter.");
}

export function checkAppointment(i: Payload) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(i.date))) fail("Choose a date for your appointment.");
  if (!/^\d{2}:\d{2}$/.test(String(i.time))) fail("Choose a time for your appointment.");
  const at = new Date(`${i.date}T${i.time}:00+05:00`);
  if (Number.isNaN(+at) || +at < Date.now()) fail("Choose a date and time in the future.");
  if (+at > Date.now() + 90 * 86_400_000) fail("Appointments can be booked up to 90 days ahead.");
}

export function checkDonorInput(i: Payload) {
  if (!isGroup(i.bloodGroup)) fail("Choose a valid blood group.");
  const age = Number(i.age);
  if (i.age !== undefined && (!Number.isFinite(age) || age < 18 || age > 65)) fail("Donors must be between 18 and 65 years old.");
  const weight = Number(i.weightKg);
  if (i.weightKg !== undefined && (!Number.isFinite(weight) || weight < 50 || weight > 250)) fail("Donors must weigh at least 50 kg.");
  if (i.availability !== undefined && !AVAILABILITY.includes(String(i.availability))) fail("Choose your availability.");
  const city = str(i.location?.city);
  if (city && !CITIES[city]) fail("Choose a listed city.");
}

export function checkProfilePatch(p: Payload) {
  if (p.fullName !== undefined && str(p.fullName).length < 2) fail("Enter your full name.");
  if (p.phone !== undefined && p.phone !== "" && rules.phone()(str(p.phone))) fail("Enter a Pakistani mobile number, like 0300 1234567.");
  if (p.bloodGroup !== undefined && !isGroup(p.bloodGroup)) fail("Choose a valid blood group.");
  if (p.emergencyContact?.phone && rules.phone()(str(p.emergencyContact.phone))) fail("Enter a valid phone number for your emergency contact.");
}

export function checkFacility(h: Payload) {
  if (str(h.name).length < 2) fail("Enter the facility name.");
  if (!FACILITY_TYPES.includes(String(h.type))) fail("Choose the facility type.");
  if (!str(h.city)) fail("Choose the city.");
  if (h.email && rules.email()(str(h.email))) fail("Enter a valid email for the facility.");
  if (Array.isArray(h.availableGroups) && h.availableGroups.some((g: unknown) => !isGroup(g))) fail("Stock groups must be valid blood groups.");
}

export function checkBroadcast(i: Payload) {
  if (str(i.title).length < 3 || str(i.title).length > 80) fail("The title must be 3 to 80 characters.");
  if (str(i.body).length < 3 || str(i.body).length > 280) fail("The message must be 3 to 280 characters.");
}

export function checkInventoryDelta(delta: unknown) {
  const d = Number(delta);
  if (!Number.isInteger(d) || d === 0 || Math.abs(d) > 1000) fail("Enter a whole number of units to add or remove (up to 1,000).");
}
