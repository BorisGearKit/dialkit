# DialKit — put an AI voice agent on the phone, in one sitting

A Claude Code skill that sets up outbound AI phone calls end to end: it interviews you about
what your calls are for, provisions the calling stack ([Retell](https://retellai.com)), writes
a small local harness into a folder you own, and walks you through your first test call — to
your own phone, always, before anyone else's.

```
/plugin marketplace add BorisGearKit/dialkit
/plugin install dialkit@dialkit
```

Then say: **"set up phone calls"** — and answer the questions.

## What you end up with

```
~/dialkit/
  scenarios.md     # your call types: who gets called, the one-question-at-a-time objective
  no-call.md       # numbers that asked not to be called — checked before every call
  calls/           # one markdown file per call: transcript, summary, duration, cost
  place-call.mjs   # node place-call.mjs --to +1555... --scenario verify-hours
  check-call.mjs   # node check-call.mjs <call_id> --watch
  create-agent.mjs # one-time: creates the agent with the pacing + disclosure prompt
```

No hosting, no webhooks, no exposed ports — the harness polls. Keys live in
`~/.config/dialkit/env` (chmod 600), never in the folder, never in git.

## The guardrails are the product

- The agent **says it's an AI** and who it's calling for, in the first sentence, every call.
- Built for **business-to-business questions** — the calls a business answers all day anyway.
  Cold consumer calling and marketing robocalls are out of scope, deliberately.
- "Don't call again" is honored **locally and permanently** (`no-call.md`).
- One question at a time — compound objectives make voice agents sound like robots reading forms.
- First call is always to **your own phone**. You meet your agent before anyone else does.

Built by [Boris Korsunsky](https://gearkit.ai) — the same calling infrastructure that runs the
[ShelfKit](https://shelfkit.ai) supplier-call demos, packaged so you can run it yourself.
