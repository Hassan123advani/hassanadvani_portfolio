# Admin Security

## Hidden route ≠ security
`/admin` (set by `VITE_ADMIN_PATH`) has no links anywhere on the public site, is `noindex,nofollow`,
is excluded from the sitemap and **not** listed in `robots.txt` (listing it there would advertise it).
But the path is necessarily present in the JavaScript bundle. Real protection is below.

## Layers
1. **Firebase Authentication** — email/password; Firebase throttles brute force (`auth/too-many-requests`).
   Sessions use `browserSessionPersistence` (cleared when the tab/browser closes).
2. **Backend authorisation** on every `/api/admin/*` request:
   ID token verified with revocation check → `admins/{uid}` must exist and be `active` → role/permission check.
   A valid Firebase account that is not in `admins` gets 403 and is signed out of the dashboard.
3. **Firestore rules** (`firestore.rules`) — clients can never write anything; reads are limited to published
   content or to admins with the matching permission. Default deny.
4. **Validation & sanitisation** — zod schemas on every write; rich text passes a strict HTML allow-list on
   the server (only YouTube iframes, safe URL schemes, forced `rel="noopener noreferrer nofollow"`), and
   DOMPurify again in the browser before rendering.
5. **Transport & headers** — helmet, CORS allow-list (`CORS_ORIGINS`), JSON body limit, `X-Robots-Tag: noindex` on the API.
6. **Rate limits** — 600 req/15 min per IP on the API, 120/min on admin, 5/15 min on the contact form.
7. **Audit** — every admin write is recorded in `activityLogs` with actor and target.

## Roles
| | Super admin | Admin |
| --- | --- | --- |
| Content sections | all | only granted permissions |
| Invite / edit / (de)activate / delete admins, change roles & permissions | ✔ | ✖ |
| Send password reset links | ✔ | ✖ (own: “Forgot password” on login) |
| Activity log | ✔ | if `activity` granted |

## Privilege-escalation protections (tested)
- Only `requireSuperAdmin` routes can change roles/permissions; regular admins get 403.
- Permissions are filtered to the known list; unknown values are rejected.
- Nobody can change their own role, deactivate or delete themselves.
- Demoting/deactivating/deleting a super admin runs in a Firestore **transaction** that refuses if no other
  active super admin would remain (`LAST_SUPER_ADMIN`).
- Deactivation disables the Firebase user and **revokes refresh tokens**; role changes also revoke tokens, so
  new custom claims apply immediately.

## Passwords
**Account → Change password** (every admin): re-authenticates with the current password (`reauthenticateWithCredential`), then `updatePassword`; min. 8 characters, must differ from the current one, clear errors for a wrong current password / weak password / network problems, and "Forgot your current password?" sends a Firebase reset email. The change is recorded as `admins.password_change` in the activity log; the server only accepts that entry from a session re-authenticated in the last 10 minutes and never sees a password.

Never stored in Firestore, never displayed, never set by another admin. New admins and resets receive a
Firebase **password-reset email**, sent by Firebase Authentication itself.
The bootstrap script prints the first link only to your local terminal.

## Checklist before going live
- [ ] Deploy `firestore.rules`.
- [ ] `CORS_ORIGINS` = production frontend URL only; `TRUST_PROXY=1` behind the host's proxy.
- [ ] Random `IP_HASH_SALT`.
- [ ] Rotate any credential that was ever pasted into a chat or committed.
- [ ] Enable 2-Step Verification on the Google account that owns Firebase, and on your Resend account.
- [ ] Firebase Auth → *Authorized domains* contains only your domains.
