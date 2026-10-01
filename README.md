# Qatra — Blood Management System

Qatra (Urdu for "drop") is a frontend for a blood donation and request network: a public website, a member dashboard for donors and patients' families, and an admin console for coordinators. It is built with Next.js 15 (App Router), React 19, TypeScript and Tailwind CSS 3, with lucide-react for icons and no other runtime dependencies. Charts are hand-built SVG/CSS.

All data is fictional and served from a mock service layer, so the app runs with no backend.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm test           # automated tests (no Firebase needed)
```

Node 18.18 or newer is required (Node 20+ recommended).

### Demo sign-in

The auth screens validate input but accept any credentials:

| Sign in with | Lands on |
| --- | --- |
| any email, e.g. `ahmed@example.com` | `/dashboard` as Ahmed Hassan (O+, Johar Town, Lahore) |
| any `@qatra.pk` email, e.g. `sana@qatra.pk` | `/admin` as Sana Mirza |

On the OTP screen, `000000` demonstrates the "code expired" error; any other 6 digits succeeds. The in-app clock is fixed at 27 Sep 2026, 10:30 PKT (`MOCK_NOW` in `lib/utils.ts`) so countdowns and "time ago" labels stay consistent.

## Routes

**Public:** `/`, `/about`, `/faq`, `/contact`
**Auth:** `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/verify-otp`
**Member dashboard:** `/dashboard`, `/dashboard/profile`, `/dashboard/register-donor`, `/dashboard/donate`, `/dashboard/request`, `/dashboard/donors`, `/dashboard/blood-requests`, `/dashboard/donations`, `/dashboard/requests`, `/dashboard/requests/[id]`, `/dashboard/notifications`, `/dashboard/settings`
**Admin:** `/admin`, `/admin/users`, `/admin/donors`, `/admin/requests`, `/admin/emergency`, `/admin/donations`, `/admin/inventory`, `/admin/blood-groups`, `/admin/hospitals`, `/admin/locations`, `/admin/reports`, `/admin/notifications`, `/admin/activity`, `/admin/settings`

Useful query parameters: `/dashboard/donors?group=O%2B&city=Lahore&compatible=1`, `/dashboard/blood-requests?tab=emergency`, `/dashboard/blood-requests?respond=r-3001`, `/admin/users?q=ali`, `/dashboard/profile?setup=donor`.

## Project structure

The app is split into two modules, **client** (member dashboard) and **admin**, on top of a shared core.

```
app/
  (public)/            Home, about, FAQ, contact
  auth/                Login, register, password reset, verification
  (client)/dashboard/  CLIENT MODULE routes (URL: /dashboard/...)
  (admin)/admin/       ADMIN MODULE routes   (URL: /admin/...)
  api/data/            Client endpoint: public + member actions only
  api/admin/           Admin endpoint: admin actions only, admins only
  api/auth/            Session cookie create / clear
modules/
  client/components/   Member widgets and forms (donate, request, profile, settings…)
  admin/components/    Admin managers (users, donors, requests, inventory, reports…)
components/            SHARED: ui/, layout/, blood/, charts/, public/, auth forms
services/              Shared typed service layer; picks /api/data or /api/admin per action
lib/
  actionScopes.ts      Which actions are public, member or admin (browser-safe)
  server/              Server only: core.ts helpers, validate.ts, execute.ts router,
                       handlers/public.ts, handlers/client.ts, handlers/admin.ts
  firebase/            Firebase Web + Admin SDK setup, session bootstrap
  validations.ts, eligibility.ts, constants.ts, geo.ts, utils.ts
middleware.ts          Sends signed-out visitors to login
tests/                 Automated tests (npm test) with in-memory Firebase fakes
data/                  Demo data (used when Firebase isn't configured) and starter data
types/                 Shared TypeScript models
```

Rules the tests enforce: the client module never imports the admin module (and vice versa), shared code never imports either module, and no browser code can reach `firebase-admin`, `next/headers` or `lib/server`.

## Connecting a real API

Every page and component reads data through `services/*`. Each service function currently returns `mock(data)` from `services/client.ts`, which adds a short delay so loading states are visible.

1. Set `NEXT_PUBLIC_API_URL` in `.env.local`.
2. Replace the body of each service function with a call to `api<T>(path, init)`, keeping the same return type. Types live in `types/`, so the UI does not change.

Example:

```ts
async list(): Promise<BloodInventory[]> {
  return USE_MOCKS ? mock(mockInventory) : api<BloodInventory[]>("/inventory");
}
```

## Design system

Colours are defined in `tailwind.config.ts`: `hemo` (deep blood red, primary `hemo-600`), `ink` (navy text and surfaces), `paper` background, `line` borders, and `ok` / `warn` / `info` status scales. Type is Public Sans for UI and Newsreader for landing-page headlines, loaded with `next/font`. Components use a 6px radius, 10px for cards, and respect `prefers-reduced-motion`.

## Privacy and safety

- Donor and requester locations are stored and shown at area level only. Distances are approximate and measured from the viewer's area.
- Phone numbers are masked until a donor accepts a request.
- Eligibility checks are indicative only; every screen that shows a result carries a disclaimer that final eligibility is decided by medical staff at the donation site.

## Accessibility

Semantic landmarks, labelled form controls with inline errors, keyboard-operable dialogs (native `<dialog>`), menus and tabs, visible focus rings, text alternatives for every chart, and tables that reflow into cards on small screens.

## Firebase setup

The project now supports Firebase Authentication + Firestore through the included server-side Firebase Admin layer and `/api/data` API. Mock data remains available when Firebase environment variables are not configured.

### 1. Create the Firebase project

In Firebase Console:

1. Create a project named `qatra-blood-management` (or any name you prefer).
2. Add a Web App under Project settings > Your apps.
3. Copy the Web App configuration into `.env.local` using `.env.example`.
4. Authentication > Sign-in method: enable **Email/Password**.
5. Firestore Database: create a database in production mode.
6. Publish the included `firestore.rules` and `firestore.indexes.json` using Firebase CLI, or paste the rules into Firestore > Rules and deploy the indexes.
7. Storage is optional; the included `storage.rules` are ready for profile/public uploads.

### 2. Configure Firebase Admin

For server-side session cookies and protected Firestore operations, create a Firebase service account in:

Project settings > Service accounts > Generate new private key.

Put the values into `.env.local` as:

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
```

Never expose these three variables with `NEXT_PUBLIC_` and never commit `.env.local`.

### 3. Create the first admin

Create the admin user in Firebase Authentication, then create a Firestore document:

Collection: `users`
Document ID: **the Firebase Authentication UID**

```json
{
  "fullName": "Qatra Admin",
  "email": "admin@example.com",
  "phone": "03001234567",
  "bloodGroup": "A+",
  "gender": "other",
  "dateOfBirth": "1990-01-01",
  "location": {
    "city": "Lahore",
    "area": "Gulberg",
    "point": { "lat": 31.5204, "lng": 74.3587 }
  },
  "role": "admin",
  "status": "active",
  "verified": true,
  "joinedAt": "2026-09-28T00:00:00.000Z"
}
```

The admin console is protected by the server session and the Firestore `role == admin` check. Do not use an email-domain check for admin access.

### 4. Collections used by Qatra

- `users`
- `donors`
- `bloodRequests`
- `donations`
- `hospitals`
- `locations`
- `inventory`
- `notifications`
- `activity`
- `donorContacts`

Document fields follow the TypeScript interfaces in `types/`.

### 5. Run locally

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

If Firebase variables are missing, the application falls back to its fictional mock dataset. Once Firebase is configured, authentication and the service layer use Firebase instead.
