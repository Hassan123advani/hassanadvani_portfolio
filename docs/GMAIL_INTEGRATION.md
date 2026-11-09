# Email — Resend → your Gmail inbox

All email is sent through **[Resend](https://resend.com)**. No Gmail SMTP, OAuth or app password is used;
Gmail is simply where you read notifications and reply.

| Email | Recipient | Needs a verified domain? |
| --- | --- | --- |
| New-inquiry notification (details, original message, AI response, time) | hassanadvani08@gmail.com, Reply-To = visitor | **No**, if the Resend account is registered with hassanadvani08@gmail.com |
| Automatic reply (audited AI answer or acknowledgement) | the visitor | **Yes** |
| Admin invites / password resets | admins | No (Firebase Authentication sends these) |

Full pipeline, safety controls and deployment: **[CONTACT_AUTOMATION.md](CONTACT_AUTOMATION.md)**.

## Setup
1. Resend account registered with **hassanadvani08@gmail.com**.
2. Resend → API Keys → create a key. Use **Sending access** for production; a full-access key is only
   needed to manage domains with `npm run resend-domain`.
3. `backend/.env.local` (git-ignored, never deployed):
   ```env
   RESEND_API_KEY=re_...
   RESEND_FROM=Portfolio Contact <onboarding@resend.dev>   # until your domain is verified
   CONTACT_NOTIFY_TO=hassanadvani08@gmail.com
   ```
   In Cloud Functions the key comes from Secret Manager: `firebase functions:secrets:set RESEND_API_KEY`.
4. `cd backend; npm run check-env; npm run test-email`.

## Is a verified sending domain required?
- **Owner notifications:** no. `onboarding@resend.dev` delivers to the address that owns the Resend
  account — confirmed working for hassanadvani08@gmail.com.
- **Visitor auto-replies:** **yes.** Resend's shared sender cannot deliver to anyone else. Until a domain
  is verified, the system records the visitor step as *skipped — No verified Resend sending domain* and
  still notifies you. Your account currently has **no domains**. Add one with
  `npm run resend-domain -- add yourdomain.com` (prints the DNS records), add the records at your
  registrar, `npm run resend-domain -- verify yourdomain.com`, then set
  `RESEND_FROM=Hassan Advani <hello@yourdomain.com>`. A `*.vercel.app` address cannot be verified.

## Security
- The key is read only on the server and used only in the `Authorization` header to `api.resend.com`;
  never logged, returned to the browser, bundled into the frontend, or committed.
- If a key is ever shared (for example in a chat), delete it in Resend → API Keys and create a new one.
- Visitor input is HTML-escaped; line breaks are stripped from subjects and Reply-To.
- Idempotency keys (`visitor-<id>`, `owner-<id>`) prevent duplicate sends on retry.

## Troubleshooting
| Error / symptom | Fix |
| --- | --- |
| `401 API key is invalid` | Wrong or revoked key. |
| `403 … only send testing emails to your own email address` | Verify a domain and set `RESEND_FROM` on it. |
| `403 … domain is not verified` | DNS records not detected yet — `npm run resend-domain -- verify <domain>`. |
| Inquiry shows *visitor: skipped* | Expected without a verified domain, or anti-abuse limit reached (reason shown). |
| Notification lands in Spam | Mark *Not spam*; verify a domain for SPF/DKIM alignment. |
