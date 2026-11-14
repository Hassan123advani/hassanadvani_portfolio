# Writing (developer blog)

Public: `/writing` (home) and `/writing/<slug>` (article). Old `/blog` links redirect.
Admin: `<ADMIN_PATH>/writing` — dashboard, analytics, article list, subscribers. Needs the `blog` permission;
the subscriber list (email addresses) needs `messages`.

## Publishing an article
1. Admin → **Writing** → **New article** (or open one of the starter drafts).
2. Write with the toolbar: headings, bold/italic, lists, links, quotes, code blocks (pick a language in the bar
   that appears), tables, images (uploaded to Cloudinary) and YouTube embeds. Undo/redo is in the toolbar.
3. Fill in the sidebar: category (pick or type a new one), tags, cover image + alt text, SEO title/description/keywords.
4. **Preview** shows the real article layout. Unsaved edits are backed up in this browser every few seconds.
5. **Save draft**, **Publish**, or set a future date and press **Schedule**. **Unpublish** turns it back into a draft.
6. Star an article (list or editor) to make it the featured story on `/writing`.

## Data (Firestore)
| Collection | Written by | Read by |
|---|---|---|
| `posts` | admin API only | public API (published + date passed); admins with `blog` |
| `newsletter_subscribers` | `POST /api/public/newsletter` (validated, de-duplicated by email hash, rate limited) | admins with `messages` |
| `article_analytics` | `POST /api/public/posts/:slug/view` | admins with `blog` |
| `postViews` | view endpoint (short-lived de-duplication markers) | nobody |

`posts.views` is server-managed: the admin editor can't set it and saving an article keeps it.
Views are page views counted once per visitor (hashed IP + user agent) per article per 6 hours — not unique visitors.

## Setup still to do
- Firestore rules: deploy changes with `firebase deploy --only firestore:rules` (use the project owner account).
- Optional: add a Firestore TTL policy on `postViews.expiresAt` so old de-duplication markers are deleted automatically.
- Newsletter emails are not sent automatically. Sign-ups are stored; export them as CSV from the dashboard.
  Automated sending needs a verified Resend domain (see `docs/CONTACT_AUTOMATION.md`).
- Starter drafts: `npm run seed-articles` in `backend/` (create-only, safe to re-run).

## Article covers
The starter article covers are designed in `scripts/covers/cover.html` (one HTML page, `?v=journey|c|firebase|cloudinary|ai`).
Open it over HTTP at 1600×840, screenshot it, and upload the PNG to Cloudinary `portfolio/posts/<slug>-cover`
(with `invalidate: true` when replacing, so the CDN drops old resized copies). Uploaded covers are listed in the Media library.
