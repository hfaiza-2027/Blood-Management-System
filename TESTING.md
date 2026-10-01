# Testing Qatra step by step

Work through the parts in order. Each step says what to do and what you should see. Tick them off as you go. If a step fails, note the step number and send the terminal error or a browser console screenshot (F12 → Console).

**You need:** Node 18.18+ (20 recommended), the project opened in VS Code, and your `.env.local` with the Firebase keys.

---

## Part A. Install and automated tests (5 minutes)

| # | Do | Expect |
| --- | --- | --- |
| A1 | In the VS Code terminal: `npm install` | Finishes without `ERR!` lines (warnings are fine) |
| A2 | `npm test` | `# tests 57`, `# pass 57`, `# fail 0` |
| A3 | `npm run typecheck` | No output, meaning no type errors |
| A4 | `npm run build` | Ends with a route table listing `/admin/...` and `/dashboard/...`, and no "Failed to compile" |
| A5 | `npm run dev`, then open http://localhost:3000 | The home page loads |

To run one test file only: `npm test -- workflows`.

---

## Part B. One-time Firebase setup

| # | Do | Expect |
| --- | --- | --- |
| B1 | `npm install -g firebase-tools`, then `firebase login`, then `firebase use <your-project-id>` | "Now using project …" |
| B2 | `firebase deploy --only firestore:rules,firestore:indexes` | "Deploy complete!" |
| B3 | Firebase Console → Authentication → Sign-in method: **Email/Password** enabled | Enabled |
| B4 | Make sure an admin exists: Authentication → Users has the admin email, and Firestore `users/<that UID>` has `role: "admin"`, `status: "active"` | Both exist |

Use **two browsers** (for example Chrome for the admin and Chrome Incognito or Edge for members), so both stay logged in at the same time.

---

## Part C. Admin: first login and starter data

| # | Do | Expect |
| --- | --- | --- |
| C1 | Browser 1: go to `/auth/login` and log in as the admin | You land on `/admin` (Overview) |
| C2 | If the Overview shows "Your database is empty", click **System settings** in that message | `/admin/settings` opens |
| C3 | Scroll to **Starter data** and click **Load starter data** | Toast: "Starter data loaded. 12 hospitals, 8 inventory, 5 locations"; the counts update |
| C4 | Click **Load starter data** again | Toast: "Nothing to add." |
| C5 | Open the home page `/` in the same browser | The stock board shows 8 vials with numbers |
| C6 | Go to `/admin/hospitals` | 12 facilities; the tabs filter by type |

---

## Part D. Member: registration and profile

| # | Do | Expect |
| --- | --- | --- |
| D1 | Browser 2: open `/dashboard` while logged out | Redirected to `/auth/login?next=/dashboard` |
| D2 | Click **Create an account**. On step 1, try the email `abc` and the phone `123` | Red errors under both fields; you can't continue |
| D3 | Try the password `short` | "Use at least 8 characters." |
| D4 | Fill everything correctly (for example Test Donor, a real inbox you can check, 0300 1234567, `Donate2026`), then continue through steps 2 and 3 | "Account created", and you go to "Confirm your email" |
| D5 | Open the verification email and click the link, then click **I've confirmed — continue** | "Email verified"; you go to your profile |
| D6 | (Alternative) Click **Skip for now** | The dashboard opens anyway |
| D7 | Firebase Console → Firestore → `users` | A new document with `role: "user"`, `status: "active"` |
| D8 | **My profile**: change the area and save | "Profile updated." Reload: the change is kept; the email field is greyed out |
| D9 | Profile: set the phone to `12345` and save | Error under Phone; nothing saved |

---

## Part E. Member: donor registration and availability

| # | Do | Expect |
| --- | --- | --- |
| E1 | Sidebar → **My profile** prompt or `/dashboard/register-donor` | The donor form |
| E2 | Enter weight `40` and submit | Error: weight must be 50 to 250 |
| E3 | Fill correctly, answer every health question, submit | "Donor profile submitted."; an eligibility result with the disclaimer |
| E4 | Firestore → `donors/<your UID>` | Exists with `verification: "pending"`; your `users` doc now has `role: "donor"` |
| E5 | Dashboard overview → **Pause availability** | Toast; Firestore `availability` becomes `unavailable` |
| E6 | Click again (**Mark me available**) | Back to `available` |

---

## Part F. Member: request blood

| # | Do | Expect |
| --- | --- | --- |
| F1 | **Request blood**: choose **Emergency**, set units to `0` | Error: 1 to 10 |
| F2 | Set a past date | Error: can't be in the past |
| F3 | Fill correctly (hospital "Ravi Valley General Hospital", contact 0300 1234567) and submit | Success screen with a code like `REQ-53817`, and a timeline |
| F4 | **Request history** | The request is listed as Pending |
| F5 | Open it | The detail page shows the timeline and a **Cancel request** button |
| F6 | Open the home page `/` in a logged-out window | The emergency appears under "These patients need blood…" **without** a phone number |

---

## Part G. Second member responds (notifications)

Create a second member (repeat D4 with another email) in a third window, or reuse the admin in "Switch to donor view".

| # | Do | Expect |
| --- | --- | --- |
| G1 | Member 2 → **Blood requests** → Emergency tab | Member 1's request is shown with distance |
| G2 | Click **Respond** → confirm | "Response sent" |
| G3 | Click **Respond** again on the same request | Still counted once (no double count on the request) |
| G4 | Member 1 → bell icon | A red number appears; the notification says "A donor responded" |
| G5 | Member 1 → open the request | Status "Donor found"; the timeline has a new entry |
| G6 | Member 1 tries to respond to their own request (Blood requests → My requests) | Error: "You can't respond to your own request." |
| G7 | Notifications → **Mark all as read** | The badge disappears |

---

## Part H. Member: find donors and privacy

| # | Do | Expect |
| --- | --- | --- |
| H1 | Member 1 → **Find donors** → blood group = member 2's group | Member 2 appears with area and distance, no phone number |
| H2 | Turn on **Compatible donors** for group AB+ | Every compatible group appears |
| H3 | Member 2 → **Settings → Privacy → Show me in donor search** off | Toast "Donor visibility turned off" |
| H4 | Member 1 searches again | Member 2 no longer appears |
| H5 | Member 2 turns it back on | Member 2 appears again |

---

## Part I. Member: book a donation

| # | Do | Expect |
| --- | --- | --- |
| I1 | Member 2 → **Donate blood** → tick the checklist → Continue | The list of centres, nearest first |
| I2 | Choose a centre, pick a date and time → Confirm | "Your donation appointment has been scheduled."; a notification arrives |
| I3 | Book a second appointment | Error: "You already have an upcoming appointment…" |
| I4 | **Donation history** | The appointment is shown as Scheduled |

---

## Part J. Admin: manage everything

Browser 1 (admin):

| # | Do | Expect |
| --- | --- | --- |
| J1 | **Users**: search member 1 by name | Found; sort and pagination work |
| J2 | Edit member 1's phone and save | Toast; the change shows in their profile after reload |
| J3 | **Donors**: verify member 2 | Badge "Verified"; member 2 gets the "You're a verified donor" notification |
| J4 | **Blood requests**: open member 1's request → change status to **Approved** | Member 1 gets a notification; a timeline entry is added |
| J5 | **Emergency** queue: the sidebar badge shows the number of open emergencies → **Mark fulfilled** | The card disappears, the badge decreases, and member 1 sees "Fulfilled" |
| J6 | **Donations**: member 2's appointment → **Mark completed** | Toast shows a certificate number `QTR-2026-xxxxx`; member 2's donor record has `totalDonations: 1`; their dashboard shows 1 donation |
| J7 | **Inventory**: remove 1,000 units from AB- | Error (maximum 1,000) or stock stops at 0, never negative |
| J8 | **Inventory**: add 10 units to O- with a reason | Stock goes up; the home page vial updates after reload |
| J9 | **Locations**: add the area "Valencia Town" to Lahore; reload | It's still there |
| J10 | **Hospitals**: add a facility with the email `abc` | Error; with a valid email it saves and appears in the list |
| J11 | **Notifications**: send to "O- donors" with a 2-letter title | Error (3–80); with a valid title it sends to exactly the O- donors, and the history lists it |
| J12 | **Reports**: charts show the current month's activity → **Export CSV** | A CSV file downloads |
| J13 | **Activity log** | Every action above is listed with a name and time; the filters work |
| J14 | **Settings**: turn on **Maintenance mode** → confirm | A yellow banner; reload keeps it on |
| J15 | Member 1 tries to create a request | Error: "Qatra is under maintenance…". Admin turns it off again |
| J16 | **Users**: suspend member 1 | Member 1's next action fails and they can't log in ("suspended"). Reactivate afterwards |
| J17 | Try to suspend or delete your own admin account | Error: "You can't change your own account status." / "…delete your own account." |

---

## Part K. Security checks

| # | Do | Expect |
| --- | --- | --- |
| K1 | Logged in as member 1, open `/admin` | Redirected to `/dashboard` |
| K2 | Logged out, open `/admin/users` | Redirected to `/auth/login?next=/admin/users`; after the admin logs in, it opens `/admin/users` |
| K3 | As member 1, open the browser console (F12) and run: ``fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resource:'users',action:'list'})}).then(r=>r.json()).then(console.log)`` | `{error: "ADMIN_REQUIRED"}` |
| K4 | Same, but to `/api/data` | `{error: "ADMIN_REQUIRED"}` (the member endpoint refuses admin actions) |
| K5 | As member 1, run a `users` `update` for another user's id via `/api/data` | `{error: "FORBIDDEN"}` |
| K6 | Member 2 → Settings → **Sign out of all devices** | You're logged out; a second browser logged in as member 2 is also signed out on its next action |
| K7 | Settings → Change password with a wrong current password | "Your current password is incorrect." |

---

## Part L. Mobile and responsiveness

In Chrome press **F12**, then **Ctrl+Shift+M**, and pick iPhone SE (375px), then a tablet (768px).

| # | Check | Expect |
| --- | --- | --- |
| L1 | Home page | No sideways scrolling; the headline wraps; the stock board shows 4 vials per row |
| L2 | Dashboard | The ☰ menu opens the drawer; the bottom navigation bar is visible; a search icon is in the top bar |
| L3 | Any admin table (Users, Donors) | Shows as cards on the phone, as a table on wider screens |
| L4 | Open any dialog (Respond, Edit user) | Slides up from the bottom, full width; buttons are full width |
| L5 | Tap into an input on a real iPhone | The page doesn't zoom in |
| L6 | Trigger a toast | It appears above the bottom navigation bar, not behind it |
| L7 | Rotate to landscape | The layout adapts; nothing is cut off |

---

## Part M. Demo mode (optional)

Temporarily rename `.env.local` to `.env.local.bak` and restart `npm run dev`. The app runs on sample data: any email opens the member dashboard, and emails ending in `@qatra.pk` open the admin console. Rename the file back afterwards and restart.

---

## Common problems

| Symptom | Fix |
| --- | --- |
| "Firebase server configuration is missing" | Check `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in `.env.local` (keep the private key in quotes); restart `npm run dev` |
| Logged in but sent back to login | The `users/<UID>` document is missing or its `status` isn't `active` |
| `/admin` opens `/dashboard` | `role` isn't exactly `admin` (lowercase string) in `users/<UID>` |
| Donate or Request pages show "No facilities are listed yet" | Do step C3 |
| "Missing or insufficient permissions" in the console | Deploy the rules again (B2) |
| `npm test` says TypeScript not found | Run `npm install` first |
