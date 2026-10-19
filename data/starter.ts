import type { BloodInventory, Hospital } from "@/types";

/**
 * Optional starter records written by Admin → Settings → "Load starter data".
 * They are only written into empty collections and can be edited or removed
 * afterwards. Nothing in the running app reads these directly.
 */

/** Sample partner facilities so booking and request forms have choices on day one. */
export const STARTER_HOSPITALS: Hospital[] = [
  { id: "h1", name: "Ravi Valley General Hospital", type: "hospital", address: "42 Main Boulevard, Gulberg III", city: "Lahore", area: "Gulberg", phone: "042 3575 1100", email: "bloodbank@ravivalley.pk", openingHours: "Open 24 hours", availableGroups: ["A+", "B+", "O+", "AB+", "O-"], verified: true },
  { id: "h2", name: "Johar Medical Complex", type: "hospital", address: "Block G1, Johar Town", city: "Lahore", area: "Johar Town", phone: "042 3530 8800", email: "transfusion@joharmedical.pk", openingHours: "Open 24 hours", availableGroups: ["A+", "A-", "B+", "O+", "AB+"], verified: true },
  { id: "h3", name: "Shalimar Heart & Trauma Centre", type: "hospital", address: "11 Jail Road, Shadman", city: "Lahore", area: "Shadman", phone: "042 3758 2200", email: "er@shalimarheart.pk", openingHours: "Open 24 hours", availableGroups: ["O+", "O-", "B+", "A+"], verified: true },
  { id: "h4", name: "Model Town Thalassaemia & Blood Bank", type: "blood_bank", address: "Block C, Model Town", city: "Lahore", area: "Model Town", phone: "042 3585 4400", email: "donate@mtbloodbank.pk", openingHours: "8:00 – 22:00 daily", availableGroups: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], verified: true },
  { id: "h5", name: "Iqbal Town Community Blood Bank", type: "blood_bank", address: "Karim Block, Allama Iqbal Town", city: "Lahore", area: "Iqbal Town", phone: "042 3541 6600", email: "info@itcbb.pk", openingHours: "9:00 – 21:00, closed Friday 13:00 – 15:00", availableGroups: ["A+", "B+", "O+", "AB+", "B-"], verified: true },
  { id: "h6", name: "Canal View Donation Centre", type: "donation_center", address: "Canal Bank Road, Faisal Town", city: "Lahore", area: "Faisal Town", phone: "042 3516 7700", email: "appointments@canalview.pk", openingHours: "10:00 – 19:00, Mon – Sat", availableGroups: [], verified: true },
  { id: "h7", name: "Wapda Town Family Hospital", type: "hospital", address: "Block K, Wapda Town Phase 1", city: "Lahore", area: "Wapda Town", phone: "042 3518 9900", email: "admin@wtfh.pk", openingHours: "Open 24 hours", availableGroups: ["O+", "A+", "B+"], verified: false },
  { id: "h8", name: "DHA Mobile Donation Unit", type: "donation_center", address: "Phase 5 Commercial, DHA", city: "Lahore", area: "DHA Phase 5", phone: "042 3574 3300", email: "mobileunit@dhacare.pk", openingHours: "Sat – Sun, 10:00 – 16:00", availableGroups: [], verified: true },
  { id: "h9", name: "Sharaqpur Road Community Blood Bank", type: "blood_bank", address: "Sharaqpur Road, near Bypass Chowk", city: "Sheikhupura", area: "Sharaqpur Road", phone: "056 378 1200", email: "skp@communityblood.pk", openingHours: "9:00 – 20:00 daily", availableGroups: ["A+", "B+", "O+", "O-", "AB+"], verified: true },
  { id: "h10", name: "Clifton Care Hospital", type: "hospital", address: "Block 5, Clifton", city: "Karachi", area: "Clifton", phone: "021 3583 4400", email: "bloodservices@cliftoncare.pk", openingHours: "Open 24 hours", availableGroups: ["A+", "B+", "O+", "AB+", "A-"], verified: true },
  { id: "h11", name: "Margalla Medical Institute", type: "hospital", address: "Jinnah Super Market Road, F-7", city: "Islamabad", area: "F-7", phone: "051 265 1200", email: "transfusion@margallamed.pk", openingHours: "Open 24 hours", availableGroups: ["A+", "B+", "O+", "O-", "AB-"], verified: true },
  { id: "h12", name: "Lyallpur Blood Services", type: "blood_bank", address: "Susan Road, near Madina Town", city: "Faisalabad", area: "Susan Road", phone: "041 872 3300", email: "hello@lyallpurblood.pk", openingHours: "8:00 – 20:00 daily", availableGroups: ["A+", "B+", "O+", "AB+"], verified: false },
];

/**
 * Stock targets per blood group. Units start at zero: real stock is entered by
 * coordinators in Admin → Blood inventory so reports never show invented numbers.
 */
export const STOCK_TARGETS: Pick<BloodInventory, "bloodGroup" | "required" | "capacity">[] = [
  { bloodGroup: "A+", required: 90, capacity: 220 },
  { bloodGroup: "A-", required: 20, capacity: 50 },
  { bloodGroup: "B+", required: 120, capacity: 260 },
  { bloodGroup: "B-", required: 18, capacity: 45 },
  { bloodGroup: "O+", required: 130, capacity: 260 },
  { bloodGroup: "O-", required: 30, capacity: 70 },
  { bloodGroup: "AB+", required: 25, capacity: 80 },
  { bloodGroup: "AB-", required: 8, capacity: 25 },
];
