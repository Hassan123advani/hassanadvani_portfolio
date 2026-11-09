# Muhammad Hassan Advani — Portfolio

Full-stack personal portfolio with a hidden, role-based admin CMS.

| Part | Stack |
| --- | --- |
| `frontend/` | React 18 + Vite, React Router, TipTap editor, Firebase Auth (admin only) |
| `backend/` | Node.js + Express, Firebase Admin SDK (Firestore + Auth), Cloudinary signed uploads, Resend email + Claude AI auto-replies, deployable as Firebase Cloud Functions |
| `docs/` | Architecture, setup guides, security model, video plan, status & TODO |
| `scripts/` | Setup and verification scripts |
| `_old_backup/` | The original static site, assets and project demos, preserved untouched |

## Quick start

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1   # installs deps, creates env files
cd backend;  npm run dev     # http://localhost:4000
cd frontend; npm run dev     # http://localhost:5173
```

The public site works immediately with the bundled real content. The CMS, contact form and
uploads need credentials — see **[docs/DEVELOPMENT_STATUS.md](docs/DEVELOPMENT_STATUS.md)** for exactly
which values go where.

## Checks

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verify.ps1   # backend tests, frontend tests, build
```

## Documentation

Start with [docs/PROJECT_BLUEPRINT.md](docs/PROJECT_BLUEPRINT.md), then the setup guides:
[Firebase](docs/FIREBASE_SETUP.md) · [Cloudinary](docs/CLOUDINARY_SETUP.md) · [Contact AI & email](docs/CONTACT_AUTOMATION.md) ·
[Admin security](docs/ADMIN_SECURITY.md) · [Deployment](docs/IMPLEMENTATION_ROADMAP.md#phase-10--deployment).
