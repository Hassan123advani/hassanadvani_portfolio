# Firebase Setup — project `portfolio-datbase`

## 1. Web app config (frontend) — **needed: `VITE_FIREBASE_API_KEY`**
Firebase console → ⚙ Project settings → *Your apps* → Web app → copy `apiKey`.
Put it in **`frontend/.env.local`**:
```env
VITE_FIREBASE_API_KEY=AIza...
```
The other `VITE_FIREBASE_*` values are already filled in from the config you supplied.
The web config is public by design; protection comes from Auth, rules and the backend.

## 2. Enable Authentication — **still to do** (checked 2026-11-09: the API answers `CONFIGURATION_NOT_FOUND`)
Console → Build → **Authentication** → **Get started** → Sign-in method → enable **Email/Password**.
Until this is done nobody can sign in at `/admin` (the login form now says so).
(Optional) Settings → *Authorized domains*: add your production domain.
(Optional) Templates → Password reset: customise sender name/text.

## 3. Create Firestore — **still to do** (checked 2026-11-09: "Cloud Firestore API has not been used in project portfolio-datbase")
Console → Build → **Firestore Database** → **Create database** → production mode → location `asia-south1` (Mumbai).

## 4. Service account (backend) — **needed**
Console → Project settings → **Service accounts** → *Generate new private key* → downloads a JSON file.
Keep it **outside git**. Then in **`backend/.env.local`** choose one:
```env
# Option A (local): path to the JSON file
FIREBASE_SERVICE_ACCOUNT_PATH=C:/secure/portfolio-datbase-firebase-adminsdk.json
# Option B (hosting): individual fields
FIREBASE_PROJECT_ID=portfolio-datbase
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@portfolio-datbase.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
`.gitignore` already excludes `*service-account*.json`, `firebase-adminsdk*.json`, `secrets/` and `.env`.

## 5. Deploy security rules
```powershell
npm install -g firebase-tools
firebase login
cd D:\portfolio
firebase deploy --only firestore:rules,firestore:indexes   # uses .firebaserc → portfolio-datbase
```
(Or paste `firestore.rules` into Console → Firestore → Rules → Publish.)

## 6. Create the first super admin
With a password (read from an environment variable, so it never lands in git, logs or files):
```powershell
cd backend
$env:SUPER_ADMIN_PASSWORD = '<your-password>'
npm run create-super-admin -- hassanadvani08@gmail.com "Hassan Advani"
Remove-Item Env:SUPER_ADMIN_PASSWORD
```
Without `SUPER_ADMIN_PASSWORD` it prints a one-time password-setup link instead.

Verify the login end-to-end (Firebase sign-in + backend role check), with the backend running:
```powershell
$env:ADMIN_PASSWORD = '<your-password>'; npm run verify-admin-login -- hassanadvani08@gmail.com; Remove-Item Env:ADMIN_PASSWORD
```
Then sign in at `http://localhost:5173/admin` and use **Account → Change password** (min. 8 characters). Then open `http://localhost:5173/admin`, sign in, and click
**Import starter content** on the dashboard.

## Verify
`npm run check-env` in `backend/` shows ✔ Firebase Admin. `GET /api/health` shows `"firebase": true`.
