/* Server-side validation: bad input is rejected with a clear message, whoever calls the API. */
import { beforeEach, test } from "node:test";
import { call, rejects, resetWorld } from "./helpers";

beforeEach(async () => {
  await resetWorld();
  await call("admin", "system:seed");
});

const base = { bloodGroup: "O+", unitsRequired: 1, patientName: "Test Patient", patientAge: 40, hospitalId: "h1", city: "Lahore", requiredBy: "2030-01-01T10:00:00+05:00", urgency: "urgent", reason: "Surgery", contactNumber: "03001234567" };
const create = (patch: Record<string, unknown>) => call("ahmed", "bloodRequests:create", { input: { ...base, ...patch }, requester: { id: "ahmed", name: "Ahmed" } });

test("blood request input is validated", async () => {
  await rejects(create({ bloodGroup: "Z+" }), /valid blood group/);
  await rejects(create({ unitsRequired: 0 }), /1 to 10/);
  await rejects(create({ unitsRequired: 11 }), /1 to 10/);
  await rejects(create({ patientName: "" }), /patient's name/);
  await rejects(create({ patientAge: 200 }), /patient's age/);
  await rejects(create({ urgency: "whenever" }), /how urgent/);
  await rejects(create({ requiredBy: "2001-01-01T00:00:00Z" }), /past/);
  await rejects(create({ contactNumber: "123" }), /Pakistani mobile/);
  await rejects(create({ hospitalId: "h-missing" }), /no longer listed/);
});

test("appointments must be in the next 90 days with a valid date and time", async () => {
  const book = (date: string, time: string) => call("ali", "donations:bookAppointment", { input: { centerId: "h4", date, time } });
  await rejects(book("2020-01-01", "10:00"), /future/);
  await rejects(book("tomorrow", "10:00"), /date/);
  await rejects(book("2030-01-01", "10am"), /time/);
  const far = new Date(Date.now() + 200 * 86_400_000).toISOString().slice(0, 10);
  await rejects(book(far, "10:00"), /90 days/);
});

test("donor registration checks group, age, weight and city", async () => {
  const reg = (patch: Record<string, unknown>) => call("ali", "donors:registerDonor", { input: { bloodGroup: "O-", age: 30, weightKg: 70, availability: "available", location: { city: "Lahore", area: "Gulberg" }, ...patch } });
  await rejects(reg({ bloodGroup: "O" }), /valid blood group/);
  await rejects(reg({ age: 16 }), /18 and 65/);
  await rejects(reg({ weightKg: 40 }), /50 kg/);
  await rejects(reg({ availability: "maybe" }), /availability/);
  await rejects(reg({ location: { city: "Atlantis", area: "x" } }), /listed city/);
});

test("profile edits are validated", async () => {
  await rejects(call("ahmed", "users:update", { user: { id: "ahmed", phone: "12" } }), /Pakistani mobile/);
  await rejects(call("ahmed", "users:update", { user: { id: "ahmed", fullName: " " } }), /full name/);
  await rejects(call("ahmed", "users:update", { user: { id: "ahmed", bloodGroup: "X" } }), /valid blood group/);
  await rejects(call("ahmed", "donors:updateAvailability", { availability: "sometimes" }), /availability/);
});

test("admin inputs are validated too", async () => {
  await rejects(call("admin", "hospitals:save", { h: { name: "", type: "hospital", city: "Lahore" } }), /facility name/);
  await rejects(call("admin", "hospitals:save", { h: { name: "X Clinic", type: "spa", city: "Lahore" } }), /facility type/);
  await rejects(call("admin", "hospitals:save", { h: { name: "X Clinic", type: "hospital", city: "Lahore", email: "nope" } }), /valid email/);
  await rejects(call("admin", "notifications:broadcast", { input: { title: "Hi", body: "short", audience: "all" } }), /3 to 80/);
  await rejects(call("admin", "notifications:broadcast", { input: { title: "Valid title", body: "x".repeat(281), audience: "all" } }), /280/);
  await rejects(call("admin", "inventory:adjust", { group: "O+", delta: 0 }), /whole number/);
  await rejects(call("admin", "inventory:adjust", { group: "O+", delta: 2.5 }), /whole number/);
});
