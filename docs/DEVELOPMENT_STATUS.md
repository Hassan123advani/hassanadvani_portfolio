# Development Status

_Last updated: 2026-11-09_

## Summary
All 10 phases are implemented in code. Automated checks pass. The site runs locally with real content.
Firebase-, Cloudinary- and Resend-backed features are wired up but **cannot be exercised end-to-end until
the credentials below are added** — they have been tested against in-memory fakes, not the live services.

## Verified
| Check | Result |
| --- | --- |
| `backend: npm test` | 40/40 pass — incl. 18 contact-pipeline tests (AI grounding, prompt injection, output audit, duplicates, retries, anti-abuse, spam) with mocked Claude + Resend |
| `frontend: npm test` | 5/5 pass |
| `frontend: npm run build` | passes; public entry ≈ 58 KB + React 179 KB (admin, Firebase, editor are lazy chunks) |
| Bundle scan | no secret values in `dist/` |
| Live run (no credentials) | API starts; public endpoints return 503 `FIREBASE_NOT_CONFIGURED`; site falls back to bundled content; GitHub integration returns real repos |
| Resend (real API) | Owner notification delivered to hassanadvani08@gmail.com twice (test script + real pipeline run, ids `01a1bfe3…`, `01a1bfeb…`). Account has **0 verified domains** → visitor auto-replies correctly skipped. |
| Cloud Functions entry | `src/functions.js` loads; exports `api`, `onInquiryCreated` (messages/{id}), `retryInquiries` (every 10 min) in `asia-south1` with Secret Manager secrets. Not deployed. |
| Mobile 390px | home, about, contact, certificates, GitHub, blog, 404, admin — no horizontal overflow |

## Admin on localhost — diagnosis (2026-11-09)
1. `frontend/.env.local` had an empty `VITE_FIREBASE_API_KEY`, so `/admin` showed "Admin is not configured". **Fixed**: the web config is set and `/admin` shows the sign-in form (verified in Chrome).
2. Sign-in still fails because **Firebase Authentication was never initialised** (`CONFIGURATION_NOT_FOUND`) and **Firestore was never created**. Both are one-click Console steps ([FIREBASE_SETUP.md §2-3](FIREBASE_SETUP.md)). The login form now explains this instead of a raw Firebase error.
3. The backend needs the **service-account key** to create the super admin and serve admin data.

## Not yet verified (needs credentials)
- Admin sign-in and every admin screen against real Firebase.
- Firestore rules deployed and evaluated.
- Real Cloudinary upload / delete.
- **Contact automation end-to-end** (real Firestore + real Claude + real visitor email): blocked on `ANTHROPIC_API_KEY`, a verified Resend domain, and Firebase credentials / Cloud Functions deploy. See [CONTACT_AUTOMATION.md](CONTACT_AUTOMATION.md).

## Credentials required — exactly where
| Credential | File | Variable | How to get it |
| --- | --- | --- | --- |
| Firebase Web API key | `frontend/.env.local` | `VITE_FIREBASE_API_KEY` | [FIREBASE_SETUP.md §1](FIREBASE_SETUP.md) — the prompt referenced it but the value wasn’t included |
| Firebase service account | `backend/.env.local` | `FIREBASE_SERVICE_ACCOUNT_PATH` **or** `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` | [FIREBASE_SETUP.md §4](FIREBASE_SETUP.md) |
| Cloudinary cloud name | `backend/.env.local` | `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard |
| Cloudinary API secret | `backend/.env.local` | `CLOUDINARY_API_SECRET` | Not available in this environment — paste locally |
| Resend API key | `backend/.env.local` | `RESEND_API_KEY` (plus `RESEND_FROM`, `CONTACT_NOTIFY_TO`, pre-filled) | [GMAIL_INTEGRATION.md](GMAIL_INTEGRATION.md) — sign up to Resend with hassanadvani08@gmail.com |
| Anthropic API key | `backend/.env.local` (+ Secret Manager when deployed) | `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| Verified sending domain | Resend + DNS | `RESEND_FROM` | `npm run resend-domain -- add <your-domain>` — needed for visitor auto-replies |
| IP hash salt | `backend/.env.local` | `IP_HASH_SALT` | any long random string |

`backend/.env.local` and `frontend/.env.local` already exist (copied from the examples) and are git-ignored.
Run `cd backend; npm run check-env` to see what is still missing.

## Resume here
1. Fill credentials above → `npm run check-env` all ✔.
2. Deploy rules, run `create-super-admin`, sign in, import starter content.
3. Work through [TODO.md](TODO.md) “Verify with live services”.

## Notes on the working tree
- Original files moved to `_old_backup/` (byte-identical copies verified before removal).
- `projects/*/index.html` were deleted (uncommitted) before this work started; they were restored from git
  into `_old_backup/projects/` and `frontend/public/demos/`.
- Root `README.md` now documents the project; the original GitHub-profile README is at `_old_backup/site/README.md`.
- Nothing committed, pushed or deployed.
