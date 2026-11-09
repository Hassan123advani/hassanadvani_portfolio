# Implementation Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Inspect project, preserve assets in `_old_backup/` | ✅ Done |
| 2 | Frontend/backend architecture, tooling, env templates, `.gitignore` | ✅ Done |
| 3 | React portfolio with real content and bundled fallback | ✅ Done |
| 4 | Firebase Auth, Firestore access via Admin SDK, security rules | ✅ Code done · ⏳ needs credentials + rules deploy |
| 5 | Cloudinary signed uploads, media library, deletion | ✅ Code done · ⏳ needs cloud name + secret |
| 6 | Hidden admin, roles, permissions, admin management, activity log | ✅ Code done · ⏳ needs live test with Firebase |
| 7 | Blog CMS + Projects CMS (+ certificates, testimonials, taxonomy, settings) | ✅ Code done · ⏳ needs live test |
| 8 | Contact form, AI auto-replies, owner notifications (Resend), retries, anti-abuse | ✅ Code done · owner email live-tested · ⏳ needs `ANTHROPIC_API_KEY`, verified domain, Firebase |
| 9 | Testing & fixes | ✅ 40 backend + 5 frontend tests, build, mobile overflow check |
| 10 | Deployment instructions | ✅ Below — **not deployed** (needs your permission) |

## Phase 10 — Deployment
Nothing has been deployed or pushed.

### Backend (Render, Railway, Fly.io or Google Cloud Run)
- Root directory `backend`, build `npm ci`, start `npm start`, Node 20+.
- Environment: everything from `backend/.env.example`, using **Option B** Firebase fields. Set
  `NODE_ENV=production`, `TRUST_PROXY=1`, `CORS_ORIGINS=https://<your-frontend-domain>`, `SITE_URL=https://<your-frontend-domain>`.
- Health check path: `/api/health`.

### Frontend (Vercel — your current host)
- Root directory `frontend`, framework Vite, build `npm run build`, output `dist`.
- Environment: `VITE_API_URL=https://<backend-url>`, all `VITE_FIREBASE_*`, `VITE_SITE_URL`, `VITE_ADMIN_PATH`.
- `vercel.json` already handles SPA routing and security headers. To serve the sitemap on your domain add:
  `{ "source": "/sitemap.xml", "destination": "https://<backend-url>/sitemap.xml" }` as the **first** rewrite.
- Update `public/robots.txt` sitemap URL if the domain changes.

### Firebase
Cloud Functions deployment (API + contact pipeline + Secret Manager): see [CONTACT_AUTOMATION.md → Deploy](CONTACT_AUTOMATION.md#3-deploy-to-firebase-cloud-functions-blaze-plan-required). The Express backend can alternatively run on Render/Railway as below.

`firebase deploy --only firestore:rules,firestore:indexes`; add the production domain to Auth → Authorized domains.

### After deploy
1. `npm run create-super-admin` (locally, pointing at the same Firebase project).
2. Sign in at `https://<domain>/admin` → Import starter content → review Profile → upload résumé.
3. Send a test contact message.
