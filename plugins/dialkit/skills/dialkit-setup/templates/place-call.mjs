#!/usr/bin/env node
/**
 * Place one outbound call via Retell. Usage:
 *   node place-call.mjs --to +15551234567 --scenario <name>
 *
 * Scenarios come from scenarios.md in this folder (## <name> sections with
 * `objective:` and `callee:` lines). Keys load from ~/.config/dialkit/env —
 * never from this folder. Refuses numbers found in no-call.md.
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const RETELL_API = "https://api.retellai.com";

function loadEnv() {
  const p = join(homedir(), ".config", "dialkit", "env");
  if (!existsSync(p)) die(`Missing ${p} — run the dialkit-setup skill first.`);
  const env = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.+)$/.exec(line.trim());
    if (m) env[m[1]] = m[2];
  }
  for (const k of ["RETELL_API_KEY", "RETELL_AGENT_ID", "RETELL_FROM_NUMBER"]) {
    if (!env[k]) die(`${k} missing from ~/.config/dialkit/env`);
  }
  return env;
}

function die(msg) { console.error(`✗ ${msg}`); process.exit(1); }

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
}

function loadScenario(name) {
  if (!existsSync("scenarios.md")) die("No scenarios.md in this folder.");
  const text = readFileSync("scenarios.md", "utf8");
  const sections = text.split(/^## /m).slice(1);
  for (const s of sections) {
    const title = s.split("\n")[0].trim();
    if (title !== name) continue;
    const objective = /objective:\s*(.+(?:\n(?!\w+:).+)*)/i.exec(s)?.[1]?.replace(/\n\s*/g, " ").trim();
    const callee = /callee:\s*(.+)/i.exec(s)?.[1]?.trim();
    if (!objective) die(`Scenario "${name}" has no objective: line.`);
    return { name: title, objective, callee: callee || "the business" };
  }
  die(`Scenario "${name}" not found in scenarios.md.`);
}

function checkNoCall(number) {
  if (!existsSync("no-call.md")) return;
  const listed = readFileSync("no-call.md", "utf8").replace(/[^+\d\n]/g, "");
  if (listed.split("\n").some((n) => n && number.replace(/[^+\d]/g, "").endsWith(n.slice(-10)))) {
    die(`${number} is on no-call.md — not calling.`);
  }
}

const to = arg("to");
const scenarioName = arg("scenario");
if (!to || !scenarioName) die("Usage: node place-call.mjs --to +1555... --scenario <name>");
if (!/^\+\d{8,15}$/.test(to)) die(`"${to}" is not an E.164 number (+15551234567).`);

const env = loadEnv();
checkNoCall(to);
const scenario = loadScenario(scenarioName);

console.log(`→ Calling ${to} as scenario "${scenario.name}"`);
console.log(`  objective: ${scenario.objective}\n`);

const res = await fetch(`${RETELL_API}/v2/create-phone-call`, {
  method: "POST",
  headers: { Authorization: `Bearer ${env.RETELL_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from_number: env.RETELL_FROM_NUMBER,
    to_number: to,
    override_agent_id: env.RETELL_AGENT_ID,
    metadata: { scenario: scenario.name },
    retell_llm_dynamic_variables: {
      objective: scenario.objective,
      callee_name: scenario.callee,
    },
  }),
});

if (!res.ok) die(`Retell ${res.status}: ${(await res.text()).slice(0, 300)}`);
const data = await res.json();
console.log(`✓ Call placed. call_id: ${data.call_id}`);
console.log(`  Next: node check-call.mjs ${data.call_id}`);
