# Database Design (Cloud Firestore)

All timestamps are Firestore Timestamps (returned as ISO strings by the API).
`mediaRef` = `{ url, publicId, alt, caption, width?, height?, resourceType }`.
Writes happen only through the backend; see `firestore.rules` for read access.

| Collection | Doc ID | Key fields |
| --- | --- | --- |
| `posts` | auto | title, slug (unique), excerpt, content (sanitised HTML), coverImage, ogImage, gallery[mediaRef], category, tags[], author, seoTitle, seoDescription, featured, status `draft|published`, publishedAt, readingTime, createdAt/By, updatedAt/By |
| `projects` | auto | title, slug, summary, description (HTML), coverImage, images[], techStack[], githubUrl, liveUrl, category, level, featured, status, order, publishedAt, seo* |
| `certificates` | auto | title, issuer, platform, kind `professional|course|other`, issuedOn, description, image, credentialUrl, courses[], order, status |
| `testimonials` | auto | name, role, company, quote, avatar, link, order, status |
| `categories` | auto | name, slug, description, scope `post|project|both` |
| `tags` | auto | name, slug |
| `media` | auto | publicId, url, resourceType, format, bytes, width, height, duration, folder, alt, title, caption, createdAt/By |
| `messages` | auto | conversationId, name, email, subject, message, projectType, status `new|read|replied|resolved|archived|spam`, spam, starred, note, ipHash, userAgent, createdAt, updatedAt, ai{status, decision, category, reply, reason, problems, model}, delivery{visitor, owner}{status, attempts, resendId, sentAt, reason, lastError, permanent}, pipelineState, attempts, lockedUntil, nextAttemptAt, autoReplyDay, errors[] — see [CONTACT_AUTOMATION.md](CONTACT_AUTOMATION.md) |
| `settings` | `profile` / `site` / `seo` | see schemas in `backend/src/schemas.js` (`profileSchema`, `siteSchema`, `seoSchema`) |
| `admins` | Firebase **uid** | email, displayName, role `super_admin|admin`, permissions[], active, createdAt/By, updatedAt |
| `activityLogs` | auto | action (e.g. `posts.publish`), targetType, targetId, targetLabel, actorUid/Email/Name, meta, createdAt |

## Publishing model
- Visible to the public ⇔ `status == 'published'` **and** (`publishedAt` empty or `<= now`).
- Publishing with a future `publishedAt` = **scheduled**: invisible until that time, no cron needed.
- Unpublishing sets `status = 'draft'`.

## Permissions (`admins.permissions`)
`blog, projects, certificates, taxonomy, media, messages, testimonials, profile, seo, settings, activity`.
Super admins implicitly hold all of them plus admin management. Categories/tags are also *readable* by `blog`/`projects` editors (for suggestions).

## Indexes
Backend queries use single-field equality filters (automatic indexes). `firestore.indexes.json` adds
composite indexes for `posts(status, publishedAt desc)` and `projects(status, order)` for future direct queries.
