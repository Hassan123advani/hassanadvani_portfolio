# AI Contact & Email Automation

One contact system (the existing form and `messages` collection, upgraded), not a second one.

```
Visitor form ──POST /api/public/contact──► validate · honeypot · timing · rate limits · spam score
                                              │
                                              ▼
                              Firestore messages/{id}  (conversationId, status, ai, delivery, errors)
                                              │  onInquiryCreated (Cloud Function trigger)
                                              ▼            (locally: runs in the background)
                1. AI draft  ── Claude, verified facts only, JSON output, server audit
                2. Visitor auto-reply ── Resend, audited AI text or safe template, fixed subject
                3. Owner notification ── Resend → hassanadvani08@gmail.com (Reply-To = visitor)
                                              │
                    failures ─► retryInquiries (every 10 min, backoff, idempotency keys)
```

## What each party receives
**Hassan (always, unless spam):** visitor name, email, subject, original message, the AI-generated
response, the AI's decision/category/internal note, whether the visitor got an automatic reply,
submission date and time (Pakistan time) and the conversation ID. Subject is prefixed
`[Portfolio] (needs you)` when the AI couldn't fully answer or the visitor email didn't go out.
Press **Reply** in Gmail to answer the visitor directly.

**Visitor (only from a verified domain):** subject `Thanks for getting in touch - Muhammad Hassan Advani`,
with either
- the **AI answer**, when the model fully answered from verified facts *and* the server audit passed, or
- a **fixed acknowledgement** ("Hassan will read it personally and get back to you"), for uncertain
  questions, injection/spam attempts, audit failures, AI outages or a missing profile.

Every auto-reply discloses that it is automatic, sets Reply-To to Hassan, and carries
`Auto-Submitted: auto-replied` so autoresponders don't loop. It never quotes the visitor's text.

## How the AI stays truthful and safe
| Risk | Control |
| --- | --- |
| Inventing qualifications/experience/projects | Facts are built server-side from the **published** profile, projects and certificates in Firestore (`services/knowledge.js`). The prompt allows only those facts; pricing/timelines are explicitly "not published". No profile → no AI call. |
| Uncertain questions | Model must set `decision: "needs_human"`; the visitor is told Hassan will reply personally. |
| Prompt injection | Visitor text is sent as JSON inside `<visitor_message>`, declared untrusted, never in the system prompt. Injection or spam attempts → fixed template, never model text. |
| Malicious output | Structured JSON output (schema-validated), then a server audit: length limits, **only links from the verified facts**, no email address except Hassan's, no markup. Any problem → template. |
| Browser-supplied AI instructions | The API accepts only name, email, subject, message, project type. Extra fields (`prompt`, `model`, `ai`…) are dropped (tested). |
| Using the form to spam third parties | Fixed subject, no echo of visitor text, 1 auto-reply per address per 24 h, global daily cap (50), spam heuristics, honeypot + timing trap, rate limits (5/15 min per IP in memory, 5/h per IP and 3/h per address in Firestore). |

Model: `claude-opus-5-5` at `low` effort (`AI_MODEL`, `AI_EFFORT`). Roughly 3-4k input and a few hundred
output tokens per message — about **$0.02 per inquiry**. Server-side refusal fallback
(`fallbacks: "default"`) is enabled so a safety decline is re-tried on Anthropic's recommended model.
`AI_MODEL=claude-haiku-5-5` is ~40x cheaper if you prefer.

## Delivery, retries, no duplicates
- Each step (AI, visitor, owner) has its own status: `pending | sent | failed | skipped` (+ `reason`, `lastError`, `attempts`, `resendId`, `sentAt`).
- A Firestore lease (`lockedUntil`) prevents two workers processing the same inquiry.
- Every send uses a Resend **Idempotency-Key** (`visitor-<id>`, `owner-<id>`), so a retry can't create a duplicate.
- Transient failures (network, 429, 5xx, AI overload) → `pipelineState: retry` with 2/4/8-minute backoff, max 4 attempts, within 20 h.
- Permanent failures (4xx such as invalid address or unverified domain) are not retried and are shown in the admin.
- If the AI is down, emails wait for the AI retry; after the last attempt the template is sent.
- Admin **Retry failed steps** re-runs only failed steps; successful emails are never re-sent.
- Errors are logged on the inquiry (`errors[]`, last 20) and in Cloud Functions logs.

## Firestore record (`messages/{id}`)
`conversationId, name, email, subject, message, projectType, status (new|read|replied|resolved|archived|spam), spam, starred, ipHash, userAgent, createdAt, updatedAt, ai{status, decision, category, reply, reason, problems[], model, generatedAt, error}, delivery{visitor{…}, owner{…}}, pipelineState, attempts, lockedUntil, nextAttemptAt, autoReplyDay, errors[]`.
Rules: readable only by admins with the `messages` permission; no client can write (`firestore.rules`).

## Admin → Contact inquiries
Tabs (Inbox, Needs attention, Resolved, Starred, Archived, Spam, All), full-text search (name, email,
text, conversation ID, AI response), original message, AI response with decision and safety-check
results, delivery status for both emails, error log, and actions: **Reply in Gmail** (opens a Gmail
compose window), email app, copy AI response, resolve/reopen, mark unread, retry failed steps, star,
archive, spam, delete.

## Setup
### 1. Credentials (local)
`backend/.env.local`:
```env
RESEND_API_KEY=re_...           # already set
ANTHROPIC_API_KEY=sk-ant-...    # needed for AI replies
RESEND_FROM=Hassan Advani <hello@yourdomain.com>   # after step 2
```
### 2. Verify a sending domain — **required for visitor auto-replies**
Without one, Resend only delivers to the account owner, so visitors can't be emailed. You need a domain you
control (not `*.vercel.app`).
```powershell
cd backend
npm run resend-domain -- add yourdomain.com      # prints SPF/DKIM (and MX) DNS records
# add the records at your registrar, wait a few minutes, then:
npm run resend-domain -- verify yourdomain.com
```
Then set `RESEND_FROM` to an address on that domain and run `npm run check-env` (all email rows ✔).
Adding the domain in the Resend dashboard (Domains → Add) works just as well.

### 3. Deploy to Firebase Cloud Functions (Blaze plan required)
Secrets go to **Google Secret Manager**, never into files:
```powershell
npm install -g firebase-tools; firebase login
cd D:\portfolio
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set CLOUDINARY_API_SECRET
firebase functions:secrets:set IP_HASH_SALT
```
Non-secret config goes in `backend/.env.portfolio-datbase` (read by the CLI at deploy; git-ignored):
```env
RESEND_FROM=Hassan Advani <hello@yourdomain.com>
CONTACT_NOTIFY_TO=hassanadvani08@gmail.com
SITE_URL=https://hassanadvani-portfolio.vercel.app
CORS_ORIGINS=https://hassanadvani-portfolio.vercel.app
TRUST_PROXY=1
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=568963161659882
```
```powershell
firebase deploy --only functions,firestore:rules
```
This deploys `api` (the whole Express API), `onInquiryCreated` and `retryInquiries` to `asia-south1`.
Firebase Admin uses the function's own identity there — no service-account key is uploaded. Set the
frontend's `VITE_API_URL` to the `api` function URL printed by the deploy.

`backend/.env.local` is excluded from deploys on purpose: secrets reach production only via Secret Manager.

## Testing
```powershell
cd backend
npm test                 # 40 tests incl. 17 for this pipeline (mocked AI + Resend, in-memory Firestore)
npm run test-email       # one REAL owner notification via Resend
npm run resend-domain -- status
```
End-to-end (real Firestore + Claude + Resend), once credentials and the domain exist:
start the API, submit the form on `/contact` with an address you own, then check
Admin → Contact inquiries, your visitor inbox, and hassanadvani08@gmail.com.
