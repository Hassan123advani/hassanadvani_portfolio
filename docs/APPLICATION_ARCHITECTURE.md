# Application Architecture

```
 Browser ──────────────────────────────────────────────┐
  React SPA (Vite)                                      │
   ├─ public pages ──GET /api/public/*──┐               │
   ├─ contact form ──POST /api/public/contact           │
   └─ /admin (lazy chunk)                               │
       ├─ Firebase Auth (email+password) → ID token     │
       ├─ /api/admin/* with  Authorization: Bearer …    │
       └─ file ──signed POST──► Cloudinary (direct)     │
                                                        ▼
 Express API (backend/)                     Firebase project “portfolio-datbase”
  helmet · CORS allow-list · JSON 1MB        ├─ Authentication (users, custom claims)
  rate limits (global / admin / contact)     └─ Cloud Firestore (collections below)
  requireAuth → admins/{uid} → permission    Cloudinary (signs uploads, verifies, deletes)
  zod validation · sanitize-html             Resend HTTP API → owner's Gmail inbox
  activity log on every write                GitHub REST API (cached 15 min)
```

## Request flow: admin write
1. Browser gets a fresh Firebase **ID token** (`auth.currentUser.getIdToken()`).
2. `requireAuth` verifies it with `verifyIdToken(token, checkRevoked=true)`.
3. It loads `admins/{uid}`; missing → 403 `NOT_ADMIN`, `active:false` → 403 `ACCOUNT_DISABLED`.
4. `requirePermission('blog')` (or `requireSuperAdmin`) authorises the route.
5. Body is validated with **zod**; rich text is sanitised with an allow-list (only YouTube iframes).
6. Firestore write through the Admin SDK, then an `activityLogs` entry.

## Public reads
The public API returns only `status == 'published'` items whose `publishedAt <= now` (scheduling).
Responses strip admin metadata and carry short `Cache-Control` headers. The same rule is mirrored in
`firestore.rules`, so even direct Firestore reads cannot see drafts.

## Frontend structure
- `content/portfolio.json` — real content. Used (a) as a fallback when the API is unreachable/unconfigured and (b) as the payload of the dashboard’s “Import starter content”.
- `hooks/useApi` — loading / error / fallback handling for every data view.
- `lib/api.js` — fetch wrapper with timeout, typed `ApiError` (`offline` flag), token provider for admin calls.
- `lib/sanitize.js` — DOMPurify second layer before rendering any HTML.
- The admin bundle, Firebase SDK and the editor are separate lazy chunks; public pages never download them.

## Uploads (Cloudinary)
`POST /api/admin/media/sign` → `{signature, timestamp, folder, apiKey, cloudName}` → browser uploads
straight to Cloudinary → `POST /api/admin/media {publicId}` → server fetches the asset from Cloudinary
(proving it exists and lives under `CLOUDINARY_FOLDER/`) and records it. The secret never leaves the server.

## Contact form
Validation (client + zod) → honeypot field and minimum fill time (bots get a silent 202) → rate limit
5 per 15 min per IP → spam heuristics (flagged, not emailed) → stored in `messages` with a salted IP hash →
AI draft from verified facts (Claude) → automatic reply to the visitor (verified domain only) → notification to `CONTACT_NOTIFY_TO` with the AI response and the visitor as **Reply-To**. Per-step statuses, idempotent retries and anti-abuse limits: [CONTACT_AUTOMATION.md](CONTACT_AUTOMATION.md). Deployed, the same Express app runs as the `api` Cloud Function and a Firestore trigger runs the pipeline.

## Tests
- `backend/test/inquiry.*.test.js` — 18 contact-pipeline tests (mocked Claude + Resend, in-memory Firestore): full workflow, prompt injection, output audit, uncertain questions, duplicates, retries, permanent failures, AI outage, anti-abuse limits, spam, sandbox sender.
- `backend/test/api.test.js` — 22 route-level tests using in-memory Firestore/Auth fakes (`test/fakes.js`): visibility, scheduling, auth, permissions, privilege escalation, last-super-admin, sanitisation, contact spam/rate-limit, starter import validation.
- `frontend/src/lib/format.test.js` — helper tests (Vitest).
