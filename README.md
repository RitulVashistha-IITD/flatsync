# 🏠 FlatSync

**A real-time coordination app for people who share a flat.**

🔗 **Live app:** [https://flatsync.vercel.app/]

FlatSync replaces the endless "does anyone need anything?" and "who's home for dinner?" messages with shared state that's just _there_ when you need it. Built for my own flat of five, used by real flatmates.

---

## The problem

Sharing a flat means constant small coordination that WhatsApp handles badly:

- Someone's placing a quick-commerce order and has to ask everyone, one by one, if they need anything.
- The person dealing with the cook has to go door to door figuring out who's eating.
- WhatsApp messages might get lost in the midst of other texts.

Both are the same pattern: **one person physically polling everyone.** FlatSync turns that into shared, live state anyone can read at a glance.

## Features

- **🧺 Shared order list** — anyone adds what's needed, tagged _personal_ or _common_. When someone places an order they mark items done, and the list updates for everyone instantly.
- **🍽️ Meal calendar** — three meals a day; you're assumed in by default and only tap when you're _out_ (with an optional preference like "no onions"). Whoever's handling the cook opens it to a live head-count instead of asking around.
- **Live everywhere** — every change syncs to all flatmates' phones in ~1 second, no refresh.
- **Zero-friction join** — one person creates a household, everyone else joins with a code. No passwords, no signup.
- **Installable PWA** — add it to your home screen; opens full-screen like a native app.

## Tech stack

- **Frontend:** Angular (standalone components), TypeScript, mobile-first CSS, PWA
- **Backend:** Supabase — PostgreSQL, Realtime (WebSockets), Row-Level Security
- **Hosting:** Vercel (auto-deploy on push)

## Engineering highlights

- **Real-time shared state** across many clients via Supabase Realtime (Postgres change events over WebSockets), with subscriptions scoped per-household.
- **Absence-as-default data model** — the meal calendar stores a row only when someone opts out, so the common case writes nothing and the head-count is derived. Simpler data, less writing, lazy-friendly UX.
- **Reliable deletes** — enabled `REPLICA IDENTITY FULL` so Postgres broadcasts the old row on delete, making deletions sync live (a non-obvious Realtime gotcha).
- **Tombstone pattern** — deleting a household writes a small record first, so other members can be told _who_ deleted it even though the data is already gone. Handled both live and on next load, covering clients that were offline during the event.
- **Deliberate auth tradeoff** — device-based identity with a shared join code, chosen for a trusted household. RLS is enabled with a documented hardening path (Supabase Auth scoped to `auth.uid()`) for a public deployment.
- **Component architecture** — reusable, standalone components with data flowing down via `@Input` and events up via `@Output`; a generic feature-card makes adding new features trivial.

## Run locally

```bash
git clone https://github.com/RitulVashistha-IITD/flatsync.git
cd flatsync
npm install
# add your Supabase URL + anon key in src/environment.ts
ng serve
```

Open `http://localhost:4200`.

## Roadmap

- Activity feed (see what changed while you were away)
- Expense splitting for common orders
- Per-meal cutoff times
