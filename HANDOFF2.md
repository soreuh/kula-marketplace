# HANDOFF 2 — your own kula workshop

*The light version. You're not taking over the servers (Aleks keeps being the
engineer) — you're getting your own workshop where you and Replit's AI can
redesign kula freely, wired so nothing you do can break the live site. Every
step is "go to this website, click this button." ~20 minutes, then Aleks does
two technical minutes at the end.*

**How it's wired:** the code lives in Aleks's GitHub in two copies — `main`
(the live site) and `her-workspace` (yours). Your Replit connects to
`her-workspace` only. Play as hard as you like; the live site only changes
when Aleks reviews your branch and ships it.

---

## Part 1 — create your GitHub account (~5 min)

GitHub stores the code. You'll rarely open it after today.

1. Go to **github.com** → **Sign up**.
2. Use your everyday email. Pick a username — it's semi-public, so something
   like your name or `yourname-kula` is perfect.
3. Enter the code they email you. Choose the **Free** plan.

📱 **Text Aleks #1:** the *username* and the *email* you used. He needs the
username to grant you access to the code, and the email is where the invite
will arrive.

---

## Part 2 — accept Aleks's invite (~1 min)

Once Aleks adds you, GitHub emails you: *"soreuh invited you to collaborate on
soreuh/kula-marketplace."*

1. Open that email → **Accept invitation** (it also appears at
   github.com/notifications if the email hides).
2. That's GitHub done. You now have access to the code.

---

## Part 3 — create your Replit account (~2 min)

Replit is where you'll actually work.

1. Go to **replit.com** → Sign up → choose **Continue with GitHub** and
   authorize it. (One login for both services — no new password.)

📱 **Text Aleks #2:** your Replit username.

---

## Part 4 — import the code into Replit (~5 min)

1. In Replit: **Create App** (the + / Create button) → **Import from GitHub**.
2. If it asks to connect GitHub, authorize it — when it asks *which*
   repositories Replit may access, make sure **soreuh/kula-marketplace** is
   included (or choose "all repositories").
3. Pick **soreuh/kula-marketplace** → **Import**.
4. If it asks how to run the app, you can skip it or type: `npm run dev`.
5. Then **stop here** — don't run anything yet. The app won't work until
   Aleks adds the keys in the next part, and that's expected.

---

## Part 5 — invite Aleks as an editor (~1 min)

1. In your new Repl, click the **Invite** (share) button — top right.
2. Enter Aleks's Replit username (ask him) → invite as an **editor** → send.

📱 **Text Aleks #3:** "sent the invite." He'll then hop in and do the
technical two minutes: switch your workspace onto the `her-workspace` branch,
add the six secret keys, and press Run for the first time. When he's done,
the preview shows kula, live and working, inside your workspace.

---

## Part 6 — how you work from now on

- Open your Repl → press **Run** → the site appears in the Webview panel.
  It's connected to the real test database, so real listings and accounts
  show up.
- Start your first AI-agent conversation with: **"read replit.md before doing
  anything."** That file teaches the agent the house rules.
- Then just describe what you want: "make the hero warmer," "redesign the
  listing cards," "the dashboard feels cramped on mobile." Preview every
  change instantly.
- When you love something, tell Aleks — he reviews your branch and ships it
  to the live site.

**The three don'ts** (the AI knows these too, from replit.md):

1. Don't touch anything backend — payments, database, accounts, downloads.
   Looks: yes. Mechanics: no. If the AI says a change needs backend edits,
   stop and tell Aleks.
2. Don't use Replit's **Deploy** button — the real site publishes through a
   different pipe.
3. Don't open or share the **Secrets** panel — that's where the keys live.

If the workspace ever feels broken beyond repair, tell Aleks — restoring it
to a clean copy takes him one command.

---

*your workshop. your rules (well, three of his). go make it beautiful. 🌿*
