# Qatra Firebase Setup — Step by Step

## A. Firebase project

1. Open Firebase Console.
2. Create a project.
3. Go to **Project settings → Your apps → Web app** and register Qatra.
4. Copy the Web SDK values into `.env.local`.
5. Go to **Authentication → Sign-in method → Email/Password** and enable it.
6. Go to **Firestore Database → Create database**.
7. Go to **Storage** only if you want profile images later.

## B. Local environment

Copy `.env.example` to `.env.local` and fill both sections:

- `NEXT_PUBLIC_*` = Web app configuration.
- `FIREBASE_*` = Admin SDK service-account configuration.

The private key must stay server-only.

## C. Firestore rules

Use the project's `firestore.rules` file.

With Firebase CLI:

```bash
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes
```

You can also paste the rules manually into Firebase Console → Firestore Database → Rules.

## D. First admin account

1. Firebase Console → Authentication → Users → Add user.
2. Create an email/password account.
3. Copy that user's **UID**.
4. Firestore → `users` → Add document.
5. Set the document ID to exactly that UID.
6. Add at least:

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

## E. Collections

Create these collections as the application begins using them:

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

You do not have to manually create every collection before running the app. Firestore creates a collection when the first document is written.

## E2. Load starter data (new)

A fresh Firestore has no hospitals, stock or cities, so Donate, Request blood and the home-page stock board would be empty.

1. Log in as the admin.
2. Open **Admin → Settings**.
3. Click **Load starter data**. It fills only empty collections (`hospitals`, `inventory`, `locations`) and never overwrites anything.

## E3. Deploy the updated rules (new)

`firestore.rules` was tightened: members can no longer give themselves the `admin` role, change their own `status`/`verified`, and new `settings` and `broadcasts` collections are admin-only. Deploy again:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## E4. Password reset link (optional)

Firebase's default reset email opens a Firebase-hosted page, which works as is. To use Qatra's own page instead, set the action URL in **Authentication → Templates → Password reset → Customise action URL** to `http://localhost:3000/auth/reset-password` (your domain in production).

## F. Important testing sequence

1. Create the admin account.
2. Start Qatra.
3. Log in as admin and confirm `/admin` opens.
4. Create a normal account using `/auth/register`.
5. Confirm the user document appears under `users/{uid}`.
6. Confirm email verification.
7. Register the user as a donor.
8. Check `donors/{id}`.
9. Create a blood request.
10. Check `bloodRequests/{id}`.
11. Book a donation.
12. Check `donations/{id}`.
13. Test donor search and approximate distance.
14. Test admin status/verification actions.

## G. Security rules

Do not disable Firestore rules to make the app work. The application intentionally uses a server API with Firebase Admin for protected operations. Admin access is based on the Firestore user's `role` field, not on an email suffix.

## H. Production reminder

Before production, add:

- App Check
- rate limiting on API routes
- audit logging for sensitive admin actions
- proper transactional inventory updates
- real notification delivery (email/SMS/WhatsApp)
- verified hospital/blood-bank onboarding
- professional medical/legal review of donor eligibility wording
