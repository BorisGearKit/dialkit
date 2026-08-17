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

## Requirements

- **A [Retell](https://retellai.com) account** — the voice-agent platform DialKit runs on.
  This is the same service behind the ShelfKit supplier-call demos this kit was extracted
  from, and a deliberate recommendation: batteries-included telephony (numbers, voices,
  transcription, post-call analysis) behind one API. You'll need a card on file — a phone
  number is a few dollars a month and voice minutes are cents (current rates on
  [their pricing page](https://retellai.com/pricing)); the harness prints each call's actual
  cost. The setup skill walks the signup, API key, number purchase, and agent creation — you
  don't need to have used Retell before.
- **Node 18+** (the harness scripts are dependency-free `.mjs` files).
- **Claude Code** (this is a Claude Code skill — the interview and installation run in your
  Claude session).

## The canonical first scenario

Call a local business, ask honestly whether someone handles their website/SEO/online
marketing, and — if they're happy to share — get that person's name and business contact.
Receptionists answer this question all day; the skill's worked example shows how to phrase it
one question at a time, with the purpose stated truthfully and "no" taken gracefully.

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

## License

[PolyForm Internal Use 1.0.0](LICENSE.md) — free to use **for your own business**, including
commercially: run it, modify it, put it to work on your operations. What it doesn't grant:
repackaging DialKit into a product or service you provide to others. If you want to build it
into something you sell, talk to me — boris@gearkit.ai.
