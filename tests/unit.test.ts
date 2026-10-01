/* Pure logic: validation rules, eligibility, blood compatibility, distance, formatting. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rules, validate, hasErrors } from "@/lib/validations";
import { checkEligibility } from "@/lib/eligibility";
import { BLOOD_GROUPS, canDonateTo, canReceiveFrom, DONATION_INTERVAL_DAYS } from "@/lib/constants";
import { coarsen, distanceKm } from "@/lib/geo";
import { addDays, formatDate, maskPhone, now, timeRemaining } from "@/lib/utils";
import { scopeOf } from "@/lib/actionScopes";

test("email rule accepts real addresses and rejects malformed ones", () => {
  const r = rules.email();
  assert.equal(r("ahmed@example.com"), null);
  assert.equal(r(" sana@qatra.pk "), null);
  for (const bad of ["", "ahmed", "ahmed@", "@x.com", "a@b.c", "a b@c.com"]) assert.notEqual(r(bad), null, bad);
});

test("phone rule accepts Pakistani mobile formats only", () => {
  const r = rules.phone();
  for (const ok of ["03001234567", "0300 1234567", "+923001234567", "0334-0594817"]) assert.equal(r(ok), null, ok);
  for (const bad of ["0421234567", "12345", "04235751100", "+14155550100"]) assert.notEqual(r(bad), null, bad);
});

test("password rule needs 8+ chars with upper, lower and a digit", () => {
  const r = rules.password();
  assert.equal(r("Donate2026"), null);
  assert.match(r("short1A") ?? "", /8 characters/);
  assert.match(r("alllowercase1") ?? "", /uppercase/);
  assert.match(r("NoDigitsHere") ?? "", /number/);
});

test("otp, blood group and integer range rules", () => {
  assert.equal(rules.otp()("123456"), null);
  assert.notEqual(rules.otp()("12345"), null);
  assert.notEqual(rules.otp()("12a456"), null);
  assert.equal(rules.bloodGroup()("AB-"), null);
  assert.notEqual(rules.bloodGroup()("C+"), null);
  const units = rules.intRange("Units", 1, 10);
  assert.equal(units("3"), null);
  assert.notEqual(units("0"), null);
  assert.notEqual(units("11"), null);
  assert.notEqual(units("2.5"), null);
  assert.notEqual(units(""), null);
});

test("minimum age rule", () => {
  const r = rules.minAge(18);
  assert.equal(r("1990-05-01"), null);
  const tooYoung = new Date();
  tooYoung.setFullYear(tooYoung.getFullYear() - 16);
  assert.notEqual(r(tooYoung.toISOString().slice(0, 10)), null);
});

test("validate() collects the first error per field", () => {
  const errs = validate({ email: "bad", name: "" }, { email: [rules.required("your email"), rules.email()], name: [rules.required("your name")] });
  assert.equal(hasErrors(errs), true);
  assert.match(errs.email ?? "", /valid email/);
  assert.match(errs.name ?? "", /your name/);
  assert.equal(hasErrors(validate({ email: "a@b.com" }, { email: [rules.email()] })), false);
});

test("eligibility: healthy adult with no recent donation is likely eligible", () => {
  const r = checkEligibility({ age: 30, weightKg: 70, lastDonationDate: null });
  assert.equal(r.status, "likely_eligible");
  assert.equal(r.daysUntilEligible, 0);
});

test(`eligibility: must wait ${DONATION_INTERVAL_DAYS} days between donations`, () => {
  const last = addDays(now(), -30).toISOString();
  const r = checkEligibility({ age: 30, weightKg: 70, lastDonationDate: last });
  assert.equal(r.status, "wait");
  assert.equal(r.daysUntilEligible, DONATION_INTERVAL_DAYS - 30);
  const ok = checkEligibility({ age: 30, weightKg: 70, lastDonationDate: addDays(now(), -DONATION_INTERVAL_DAYS - 1).toISOString() });
  assert.equal(ok.status, "likely_eligible");
});

test("eligibility: age and weight outside limits need a consultation", () => {
  assert.equal(checkEligibility({ age: 16, weightKg: 70, lastDonationDate: null }).status, "consult");
  assert.equal(checkEligibility({ age: 65, weightKg: 70, lastDonationDate: null }).status, "consult");
  assert.equal(checkEligibility({ age: 30, weightKg: 45, lastDonationDate: null }).status, "consult");
});

test("blood compatibility: O- gives to all, AB+ receives from all, and the two tables agree", () => {
  assert.deepEqual([...canDonateTo("O-")].sort(), [...BLOOD_GROUPS].sort());
  assert.deepEqual([...canReceiveFrom("AB+")].sort(), [...BLOOD_GROUPS].sort());
  assert.deepEqual(canReceiveFrom("O-"), ["O-"]);
  for (const donor of BLOOD_GROUPS)
    for (const patient of BLOOD_GROUPS)
      assert.equal(canDonateTo(donor).includes(patient), canReceiveFrom(patient).includes(donor), `${donor}->${patient}`);
});

test("distance: Lahore to Karachi is about 1,030 km; same point is 0", () => {
  const lahore = { lat: 31.5204, lng: 74.3587 };
  const karachi = { lat: 24.8607, lng: 67.0011 };
  const d = distanceKm(lahore, karachi);
  assert.ok(d > 1000 && d < 1060, String(d));
  assert.equal(distanceKm(lahore, lahore), 0);
});

test("coarsen() hides the exact point (moves it, but stays within ~2 km)", () => {
  const p = { lat: 31.469712, lng: 74.272845 };
  const c = coarsen(p);
  assert.ok(distanceKm(p, c) < 2);
});

test("dates are formatted in Pakistan time regardless of server timezone", () => {
  assert.equal(formatDate("2026-09-27T20:30:00Z"), "28 Sept 2026");
});

test("time remaining labels", () => {
  const from = new Date("2026-09-27T10:00:00Z");
  assert.equal(timeRemaining("2026-09-27T09:00:00Z", from).label, "Overdue");
  assert.equal(timeRemaining("2026-09-27T10:30:00Z", from).label, "30 min left");
  assert.equal(timeRemaining("2026-09-27T15:00:00Z", from).label, "5 h left");
  assert.equal(timeRemaining("2026-10-02T10:00:00Z", from).label, "5 days left");
});

test("phone masking never shows the full number", () => {
  const m = maskPhone("0334 0594817");
  assert.ok(!m.includes("0594817"));
  assert.ok(m.startsWith("0334"));
});

test("action scopes", () => {
  assert.equal(scopeOf("inventory:list"), "public");
  assert.equal(scopeOf("users:remove"), "admin");
  assert.equal(scopeOf("bloodRequests:create"), "client");
});
