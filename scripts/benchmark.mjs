#!/usr/bin/env node
// Danikuse benchmark: the 5 tasks that define "works". Writes runs/benchmark-<stamp>/report.json.
// Pass = at least 4 of 5 tasks ok without intervention. Local fixtures only; no external site, no keys.
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "danikuse.mjs");
const HOME = process.env.DANIKUSE_HOME || join(homedir(), ".danikuse");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const OUT = join(HOME, "runs", `benchmark-${stamp}`);
mkdirSync(OUT, { recursive: true });

const FORM = `<!doctype html><title>Danikuse Form</title><h1>Signup</h1>
<label>Name <input id="name"></label><label>Email <input id="email"></label>
<button id="submit">Submit</button><p id="result"></p>
<script>submit.onclick=()=>{result.textContent='Submitted: '+document.querySelector('#name').value+' <'+document.querySelector('#email').value+'>'}</script>`;
const DATA = `<!doctype html><title>Danikuse Data</title><table id="t">
<tr><td class="n">alpha</td><td class="p">10</td></tr><tr><td class="n">beta</td><td class="p">20</td></tr></table>`;
const SITE = `<!doctype html><title>Danikuse Site</title><style>body{font-family:sans-serif}h1{color:#bf4520}</style><h1 id="hero">Hello Danikuse</h1><p>dev loop fixture</p>`;

const server = createServer((req, res) => {
  res.setHeader("content-type", "text/html");
  res.end(req.url.startsWith("/form") ? FORM : req.url.startsWith("/data") ? DATA : SITE);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// Async on purpose: the fixture server lives in this process, so a blocking
// spawnSync would starve its event loop and every page load would time out.
function cli(args, env = {}) {
  const t = Date.now();
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [CLI, ...args], { env: { ...process.env, ...env } });
    let raw = "";
    p.stdout.on("data", (d) => (raw += d));
    p.stderr.on("data", (d) => (raw += d));
    p.on("close", () => {
      let json = null;
      try { json = JSON.parse(raw); } catch {}
      resolve({ json, raw, ms: Date.now() - t });
    });
  });
}
const results = [];
function record(id, name, ok, ms, detail) {
  results.push({ id, name, status: ok ? "ok" : "failed", durationMs: ms, detail });
  console.log(`${ok ? "PASS" : "FAIL"} task${id} ${name} ${ms}ms ${detail || ""}`);
}

// Task 1: fill and submit a form (Automation Browser)
{
  const t = Date.now();
  await cli(["agent","open", `${BASE}/form`, "--hide"]);
  await cli(["agent","fill", "#name", "Danial Test", "--hide"]);
  await cli(["agent","fill", "#email", "test@example.com", "--hide"]);
  await cli(["agent","click", "#submit", "--hide"]);
  const r = await cli(["agent","eval", "document.querySelector('#result').textContent", "--hide"]);
  record(1, "form-fill-submit", r.json?.status === "ok" && String(r.json.data).includes("Submitted: Danial Test"), Date.now() - t, String(r.json?.data || r.raw).slice(0, 120));
}
// Task 2: structured extraction to JSON
{
  const t = Date.now();
  await cli(["agent","open", `${BASE}/data`, "--hide"]);
  let r = null;
  for (let i = 0; i < 5; i++) {
    r = await cli(["agent","eval", "JSON.stringify([...document.querySelectorAll('#t tr')].map(tr=>({name:tr.querySelector('.n').textContent,price:+tr.querySelector('.p').textContent})))", "--hide"]);
    if (String(r.json?.data).includes("alpha")) break;
    await new Promise((res) => setTimeout(res, 500));
  }
  const ok = r.json?.status === "ok" && String(r.json.data).includes("alpha") && String(r.json.data).includes("beta");
  record(2, "structured-extraction", ok, Date.now() - t, String(r.json?.data || "").slice(0, 120));
}
// Task 3: dev loop — open local site, screenshot, verify visually-loadable state
{
  const t = Date.now();
  await cli(["agent","open", `${BASE}/site`, "--hide"]);
  const shot = await cli(["agent","screenshot", "--hide"]);
  const title = await cli(["agent","eval", "document.title", "--hide"]);
  const fileOk = shot.json?.screenshot && existsSync(shot.json.screenshot) && statSync(shot.json.screenshot).size > 1000;
  record(3, "dev-loop-screenshot", Boolean(fileOk && String(title.json?.data).includes("Danikuse Site")), Date.now() - t, `screenshot=${shot.json?.screenshot || "none"}`);
}
await cli(["agent","close", "--hide"]);

// Task 4: desktop surface. Quiet by default (no app launches, no popups):
// reads the window list through agent-desktop. Set DANIKUSE_BENCHMARK_VISIBLE=1
// to run the full Notepad launch/confirm/close variant instead.
{
  const t = Date.now();
  if (process.platform !== "win32") record(4, "desktop-windows", false, 0, "windows-only in v0.1");
  else if (process.env.DANIKUSE_BENCHMARK_VISIBLE === "1") {
    await cli(["pc", "launch", "notepad", "--activate"]);
    const wins = await cli(["pc", "list-windows", "--app", "Notepad"]);
    const ok = wins.json?.status === "ok" && JSON.stringify(wins.json.data).toLowerCase().includes("notepad");
    await cli(["pc", "close-app", "Notepad"]);
    record(4, "desktop-notepad-visible", ok, Date.now() - t, ok ? "window confirmed, app closed" : String(wins.raw).slice(0, 120));
  } else {
    const wins = await cli(["pc", "list-windows"]);
    const list = wins.json?.data?.data || wins.json?.data;
    const ok = wins.json?.status === "ok" && Array.isArray(list) && list.length > 0;
    record(4, "desktop-windows-quiet", ok, Date.now() - t, ok ? `${list.length} windows visible to desktop surface, nothing launched` : String(wins.raw).slice(0, 120));
  }
}
// Task 5: Personal Brave shape — Brave via CDP with a personal-style profile, fill a draft, never submit.
// Uses a throwaway profile so the user's live Brave/profile is never touched by the benchmark.
{
  const t = Date.now();
  if (process.platform !== "win32") record(5, "personal-brave-draft", false, 0, "windows-only in v0.1");
  else {
    const brave = [
      process.env.DANIKUSE_BRAVE,
      "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      join(homedir(), "AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"),
    ].filter(Boolean).find((p) => existsSync(p));
    const profile = join(OUT, "personal-profile");
    const port = 9333;
    let ok = false, detail = "brave-not-found";
    if (brave) {
      // Kill by captured PID tree (taskkill /T): no interpolated shell strings,
      // and the finally guarantees no orphaned Brave or open CDP port.
      const child = spawn(brave, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--headless=new", `${BASE}/form`], { detached: true, stdio: "ignore" });
      child.unref();
      try {
        let alive = false;
        for (let i = 0; i < 20 && !alive; i++) { try { alive = (await fetch(`http://127.0.0.1:${port}/json/version`)).ok; } catch { await new Promise((r) => setTimeout(r, 500)); } }
        detail = "cdp-not-alive";
        if (alive) {
          const env = { DANIKUSE_CDP_PORT: String(port), DANIKUSE_NO_BRIDGE: "1" };
          await cli(["my", "open", `${BASE}/form`], env);
          await cli(["my", "fill", "#name", "Draft Only"], env);
          const v = await cli(["my", "eval", "document.querySelector('#name').value+'|'+document.querySelector('#result').textContent"], env);
          ok = v.json?.status === "ok" && String(v.json.data).includes("Draft Only|");
          detail = String(v.json?.data || v.raw).slice(0, 120);
        }
      } finally {
        if (child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      }
    }
    record(5, "personal-brave-draft", ok, Date.now() - t, detail);
  }
}

server.close();
const passed = results.filter((r) => r.status === "ok").length;
const report = { benchmark: "danikuse-v0.1", at: new Date().toISOString(), base: BASE, passed, total: results.length, verdict: passed >= 4 ? "PASS" : "FAIL", results };
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(`\n${passed}/${results.length} passed — verdict ${report.verdict}. Report: ${join(OUT, "report.json")}`);
process.exit(passed >= 4 ? 0 : 1);




