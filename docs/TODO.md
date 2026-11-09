# TODO

## You (owner) — credentials & content
- [ ] **Firebase Console:** Authentication → Get started → enable Email/Password; Firestore Database → Create database (asia-south1).
- [ ] Download the service-account key → `backend/.env.local` (`FIREBASE_SERVICE_ACCOUNT_PATH`), create the super admin with `SUPER_ADMIN_PASSWORD` (FIREBASE_SETUP.md §6), run `verify-admin-login`, sign in and change the password.
- [ ] Listen to `intro-en.mp4` and `intro-ur.mp4` once (the voices were generated and measured, not checked by ear).
- [x] `VITE_FIREBASE_API_KEY` added to `frontend/.env.local`.
- [ ] Download the Firebase service account and set it in `backend/.env.local`.
- [ ] Enable Email/Password auth and create Firestore (see FIREBASE_SETUP.md).
- [ ] Add `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_API_SECRET` to `backend/.env.local`; rotate the secret if it was shared in chat.
- [x] Resend key added to `backend/.env.local`; owner notification verified in Gmail.
- [ ] **Rotate the Resend key** (it was pasted in chat; it also has full access) — create a *Sending access* key for production.
- [ ] Add `ANTHROPIC_API_KEY` to `backend/.env.local`.
- [ ] Verify a Resend sending domain and set `RESEND_FROM` on it (required for visitor auto-replies).
- [ ] Upgrade Firebase to Blaze, set Secret Manager secrets, `firebase deploy --only functions,firestore:rules` (with your approval).
- [ ] Deploy `firestore.rules`; run `npm run create-super-admin`.
- [ ] Review the three **Services** entries (written from your listed skills) and edit/remove as you see fit.
- [ ] Upload your résumé PDF (Profile & résumé) — the site currently offers “Request my résumé”.
- [ ] Add certificate verification URLs (each certificate image shows a coursera.org/verify link).
- [ ] Add GitHub repository links to the three projects if their code is public.
- [ ] Confirm the LinkedIn URL (original site and README used different slugs; the site uses `hassan-saqib-advani-a20560437`).
- [x] Intro video produced (EN + UR voice-over, captions) and live on the home page.

## Verify with live services
- [ ] Sign in at `/admin`; confirm a Firebase user who is not in `admins` is rejected.
- [ ] Import starter content; check projects & certificates render from Firestore.
- [ ] Create, schedule, publish, unpublish and delete a post with images, captions and two YouTube embeds.
- [ ] Upload/delete media; confirm it disappears from Cloudinary.
- [ ] Contact E2E: submit the form with an address you own → inquiry in Firestore → AI answer → visitor email → owner notification with AI response; Reply in Gmail reaches the visitor.
- [ ] Ask a question the facts don't cover (e.g. pricing) → visitor told Hassan will reply personally; admin shows *needs attention*.
- [ ] Invite a regular admin with only `blog`; confirm other sections are blocked.
- [ ] Try to deactivate/delete the last super admin — expect refusal.

## Nice to have
- [ ] Optional reCAPTCHA / Turnstile on the contact form if spam appears.
- [ ] Prerender/SSR for richer link previews of individual articles (SPA meta tags are client-side).
- [ ] Shared rate-limit store (Redis) if the API ever runs on more than one instance.
- [ ] Firebase emulator suite tests for `firestore.rules`.
