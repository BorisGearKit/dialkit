---
name: dialkit-setup
description: Set up outbound AI voice calling on this machine, end to end. Use when someone says "set up phone calls", "get the voice agent working", "install dialkit", mentions calling businesses with an AI agent, or wants an AI to place a phone call. Interviews them about what the calls are for, provisions Retell, writes a local calling harness into a folder they own, and walks them through a first test call to their own phone.
---

# DialKit setup

You are setting up real outbound phone calls for the person in front of you. By the end of this
run they will have: a working calling stack, a small harness of scripts in a folder they own, a
scenarios file that describes their calls, and a completed test call to their own phone with the
transcript on screen. Everything runs from their machine; nothing is hosted anywhere.

Work in this order. Do not skip the interview, and never place a call to anyone but the user
until the test call has succeeded and they have said, in this session, who else may be called.

## 0 · The one-breath introduction

> DialKit puts an AI voice agent on the phone: you describe the call's objective in a sentence,
> a script places the call, and the transcript plus extracted answers come back as files you own.
> First we'll spend five minutes on what your calls are for, then set up the stack, then call
> **your own phone** as the first test. Ready?

One breath, then the interview. Never lecture about architecture.

## 1 · The interview

Ask these one at a time — recognition over recall, short answers expected. Write answers into
the profile file (§3) as you go.

1. **What will a call accomplish?** ("Verify a restaurant's hours and menu links", "confirm a
   business's service area", "ask a supplier for a ship date"…) Get 1–3 concrete call types with
   the exact question each call asks.
2. **Who gets called?** Businesses or consumers? (This gates compliance — see §2. Calling
   businesses to ask legitimate questions is the safe lane. Cold consumer calling is out of
   scope for this kit; say so plainly if that's the ask.)
3. **What comes back?** Which fields make the call a success — e.g. `{hours, menu_url,
   takes_reservations}`. These become the extraction schema.
4. **Volume and cadence?** A handful of calls a day while testing, or batches? (The harness is
   built for handfuls; batching comes after the first ten successful calls, not before.)
5. **Do you already have a Retell account / API key / phone number?** Branch §4 accordingly.
6. **Which folder should the harness live in?** Default `~/dialkit` — their folder, their files.

## 2 · Guardrails — non-negotiable, and say them out loud

State these during setup so the user adopts them as policy, and encode them in the agent prompt:

- **The agent discloses it's an AI assistant** in its opening sentence, every call, and names
  who it's calling on behalf of. No pretending to be human, ever.
- **Business-to-business questions only** by default: calls to businesses, during the callee's
  business hours, asking questions the business answers all day anyway. No marketing pitches,
  no cold consumer calls, no calls to numbers on any do-not-call list. If the user's use case
  drifts toward consumer outreach or selling, stop and tell them that needs legal review
  (TCPA/robocall rules) before any call is placed — this kit doesn't go there.
- **If asked to stop, the call ends politely and the number goes on a local no-call list**
  (`no-call.md` in the harness folder). Check it before every call.
- **Calls may be recorded by the platform** — the agent's prompt says so when relevant
  ("this call may be recorded"), which keeps two-party-consent states boring.
- **No caller-ID games.** The from-number is the user's provisioned number, nothing else.
- **Keys never live in the repo or the harness folder.** They go in `~/.config/dialkit/env`,
  chmod 600, loaded by the scripts at runtime.
- **Costs stay visible.** Voice minutes cost real money; the check script prints duration per
  call, and setup states the per-minute ballpark from Retell's current pricing page.

## 3 · The files the user owns

Create the harness folder from the interview (default `~/dialkit/`):

```
dialkit/
  scenarios.md    # each call type: name, who it calls, the objective (one question at a time),
                  # the extraction fields — dated facts, edited by the user
  no-call.md      # numbers that asked not to be called again — checked before every call
  calls/          # one markdown file per completed call: transcript, summary, extracted fields
  place-call.mjs  # copied from this skill's templates/
  check-call.mjs  # copied from this skill's templates/
  create-agent.mjs# copied from this skill's templates/ (run once during setup)
```

Same memory discipline as any good profile: facts carry dates, the user owns the files, ask
before writing anything beyond what the run produced, never store secrets or payment data here.

## 4 · Provisioning — walk it, don't narrate it

Retell is the calling platform (retellai.com — dashboard signup, card required for numbers).
API surfaces drift: **if any request below 404s or the shape looks wrong, check
docs.retellai.com for the current endpoint before improvising.**

1. **Account + key:** have them sign up at retellai.com and create an API key in the dashboard.
   You never see the key on screen if they prefer — have them run:
   `mkdir -p ~/.config/dialkit && printf 'RETELL_API_KEY=<paste>\n' > ~/.config/dialkit/env && chmod 600 ~/.config/dialkit/env`
2. **Phone number:** buy one in the dashboard (or via API) — a local US number in their area.
   Append `RETELL_FROM_NUMBER=+1...` to the env file.
3. **Agent:** run `node create-agent.mjs` from the harness folder. It creates a Retell LLM with
   the pacing prompt below and an agent wired to it, then prints the agent id — append it as
   `RETELL_AGENT_ID=...`. The prompt template lives in the script; its two hard-won rules:
   - **One question at a time.** A compound objective ("confirm X and ask Y") makes the agent
     say both at once and sound overloaded. Objectives are written as sequential steps: "First
     ask X. Wait for a clear answer. Only then ask Y." Enforce the same pacing as a standing
     rule in the agent's general prompt, not just per-scenario.
   - **Disclosure in the opening line** — identity, on-whose-behalf, and purpose in one
     natural sentence.
4. **No webhooks, by design.** The harness polls `get-call` for status/transcript/analysis, so
   nothing on the user's machine is exposed to the internet. If they later want push updates,
   that's a hosted concern for another day.

## 5 · The first call — always to the user's own phone

1. Write a test scenario into `scenarios.md`: the agent calls the user, discloses itself,
   asks one easy question ("what city are you in today?"), thanks them, hangs up.
2. `node place-call.mjs --to <their number> --scenario test` — read the objective back to them
   before running it.
3. Have them answer the phone and talk to their own agent. This moment is the product.
4. `node check-call.mjs <call_id>` until status is final — show transcript + duration + cost,
   and write `calls/<date>-test.md`.
5. Debrief: did it disclose properly? One question at a time? Only after they're satisfied —
   and name who may be called next — move to a real scenario, one call at a time.

## 6 · What this skill never does

- Never places a call the user hasn't seen the objective for, and never to a new number class
  (test → business) without the user saying so in this session.
- Never batch-dials. Ten good calls one at a time earn the batching conversation.
- Never touches consumer marketing, spoofing, or scraping phone lists.
- Never stores keys anywhere but `~/.config/dialkit/env`, and never prints a pasted key back
  to the screen.
- Never claims the transcript is perfect — extraction fields carry the transcript line they
  came from, so a human can check the source in one glance.
