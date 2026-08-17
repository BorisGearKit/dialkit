#!/usr/bin/env node
/**
 * Check a call's status; when it's done, print the transcript + analysis and
 * save calls/<date>-<call_id>.md. Polling by design — nothing on this machine
 * listens to the internet. Usage:
 *   node check-call.mjs <call_id> [--watch]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const RETELL_API = "https://api.retellai.com";
const TERMINAL = ["ended", "error", "not_connected"];

function die(msg) { console.error(`✗ ${msg}`); process.exit(1); }

function loadKey() {
  const p = join(homedir(), ".config", "dialkit", "env");
  if (!existsSync(p)) die(`Missing ${p}`);
  const m = /RETELL_API_KEY=(.+)/.exec(readFileSync(p, "utf8"));
  if (!m) die("RETELL_API_KEY missing from env file");
  return m[1].trim();
}

const callId = process.argv[2];
if (!callId) die("Usage: node check-call.mjs <call_id> [--watch]");
const watch = process.argv.includes("--watch");
const key = loadKey();

async function fetchCall() {
  const res = await fetch(`${RETELL_API}/v2/get-call/${callId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) die(`Retell ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

let call = await fetchCall();
while (watch && !TERMINAL.includes(call.call_status)) {
  process.stdout.write(`  status: ${call.call_status} …\r`);
  await new Promise((r) => setTimeout(r, 5000));
  call = await fetchCall();
}

console.log(`status: ${call.call_status}`);
if (!TERMINAL.includes(call.call_status)) {
  console.log("Call still in progress — re-run (or use --watch).");
  process.exit(0);
}

const durationS = call.end_timestamp && call.start_timestamp
  ? Math.round((call.end_timestamp - call.start_timestamp) / 1000) : null;
if (durationS != null) console.log(`duration: ${durationS}s`);
if (call.call_cost?.combined_cost != null) {
  console.log(`cost: $${(call.call_cost.combined_cost / 100).toFixed(3)}`);
}
if (call.call_analysis?.call_summary) console.log(`\nsummary: ${call.call_analysis.call_summary}`);
if (call.transcript) console.log(`\n--- transcript ---\n${call.transcript}`);

mkdirSync("calls", { recursive: true });
const date = new Date().toISOString().slice(0, 10);
const file = join("calls", `${date}-${callId.slice(0, 12)}.md`);
writeFileSync(file, [
  `# Call ${callId}`,
  ``,
  `- date: ${date}`,
  `- status: ${call.call_status}`,
  durationS != null ? `- duration: ${durationS}s` : null,
  call.call_cost?.combined_cost != null ? `- cost: $${(call.call_cost.combined_cost / 100).toFixed(3)}` : null,
  ``,
  `## Summary`,
  call.call_analysis?.call_summary || "(none)",
  ``,
  `## Transcript`,
  call.transcript || "(none)",
  ``,
].filter((l) => l !== null).join("\n"));
console.log(`\n✓ saved ${file}`);
