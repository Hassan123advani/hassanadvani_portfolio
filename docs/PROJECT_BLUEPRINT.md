# Project Blueprint

## Goal
Replace the static HTML portfolio of **Muhammad Hassan Advani** (BSCS student, GU Tech, Karachi) with a
premium full-stack portfolio whose content is managed from a hidden, secure admin panel.

## Principles
- **Real content only.** Everything shown comes from the original site, the GitHub profile README or the
  owner's own certificates. Sections without real content (experience, testimonials, résumé, video,
  blog) show honest empty states — never invented data.
- **Works before it's configured.** The public site renders from bundled real content when the API is
  offline; each integration lights up as its credentials are added.
- **Security on the server.** Hiding `/admin` is not security. Every admin action is authorised by the
  backend (Firebase ID token → `admins/{uid}` record → role → permission). Firestore rules deny all client writes.
- **No secrets in the browser.** Cloudinary secret, Firebase service account, Resend and Anthropic API keys live only in `backend/.env.local` locally and in Firebase Secret Manager when deployed.

## Repository layout
```
D:\portfolio
├─ frontend/          React app (public site + lazy-loaded admin)
│  ├─ public/assets/  profile photo, 9 certificate images (copied from the original site)
│  ├─ public/demos/   the 3 original project apps (FocusFlow, BudgetWise, CoursePilot)
│  └─ src/
│     ├─ content/portfolio.json   real content: fallback + one-click CMS import
│     ├─ pages/ components/ styles/ lib/ hooks/ context/
│     └─ admin/       dashboard, CMS editors, admin management
├─ backend/           Express API
│  ├─ src/config      env + permissions
│  ├─ src/routes      public, CRUD factory, admins, media, settings, sitemap
│  ├─ src/services    Firebase context, Cloudinary, mailer, GitHub, activity log
│  ├─ scripts/        create-super-admin, check-env
│  └─ test/           API tests with in-memory Firestore/Auth fakes
├─ docs/              this documentation
├─ scripts/           setup.ps1 / setup.sh / verify.ps1
├─ firestore.rules, firestore.indexes.json, firebase.json, .firebaserc
└─ _old_backup/       original site (index.html, style.css, script.js, README), assets, demos
```

## Where to read next
| Topic | File |
| --- | --- |
| Features | [WEBSITE_FEATURES.md](WEBSITE_FEATURES.md) |
| How it fits together | [APPLICATION_ARCHITECTURE.md](APPLICATION_ARCHITECTURE.md) |
| Data model | [DATABASE_DESIGN.md](DATABASE_DESIGN.md) |
| Setup | [FIREBASE_SETUP.md](FIREBASE_SETUP.md), [CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md), [GMAIL_INTEGRATION.md](GMAIL_INTEGRATION.md) (Resend contact email) |
| Contact AI & email automation | [CONTACT_AUTOMATION.md](CONTACT_AUTOMATION.md) |
| Security | [ADMIN_SECURITY.md](ADMIN_SECURITY.md) |
| Intro video | [VIDEO_PRODUCTION_PLAN.md](VIDEO_PRODUCTION_PLAN.md) |
| Plan, status, todo | [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md), [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md), [TODO.md](TODO.md) |
