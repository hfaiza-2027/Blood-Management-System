# Changes

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
