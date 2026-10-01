# Qatra: features, validations and limitations

## 1. Modules

| Module | URLs | Code | API endpoint | Who |
| --- | --- | --- | --- | --- |
| Public site | `/`, `/about`, `/faq`, `/contact`, `/auth/*` | `app/(public)`, `app/auth`, `components/` | `/api/data` (public actions) | Everyone |
| Client (member) dashboard | `/dashboard/*` | `app/(client)`, `modules/client` | `/api/data` | Signed-in members (admins can open it too) |
| Admin dashboard | `/admin/*` | `app/(admin)`, `modules/admin` | `/api/admin` | Users whose Firestore `role` is `admin` |

Next.js already sends each page's code separately, so a member never downloads admin screens. The split adds hard boundaries on top: separate folders, separate API endpoints, separate server handler files (`lib/server/handlers/client.ts` and `admin.ts`), and tests that fail if one module imports the other.

## 2. Features

### Public site
- Home page with live blood stock for all 8 groups, current emergencies near Lahore (no contact numbers shown), network totals, and a blood-group compatibility explorer.
- Donor search form (sends you to login first, then straight to the results).
- About, FAQ and contact pages.

### Accounts and sign-in
- Register in 3 steps (details, health basics, location), with email verification.
- Log in and log out. After login you return to the page you were trying to open.
- Forgot password sends a Firebase reset email. Change password from Settings (asks for the current password first).
- Sessions last 5 days in an httpOnly cookie. "Sign out of all devices" ends every session.
- Suspended accounts can't log in or use the API.

### Client dashboard (members)
- **Overview:** your stats, emergencies near you that match your blood group, recent activity, profile completion, next eligible date.
- **My profile:** edit name, phone, blood group, city/area, address and emergency contact. Your email is read-only.
- **Register as donor:** blood group, age, weight, availability, preferred contact, and health questions, with an indicative eligibility result.
- **Donate blood:** eligibility checklist → choose a centre (sorted by distance) → date and time → confirmation. Only one upcoming appointment at a time.
- **Request blood:** patient, units, hospital, required-by time, urgency and contact number. You get a request code and a timeline.
- **Find donors:** filter by group (exact or compatible), city, area, distance, availability, gender, last donation and verified. Shows area and approximate distance only; phone numbers are never sent to the browser.
- **Blood requests:** All, nearby, emergency, mine and fulfilled tabs. "Respond" offers to donate and notifies the family.
- **Request history** and **request detail**: timeline, status, and cancel (owner only, with confirmation).
- **Donation history:** status and certificate number once a donation is completed.
- **Notifications:** unread and emergency filters, mark one or all as read. The count shows in the top bar and sidebar.
- **Settings:** account details, privacy switches (turning off "Show me in donor search" really hides you), notification preferences, password, sign out everywhere.

### Admin dashboard
- **Overview:** users, active donors, requests, completed donations, open emergencies, units in stock, 12-month charts, low-stock alerts, recent activity. It prompts you to load starter data when the database is empty.
- **Users:** search, filter, sort, paginate, edit, verify, suspend/activate (also disables Firebase sign-in), delete (also deletes the donor profile and the Firebase login).
- **Donors:** verify or reject, suspend or reinstate, change availability, message a donor (in-app notification).
- **Blood requests:** view, change status (each change notifies the requester and adds to the timeline), alert chosen donors.
- **Emergency queue:** open emergencies with time left, alert donors, mark fulfilled. The sidebar badge shows the live count.
- **Donations:** mark completed (issues a certificate and updates the donor's totals and last donation date), cancelled or deferred.
- **Blood inventory:** add or remove units with a reason; stock never goes below zero.
- **Blood groups:** supply and demand per group and the compatibility matrix.
- **Hospitals & blood banks:** add, edit and verify facilities.
- **Locations:** add cities and areas, remove areas.
- **Reports:** 12-month donations, requests and fulfilment rate; demand by group and city; CSV export.
- **Notifications:** broadcast to everyone, one blood group or one city (max 280 characters), with sent history.
- **Activity log:** every important action, searchable and filterable.
- **System settings:** organisation details, matching rules, switches, **maintenance mode** (pauses new requests and bookings for members), and **Load starter data**.

### Across the app
- Works on phones, tablets and desktops: tables turn into cards, dialogs become bottom sheets on phones, there's a bottom navigation bar, and 16px inputs so iOS doesn't zoom.
- Loading skeletons, empty states, error pages, a 404 page, and toasts after every action.
- If an action fails, the screen goes back to how it was and a clear message is shown.
- Keyboard and screen-reader support: labelled fields, focus rings, text tables for charts, native dialogs.
- **Demo mode:** with no Firebase keys, the app runs on built-in sample data (see README).

## 3. Validations

Every rule marked **server** runs in `lib/server/validate.ts`, whoever calls the API. The forms also check the same things in the browser first.

| Where | Rule | Browser | Server |
| --- | --- | --- | --- |
| Register | Full name required; valid email; Pakistani mobile (`03XXXXXXXXX` or `+923…`) | ✓ | – |
| Register | Password: 8+ characters with upper case, lower case and a digit; confirmation must match | ✓ | Firebase |
| Register | Date of birth at least 16 years ago; gender, blood group, city and area required; terms accepted | ✓ | – |
| Login | Email format; password required; wrong credentials give a clear message | ✓ | Firebase |
| Reset / change password | Same password rules; the new password must differ; current password re-checked | ✓ | Firebase |
| OTP (demo) | Exactly 6 digits | ✓ | – |
| Profile | Name ≥ 2 characters; valid mobile; valid blood group; emergency contact phone valid if given | ✓ | ✓ |
| Profile | Members can't change role, status, verification or email | – | ✓ |
| Donor registration | Valid blood group; age 18–65; weight 50–250 kg; availability from the list; listed city; all health questions answered | ✓ | ✓ (except questions) |
| Blood request | Valid group; units 1–10 (whole number); patient name; age 0–120; listed hospital; urgency from the list; required-by not in the past; valid mobile contact; reason ≤ 500 and notes ≤ 1,000 characters | ✓ | ✓ |
| Respond to request | Request must be open; you can't respond to your own request; repeat taps count once | – | ✓ |
| Cancel request | Only the requester or an admin | – | ✓ |
| Appointment | Listed centre; valid date and time; in the future; within 90 days (the form allows 60); only one upcoming appointment | ✓ | ✓ |
| Appointment | Dates before the 90-day gap since your last donation are blocked | ✓ | – |
| Availability | Only your own (admins: any donor); value from the list | – | ✓ |
| Notifications | You can only mark your own as read | – | ✓ |
| Facility (admin) | Name ≥ 2; type is hospital, blood bank or donation centre; city; valid email; stock groups valid | ✓ | ✓ |
| Location (admin) | Name ≥ 2 characters; no duplicates | ✓ | City required |
| Broadcast (admin) | Title 3–80 characters, message 3–280 characters | ✓ | ✓ |
| Inventory (admin) | Whole number, not zero, at most 1,000 units; stock never goes below 0; known blood group | ✓ | ✓ |
| Admin settings | Search radius 1–50 km; emergency radius 1–100 km and ≥ search radius; interval 56–180 days; expiry 6–240 hours; alerts 1–10 | ✓ | – |
| Admin safety | Admins can't suspend, delete or demote themselves | – | ✓ |
| Access | Public, member and admin actions are checked on every call; suspended users are blocked; `/api/data` refuses admin actions and `/api/admin` refuses everything else | – | ✓ |

## 4. Limitations

Things to know before relying on Qatra for real patients:

1. **SMS, email and WhatsApp alerts aren't sent.** Notifications appear inside the app only. The switches in Settings are saved but no messages leave the app. Connecting a provider (for example Twilio or the WhatsApp Business API) is a separate task.
2. **Two-factor authentication is demo-only.** It's hidden when Firebase is configured, because SMS sign-in requires upgrading Firebase to Identity Platform.
3. **Location is area-level.** Distance is measured between area centre points (for example Johar Town to Gulberg), not live GPS. Only the cities and areas in the list have coordinates. New areas added from Locations fall back to the city's first area point.
4. **Search reads whole collections.** Donor search, lists and reports load every document and filter on the server. That's fine for a few thousand records; beyond that it needs Firestore indexes, geo-hash queries and pagination.
5. **Stock is network-wide, not per blood bank.** Inventory holds one number per blood group, and adjustments don't use Firestore transactions, so two admins changing the same group at the same moment could overwrite each other.
6. **Matching rules and most switches are stored but not enforced**, except maintenance mode. Search radius, auto-expiry, "only alert verified donors" and "manual approval" don't change behaviour yet, and requests don't expire automatically.
7. **Profile photos aren't uploaded.** You can preview a photo but it isn't saved (Firebase Storage isn't wired up).
8. **Email change isn't supported in-app.** It needs Firebase's verify-before-update flow.
9. **"Sign out of all devices" only shows the current device.** There's no list of other active sessions.
10. **Eligibility is a guide, not medical advice.** Staff at the centre decide. The rules are simplified (age, weight, 90-day gap, a few questions).
11. **Password reset opens Firebase's own page** unless you set the custom action URL (see FIREBASE_SETUP.md, E4).
12. **The certificate is a number, not a PDF.**
13. **No rate limiting or App Check** on the API routes. Add these before going public.
14. **English only.** No Urdu interface yet.

## 5. Automated tests

`npm test` runs 57 tests in under a second, without Firebase or the internet:

| File | Covers |
| --- | --- |
| `tests/unit.test.ts` | Email, phone, password, OTP and range rules; eligibility; blood compatibility; distance; Pakistan-time dates; phone masking |
| `tests/access.test.ts` | Every action has a handler in the right module; every service call exists; public, member and admin access; endpoint separation; suspended users; profile edit restrictions; admin self-protection |
| `tests/workflows.test.ts` | Starter data; create, respond, cancel and fulfil requests; donor alerts; donor search filters and privacy; availability; booking and completing donations; maintenance mode; broadcasts; notifications; inventory; locations; facilities; dashboards; sign out everywhere; suspend and delete |
| `tests/validation.test.ts` | Server-side rejection of bad requests, appointments, donor data, profile edits and admin input |
| `tests/architecture.test.ts` | The client and admin modules never import each other; browser code never reaches server-only code; no `redirect()` inside try/catch in layouts; every sidebar link has a page |

The data-layer tests run the real handlers in `lib/server` against an in-memory Firestore (`tests/mocks/firestore.cjs`), so they check the actual logic, not a copy of it. They can't check the browser UI, real Firebase security rules, or network behaviour. The manual guide in `TESTING.md` covers those.
