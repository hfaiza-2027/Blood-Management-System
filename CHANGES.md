# Changes

## Version 5: production-only, admin routing, reports v2, performance

### Demo mode removed
- All mock data, the mock service layer, the fixed demo clock, the OTP screen and the demo two-factor flow are gone. Every service talks to Firebase through `dataCall`.
- Missing Firebase settings now show a **setup screen** listing the variables to add, instead of silently falling back to sample data.
- Hard-coded figures were replaced with live ones: auth page and about page stats, dashboard profile completion and checklist, upcoming appointment time, broadcast history.
- `data/` now holds only area coordinates and optional starter records. Starter stock begins at **zero units**.

### Admin routing (the "stuck in the member view" bug)
- Login now decides the destination by role (`lib/routing.ts`): admins always land in `/admin`; a `next` link only wins when it points inside the console. Previously public buttons such as "Request blood" sent admins to `/dashboard/...` after login.
- The bell in the admin console opens the new **Inbox** instead of the member notifications page.
- Admins get **My account** inside the console (name, phone, password, sign out everywhere), so they never need the member settings page.
- When an admin opens the member view, a banner offers **Back to admin console**.
- The public navbar knows who is signed in and shows **Admin console** / **My dashboard**; `/auth/login` and `/auth/register` redirect signed-in people home.

### Reports v2
- Any period: last 7 / 30 / 90 days, 12 months, this year or a custom range (up to two years), plus city, blood group, urgency and facility filters, all in the URL.
- Comparison with the previous period on every summary figure; rates change in points.
- New measures: emergencies met on time, median time to first donor, median time to fulfil, unit fulfilment, new donors, new members, stock in/out.
- Fulfilment rate fixed: cancelled requests are excluded and periods with no requests show a gap instead of 0%.
- Breakdowns: status, urgency, demand vs supply per group, cities, top facilities, appointment outcomes, donor verification, stock.
- Full multi-section CSV export and a print layout for PDF.
- The Blood groups page uses the same engine, so both pages always agree.

### Performance and data integrity
- Totals use `count()` queries; dashboards, reports and the activity log read only the documents in range.
- Public data is cached per instance for up to a minute and refreshed by the writes that change it.
- Session lookups are shared between layout and page in one request.
- Stock adjustments and donor responses use Firestore transactions. Every stock change is stored in `inventoryMovements`.
- Requests now record `firstResponseAt`, `fulfilledAt` and `closedAt`.
- New composite indexes in `firestore.indexes.json` (deploy them).

### Security and privacy
- Firestore rules close every collection to direct browser access except a member's own profile and notifications.
- A requester's phone number is masked on the server until a member offers to donate; the public emergency feed drops names and numbers.
- Admin status, verification and donation status values are validated on the server.

### New features
- Working **contact form** (stored in `contactMessages`, with a spam trap) and an admin **Inbox** to handle messages.
- Facilities can be removed (blocked while they have open requests).
- Recent stock movements on the Inventory page.
- Page progress bar on every navigation; dashboards keep working if one section fails; greetings use Pakistan time.

### Tests
- 77 tests, all passing (18 new in `tests/improvements.test.ts`). The in-memory Firestore now supports range and `in` queries, ordering and transactions.

## Version 4: renamed to BloodBridge

- The app name is now **BloodBridge** everywhere people can see it (logo, page titles, emails, footer, FAQ, messages, docs).
- Technical names use lower case, as npm and email addresses need: package name `bloodbridge-blood-management`, demo admin emails `@bloodbridge.pk`, session cookie `bloodbridge_session`. Everyone is signed out once after this update and simply logs in again.
- Fixed `lib/server/handlers/client.ts`, which was cut off in the previous commit (the build on Vercel would fail without this).
- Areas and cities show cleanly everywhere ("Lahore" instead of ", Lahore") in admin tables, donor search and request pages; empty email or phone shows "Not added".
- Booking notification shows the date and time in 12-hour format ("17 Oct 2026 at 2:30 PM").
- `metadataBase` uses the Vercel URL (or `NEXT_PUBLIC_SITE_URL`) instead of a placeholder domain.
- Tests: 59, all passing. A test now checks that Tailwind scans every source folder.

## Version 3: admin and client modules, tests, server validation

- **Two modules:** `app/(client)` + `modules/client` for the member dashboard, `app/(admin)` + `modules/admin` for the admin console, and shared code in `components/`, `services/` and `lib/`. URLs are unchanged.
- **Separate endpoints:** `/api/data` serves public and member actions only; `/api/admin` serves admin actions only. The browser picks the endpoint automatically from `lib/actionScopes.ts`.
- **Split server code:** the old 800-line `lib/firebase/data.ts` became `lib/server/core.ts` (shared helpers), `handlers/public.ts`, `handlers/client.ts`, `handlers/admin.ts` and `execute.ts` (access checks and routing).
- **Server-side validation** (`lib/server/validate.ts`) for requests, appointments, donor registration, profile edits, facilities, broadcasts and inventory.
- **Less database load:** the admin sidebar badge now reads only emergency requests instead of every request on each page load.
- **Real availability:** the dashboard and profile show your actual donor availability (it was always shown as "available"). If you aren't a donor yet, a "Register as a donor" link appears instead.
- The dashboard no longer offers to respond to your own requests.
- Members can't change another donor's availability (clear FORBIDDEN error).
- The donor registration weight rule now matches the server (50–250 kg).
- **57 automated tests:** `npm test` (see FEATURES.md §5). New docs: `FEATURES.md` (features, validations, limitations) and `TESTING.md` (step-by-step manual test plan).

## Version 2

## Routing
- **Fixed:** `/dashboard` and `/admin` layouts called `redirect()` inside `try/catch`. Next.js redirects by throwing, so the catch swallowed it and sent everyone to the login page. Redirects now run outside the `try`.
- **Fixed:** admins were bounced from `/dashboard` back to `/admin`, so "Switch to donor view" looped. Admins can now open both.
- **New:** `middleware.ts` sends signed-out visitors from `/dashboard/*` and `/admin/*` to `/auth/login?next=…`, and login returns them to where they were going.
- Every dashboard page uses `requireUser()` (lib/session.ts), so an expired session redirects instead of showing an error page.

## Build and server/client separation
- **Fixed:** `services/client.ts` dynamically imported `lib/firebase/data` (firebase-admin + `next/headers`) from code that also runs in the browser, which breaks client bundles. Server data access is now registered once in `lib/firebase/server.ts` (imported by `app/layout.tsx`) and looked up at runtime.
- `firebase-admin` is marked as a server external package in `next.config.ts`.
- `dashboardService` and other services return typed results (they returned `unknown`, which fails `next build` type checking).

## Security
- **Fixed:** admin checks read a Firebase custom claim that was never set, so every admin action failed. Admin is now read from `users/{uid}.role`.
- **Fixed:** several write actions (edit/delete users, stock changes, request status) had no admin check. Every action now has an explicit rule: public, signed-in member, or admin.
- Members can only edit safe fields on their own profile; they can't change role, status or verification.
- `firestore.rules`: members can't grant themselves admin or change status/verification from the browser.
- Suspended accounts can't start a session or call the API.
- Public donor search strips phone, email and address.

## Features that now work end to end (Firebase mode)
- Blood requests save hospital name, code and area location; responding notifies the requester and updates the timeline.
- Admin request status changes, donor alerts, donation completion (with certificate and donor totals) all notify the member and write to the activity log.
- Broadcasts go only to the chosen audience (everyone, blood group or city) and appear in the sent history.
- Locations can be added/removed and are saved.
- Admin settings (general, matching rules, switches, maintenance mode) are saved; maintenance mode pauses new requests and bookings.
- **Load starter data** button in Admin → Settings.
- Settings: account details, privacy and notification switches are saved; "Show me in donor search" really hides you; password change uses Firebase re-authentication; "Sign out of all devices" revokes sessions.
- Notification and emergency badges show real counts.
- Firebase errors are shown as plain sentences; failed actions show a toast and undo optimistic changes instead of hanging.
- Charts show "No data yet" instead of breaking on an empty database; real dates use the live clock (demo mode keeps the fixed date).

## Mobile
- Dialogs open as full-width bottom sheets on phones, with full-width buttons and safe-area padding.
- Form fields use 16px text on phones so iOS doesn't zoom on focus.
- Toasts sit above the bottom navigation on phones and tablets.
- Search button in the mobile top bar; drawer closes on navigation.
- Headings scale down on small screens; table cards use one column on very narrow phones; no sideways page scroll.

`.env.local` was not modified.
