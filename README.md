# BloodBridge — Blood Management System

BloodBridge is a web application for a blood donation and request network: a public website, a member dashboard for donors and patients' families, and an admin console for coordinators. It is built with Next.js 15 (App Router), React 19, TypeScript and Tailwind CSS 3, on Firebase Authentication and Cloud Firestore, with lucide-react for icons. Charts are hand-built SVG/CSS.

BloodBridge always runs on a real Firebase project. There is no demo mode: if Firebase settings are missing, every page shows a setup screen listing the variables to add.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Firebase values
npm run dev                  # http://localhost:3000
npm run build                # production build
npm run typecheck            # tsc --noEmit
npm test                     # automated tests (no Firebase needed)
```

Node 18.18 or newer is required (Node 20+ recommended). Full Firebase setup, including the first admin account, is in [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

### First run checklist

1. Create the Firebase project and fill `.env.local` (FIREBASE_SETUP.md, sections A–B).
2. Deploy the security rules and indexes: `firebase deploy --only firestore:rules,firestore:indexes`.
3. Create the first admin (FIREBASE_SETUP.md, section D) and log in. Admins always land in the admin console.
4. Admin → System settings → **Load starter data** to add sample facilities, stock targets and cities.
5. Record real stock in Admin → Blood inventory. Stock starts at zero so reports never show invented numbers.

## Routes

**Public:** `/`, `/about`, `/faq`, `/contact`
**Auth:** `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`
**Member dashboard:** `/dashboard`, `/dashboard/profile`, `/dashboard/register-donor`, `/dashboard/donate`, `/dashboard/request`, `/dashboard/donors`, `/dashboard/blood-requests`, `/dashboard/donations`, `/dashboard/requests`, `/dashboard/requests/[id]`, `/dashboard/notifications`, `/dashboard/settings`
**Admin:** `/admin`, `/admin/users`, `/admin/donors`, `/admin/requests`, `/admin/emergency`, `/admin/donations`, `/admin/inventory`, `/admin/blood-groups`, `/admin/hospitals`, `/admin/locations`, `/admin/reports`, `/admin/inbox`, `/admin/notifications` (broadcasts), `/admin/activity`, `/admin/settings`, `/admin/account`

Useful query parameters: `/dashboard/donors?group=O%2B&city=Lahore&compatible=1`, `/dashboard/blood-requests?tab=emergency`, `/admin/users?q=ali`, `/admin/reports?range=30d&city=Lahore&group=O-`, `/admin/inbox?tab=notifications`.

### Who lands where

| Signed in as | After login | Notes |
| --- | --- | --- |
| Member or donor | The page they were opening, or `/dashboard` | Never sent into the admin console |
| Admin | `/admin` (or the admin page they were opening) | Public buttons like "Request blood" no longer strand admins in the member view. Admins can still open the member view from the account menu; a banner offers the way back. |

Signed-in visitors who open `/auth/login` or `/auth/register` go straight to their own home, and the public navbar shows "My dashboard" or "Admin console" instead of "Log in".

## Project structure

The app is split into two modules, **client** (member dashboard) and **admin**, on top of a shared core.

```
app/
  (public)/            Home, about, FAQ, contact
  auth/                Login, register, password reset, email verification
  (client)/dashboard/  CLIENT MODULE routes (URL: /dashboard/...)
  (admin)/admin/       ADMIN MODULE routes   (URL: /admin/...)
  api/data/            Client endpoint: public + member actions only
  api/admin/           Admin endpoint: admin actions only, admins only
  api/auth/            Session cookie create / clear
modules/
  client/components/   Member widgets and forms (donate, request, profile, settings…)
  admin/components/    Admin managers (users, donors, requests, inventory, inbox…)
  admin/components/reports/  Report filter bar, KPI cards, CSV export
components/            SHARED: ui/, layout/, blood/, charts/, account/, notifications/, system/
services/              Typed service layer; picks /api/data or /api/admin per action
lib/
  actionScopes.ts      Which actions are public, member or admin (browser-safe)
  routing.ts           Post-login destination per role (browser-safe)
  reportRange.ts       Report presets, Pakistan-time buckets, previous period (browser-safe)
  server/              Server only: core.ts helpers + cache, validate.ts, execute.ts router,
                       reports.ts engine, handlers/public.ts, handlers/client.ts, handlers/admin.ts
  firebase/            Firebase Web + Admin SDK setup, session bootstrap
  config.ts            Detects missing Firebase settings for the setup screen
middleware.ts          Sends signed-out visitors to login
data/                  Area coordinates and optional starter records
tests/                 Automated tests (npm test) with in-memory Firebase fakes
types/                 Shared TypeScript models
```

Rules the tests enforce: the client module never imports the admin module (and vice versa), shared code never imports either module, and no browser code can reach `firebase-admin`, `next/headers` or `lib/server`.

## Reports

Admin → Reports builds every figure on the server for the chosen period and compares it with the previous period of the same length.

- **Filters:** last 7 / 30 / 90 days, last 12 months, this year or a custom range (up to two years), plus city, blood group, urgency and facility. Filters live in the URL, so a view can be bookmarked or shared.
- **Summary:** requests, fulfilment rate, emergencies met on time, donations completed, median time to first donor, median time to fulfil, new donors and new members, each with the change against the previous period.
- **Trends:** daily, weekly or monthly (chosen from the range length) requests vs donations, and fulfilment rate with gaps where there were no requests.
- **Breakdowns:** request status and urgency, demand vs supply per blood group (requests, active donors, stock), cities, the top 15 facilities, appointment outcomes, donor verification, and stock with units in and out.
- **Export:** one CSV with every section (opens in Excel or Google Sheets), and Print / PDF with a print layout that hides navigation.

Request timestamps (`firstResponseAt`, `fulfilledAt`, `closedAt`) are written when donors respond and coordinators change status; older records fall back to their timeline. Every stock adjustment is stored in `inventoryMovements`.

## Performance

- Totals use Firestore `count()` queries instead of downloading collections.
- Reports, dashboards and the activity log read only the documents inside the requested period or limit.
- Public data (stock, facilities, cities, network totals, emergency feed) is cached per server instance for up to a minute and refreshed immediately by the writes that change it.
- The session is checked once per request and shared by the layout and the page.
- Stock adjustments and donor responses run in Firestore transactions, so simultaneous actions can't overwrite each other or double count.

Admin tables (users, donors, requests, donations) still load their full collection and paginate in the browser. That is comfortable up to several thousand records; beyond that, move them to server-side pagination.

## Design system

Colours are defined in `tailwind.config.ts`: `hemo` (deep blood red, primary `hemo-600`), `ink` (navy text and surfaces), `paper` background, `line` borders, and `ok` / `warn` / `info` status scales. Type is Public Sans for UI and Newsreader for landing-page headlines, loaded with `next/font`. Components use a 6px radius, 10px for cards, and respect `prefers-reduced-motion`. A thin progress bar shows on every page change.

## Privacy and safety

- Donor and requester locations are stored and shown at area level only. Distances are approximate and measured from the viewer's area.
- A requester's phone number is masked on the server for other members until they offer to donate. Admins and the requester always see it. The public emergency feed never includes numbers or names.
- Firestore rules close every collection to direct browser access except the member's own profile and notifications; all other reads and writes go through the server.
- Eligibility checks are indicative only; every screen that shows a result carries a disclaimer that final eligibility is decided by medical staff at the donation site.

## Accessibility

Semantic landmarks, labelled form controls with inline errors, keyboard-operable dialogs (native `<dialog>`), menus and tabs, visible focus rings, text alternatives for every chart, and tables that reflow into cards on small screens.
