#!/usr/bin/env node
/**
 * One-time setup: create the Retell LLM + agent this harness uses, and print
 * the agent id to append to ~/.config/dialkit/env. Endpoints drift — if a
 * request 404s, check docs.retellai.com before editing.
 * Usage: node create-agent.mjs --behalf "Pendium" [--voice 11labs-Adrian]
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const RETELL_API = "https://api.retellai.com";

function die(msg) { console.error(`✗ ${msg}`); process.exit(1); }
function arg(name, dflt = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
}

const behalf = arg("behalf");
if (!behalf) die('Usage: node create-agent.mjs --behalf "Company Name"');
const voice = arg("voice", "11labs-Adrian");

const p = join(homedir(), ".config", "dialkit", "env");
if (!existsSync(p)) die(`Missing ${p}`);
const key = /RETELL_API_KEY=(.+)/.exec(readFileSync(p, "utf8"))?.[1]?.trim();
if (!key) die("RETELL_API_KEY missing from env file");

// The pacing + disclosure rules live HERE, as standing agent behavior — not
// only in per-call objectives. Hard-won: compound objectives make the agent
// ask two things in one breath and sound like a robot reading a form.
const generalPrompt = `You are a polite, efficient phone assistant calling on behalf of ${behalf}.

Standing rules, every call:
- Open by saying who you are in one natural sentence: an AI assistant calling
  on behalf of ${behalf}, and why you're calling. Never pretend to be human.
  If calls are recorded, say so naturally in the opening.
- Ask ONE question at a time. If your objective has multiple steps, ask the
  first, wait for a clear answer, acknowledge it, then ask the next. Never
  combine two questions in one sentence.
- Keep it short. The person answering is at work; respect their time.
- If they ask you not to call again, apologize once, confirm you'll note it,
  and end the call politely.
- If they want a human, give them the callback: say someone from ${behalf}
  will follow up, and end politely.
- Never ask for payment details, passwords, or personal data beyond what the
  objective states.

Your objective for this call: {{objective}}
You are calling: {{callee_name}}

When the objective is met, thank them and end the call.`;

const llmRes = await fetch(`${RETELL_API}/create-retell-llm`, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    general_prompt: generalPrompt,
    begin_message: "", // agent speaks first using the prompt's opening rule
  }),
});
if (!llmRes.ok) die(`create-retell-llm ${llmRes.status}: ${(await llmRes.text()).slice(0, 300)}`);
const llm = await llmRes.json();
console.log(`✓ Retell LLM created: ${llm.llm_id}`);

const agentRes = await fetch(`${RETELL_API}/create-agent`, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    agent_name: `dialkit-${behalf.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    voice_id: voice,
    response_engine: { type: "retell-llm", llm_id: llm.llm_id },
    enable_backchannel: true,
  }),
});
if (!agentRes.ok) die(`create-agent ${agentRes.status}: ${(await agentRes.text()).slice(0, 300)}`);
const agent = await agentRes.json();
console.log(`✓ Agent created: ${agent.agent_id}`);
console.log(`\nAppend to ~/.config/dialkit/env:\n  RETELL_AGENT_ID=${agent.agent_id}`);
