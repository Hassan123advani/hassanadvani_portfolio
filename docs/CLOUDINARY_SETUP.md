# Cloudinary Setup

## Credentials — all go in `backend/.env.local` only
```env
CLOUDINARY_CLOUD_NAME=        # ← needed (Cloudinary console → Dashboard → "Cloud name")
CLOUDINARY_API_KEY=568963161659882
CLOUDINARY_API_SECRET=        # ← needed: paste it locally; never commit, never put in frontend/
CLOUDINARY_FOLDER=portfolio
```
> The API secret was **not** present in this working environment, so it has not been written anywhere.
> Paste it into `backend/.env.local` yourself. If it was ever shared in a chat or committed, rotate it in
> Cloudinary → Settings → API Keys.

Restart the backend; `npm run check-env` should show ✔ Cloudinary.

## How uploads work
1. Admin picks a file → `POST /api/admin/media/sign {folder, resourceType}` (permission-checked).
2. Server returns a signature for `{folder, timestamp}` made with the secret.
3. Browser uploads directly to `https://api.cloudinary.com/v1_1/<cloud>/<type>/upload`.
4. Browser calls `POST /api/admin/media {publicId}`; the server **fetches the asset from Cloudinary** to
   confirm it exists inside `portfolio/…` and stores its real metadata in `media`.

Folders: `portfolio/posts`, `projects`, `certificates`, `profile`, `resume`, `video`, `media`.
Limits enforced in the browser: images 10 MB, video 100 MB, PDF 10 MB.
PDFs (résumé) upload as `raw` so they download reliably regardless of the account's PDF-delivery setting.

## Delivery
Images are requested with `f_auto,q_auto` and sized transforms (`lib/format.js → cdn()`), so the browser gets WebP/AVIF at the right size.

## Deleting
Media library → file → Delete removes it from Cloudinary (`invalidate: true`) and from Firestore.
Content still referencing the URL will show a broken image — the confirm dialog warns about this.

## Optional hardening
Cloudinary → Settings → Security: restrict *Allowed fetch domains* and enable *Strict transformations*.
