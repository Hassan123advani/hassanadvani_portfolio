# Website Features

## Public site
| Route | What it does |
| --- | --- |
| `/` | Hero (photo, live “console” card), marquee, featured projects, about + stats, skills meters, education timeline, intro video, certificates strip, live GitHub repos, latest articles, testimonials, services teaser |
| `/about` | Bio, résumé download (or “request résumé” when none uploaded), education, experience (honest empty state), skills, learning now, degree subjects |
| `/projects` | All published projects, category filter, live miniature previews of bundled demos |
| `/projects/:slug` | Case study (rich text), tech stack, live demo / code links, screenshot gallery with lightbox, prev/next |
| `/blog` | Published articles only; search, category filter, tag cloud, featured article, pagination (URL-driven, shareable) |
| `/blog/:slug` | Article with cover, captions, code blocks, embedded YouTube videos, gallery, tags, share buttons (X, LinkedIn, WhatsApp, copy, native share), related articles |
| `/certificates` | Featured professional certificate with its 7 courses + gallery of 8 course certificates, keyboard-accessible lightbox |
| `/github` | Live public repos for `Hassan123advani`, language filter, sort; server-cached, with direct-to-GitHub browser fallback |
| `/services` | “Hire me”: services, deliverables, 4-step process; each service pre-fills the contact form |
| `/contact` | Validated form (name, email, subject, optional project type, message) → Firestore → AI answer from verified facts → automatic reply to the visitor (needs a verified domain) + notification to your Gmail with the AI response (visitor as Reply-To) |
| `*` | Custom terminal-style 404 |

**Cross-cutting:** dark/light theme (saved, no flash), responsive 390px → desktop, reveal-on-scroll and
page transitions (respecting `prefers-reduced-motion`), skeleton loading, empty and error states with retry,
per-page SEO + Open Graph tags, sitemap, skip link, focus styles, no admin links anywhere.

## Admin panel (`/admin`, configurable)
- Firebase email/password sign-in, session-scoped, password reset; non-admins are rejected and signed out.
- **Dashboard:** counts (live/draft/scheduled), unread messages, recent messages and activity,
  integration warnings, one-click **Import starter content** for an empty CMS.
- **Blog CMS:** TipTap editor (headings, bold/italic/underline/strike, lists, quotes, links, inline & block
  code, dividers, images by upload/library/URL, multiple YouTube embeds anywhere, captions), cover & OG
  images, gallery, category, tags, author, slug, excerpt, SEO title/description with search-result preview,
  featured flag, draft / publish / schedule / unpublish, preview, delete, unsaved-changes warning, word count & reading time.
- **Projects CMS:** same publishing model; summary, rich description, cover, screenshots, tech stack,
  GitHub & live links, category, level, sort order, featured.
- **Certificates, testimonials, categories & tags** — table + modal editors.
- **Media library:** signed Cloudinary uploads (images, video, PDF), folder/type filters, alt/title/caption, copy URL, delete (also removes from Cloudinary).
- **Contact inquiries:** inbox / needs attention / resolved / starred / archived / spam tabs, search, original message, AI response with safety-check result, delivery status of both emails, error log, reply in Gmail, copy AI response, resolve, retry failed steps, star, archive, spam, delete.
- **Profile & résumé:** every profile field, nested lists (skills groups, education, experience, services, learning, subjects), résumé PDF, intro video (YouTube or uploaded), chapters.
- **SEO** and **Website settings** (announcement bar, toggle blog / GitHub / testimonials / contact form, posts per page).
- **Admin accounts** (super admin): invite, edit name/role/permissions, activate/deactivate, send password reset, delete; last super admin protected.
- **Activity log** of every change with actor filter and search.
