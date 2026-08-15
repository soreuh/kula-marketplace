# Supabase auth email templates (branded)

These are pasted into **Supabase Dashboard → Authentication → Emails →
Templates** — they are NOT sent by the app's code. They live in the repo so
the design is versioned and a new owner can re-paste them into a fresh
Supabase project (HANDOVER.md Part 3 territory). Design mirrors the app's
transactional emails (`lib/email.ts` shell — globals.css palette, system
fonts, no images); if the brand shell ever changes, update these by hand.

| file | dashboard template | suggested subject | when it sends |
|---|---|---|---|
| `reset-password.html` | Reset password | reset your kula password 🌿 | LIVE TODAY — the flow already sends via the custom Resend SMTP; pasting this just brands it |
| `confirm-signup.html` | Confirm sign up | confirm your kula email 🌿 | once email confirmations are turned back ON (go-live checklist) |
| `change-email.html` | Change email address | confirm your new kula email 🌿 | when a user changes their login email |

Not customized on purpose: **Magic link** and **Invite user** (kula uses
password auth and open signup — those templates never send), and
**Reauthentication** (feature not enabled). If any of those are ever turned
on, copy the shell from one of these files.

Paste procedure (per template): open the template in the dashboard, replace
the entire message body with the file's HTML (the comment header can stay —
it's an HTML comment and never renders), set the subject line, Save. Send
yourself a password-reset from /login to verify the first one end-to-end.

Reminder from the go-live checklist: when confirmations go ON, raise the
auth rate limits (Auth → Rate Limits) at the same time — signup + confirm
emails count against the same caps, and auth mail rides her Resend quota.
