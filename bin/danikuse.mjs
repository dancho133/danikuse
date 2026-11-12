#!/usr/bin/env node
// Danikuse CLI: one entry point over agent-browser (Brave) and agent-desktop.
// Every command prints one JSON object: {status,browser,action,screenshot,error,next,durationMs,runDir,...}
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HOME = process.env.DANIKUSE_HOME || join(homedir(), ".danikuse");
const AUTO_PROFILE = join(HOME, "automation-profile");
const AUTO_PROFILE_BG = join(HOME, "automation-profile-bg");
const BRAVE_CANDIDATES = [
  process.env.DANIKUSE_BRAVE,
  "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  join(homedir(), "AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"),
].filter(Boolean);

export function findBrave() {
  return BRAVE_CANDIDATES.find((p) => existsSync(p)) || null;
}

// Resolve npm shims to their native .exe on Windows: spawning a .cmd through a
// shell mangles quoted JS/selectors, so the CLI always spawns binaries directly.
function resolveCmd(cmd) {
  if (process.platform !== "win32") return cmd;
  const npmRoot = join(process.env.APPDATA || "", "npm");
  const candidates = {
    "agent-browser": join(npmRoot, "node_modules", "agent-browser", "bin", "agent-browser-win32-x64.exe"),
    "agent-desktop": join(npmRoot, "agent-desktop.exe"),
    agy: join(homedir(), "AppData", "Local", "agy", "bin", "agy.exe"),
  };
  return candidates[cmd] && existsSync(candidates[cmd]) ? candidates[cmd] : cmd;
}

function run(cmd, args, env = {}) {
  const r = spawnSync(resolveCmd(cmd), args, { encoding: "utf8", env: { ...process.env, ...env } });
  const out = (r.stdout || "").trim();
  const err = ((r.stderr || "") + (r.error ? ` ${r.error.message}` : "")).trim();
  return { code: r.status ?? 1, out, err, text: r.status === 0 ? out : err || out };
}

const STATE_PATH = join(HOME, "state.json");
const BLOCK_REASONS = ["captcha_failed", "access_denied", "challenge_loop", "sign_in_blocked", "add_to_cart_blocked", "purchase_blocked", "unexpected_bot_error"];

function readState() {
  try { return JSON.parse(readFileSync(STATE_PATH, "utf8")); } catch { return {}; }
}
function writeState(patch) {
  try {
    mkdirSync(HOME, { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify({ ...readState(), ...patch, updated: new Date().toISOString() }, null, 2));
  } catch {}
}

function makeRunDir(action) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(HOME, "runs", `${stamp}-${action}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function emit(action, browser, started, runDir, fields) {
  const result = {
    status: fields.status || (fields.ok ? "ok" : "error"),
    browser,
    action,
    screenshot: fields.screenshot || null,
    error: fields.error || null,
    next: fields.next || null,
    durationMs: Date.now() - started,
    runDir,
    ...(fields.data !== undefined ? { data: fields.data } : {}),
  };
  try { writeFileSync(join(runDir, "result.json"), JSON.stringify(result, null, 2)); } catch {}
  console.log(JSON.stringify(result, null, 2));
  process.exit(fields.ok ? 0 : 1);
}

function version(cmd) {
  const r = run(cmd, ["--version"]);
  return r.code === 0 ? r.out.trim().split("\n")[0] : null;
}

function doctor() {
  const started = Date.now();
  const brave = findBrave();
  const checks = {
    brave: brave || null,
    agentBrowser: version("agent-browser"),
    agentDesktop: version("agent-desktop"),
    agy: version("agy"),
    node: process.version,
    automationProfile: AUTO_PROFILE,
    automationProfileBg: AUTO_PROFILE_BG,
  };
  const ok = Boolean(brave && checks.agentBrowser && checks.agentDesktop);
  emit("doctor", "none", started, makeRunDir("doctor"), {
    ok,
    data: checks,
    error: ok ? null : "missing prerequisite",
    next: ok ? null : "run install.ps1 (Windows) or install agent-browser/agent-desktop and Brave",
  });
}

async function bridgeCall(action, fields = {}, timeoutMs = 8000) {
  try {
    const token = readFileSync(join(HOME, "bridge-token.txt"), "utf8").trim();
    const r = await fetch("http://127.0.0.1:17331/", {
      method: "POST",
      headers: { "content-type": "application/json", "x-danikuse-token": token },
      body: JSON.stringify({ action, ...fields }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await r.json();
    return data.ok ? data.result : { __bridgeError: data.error || "bridge-error" };
  } catch { return null; }
}

async function personalCdpAlive(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch { return false; }
}

async function browserCmd(args, surface) {
  const started = Date.now();
  // Surface comes from the command name (my/agent) when given; the legacy
  // --personal flag only selects a surface for bare verbs, never overrides one.
  const personal = surface ? surface === "personal" : args.includes("--personal");
  // Explicit flags beat the env default: --show always wins over DANIKUSE_HEADED=0.
  const hide = args.includes("--hide") ? true : args.includes("--show") ? false : process.env.DANIKUSE_HEADED === "0";
  const rest = args.filter((a) => a !== "--personal" && a !== "--hide" && a !== "--show");
  const action = rest[0] || "snapshot";
  const call = rest.length ? rest : [action];
  const runDir = makeRunDir(`browser-${action}`);
  const brave = findBrave();
  if (!brave) emit(action, personal ? "personal-brave" : "automation", started, runDir, { ok: false, error: "brave-not-found", next: "install Brave or set DANIKUSE_BRAVE" });

  if (surface === "automation" && args.includes("--personal")) {
    emit(action, "automation", started, runDir, { ok: false, error: "surface-chosen-by-command", next: "Surface is chosen by command name: use 'danikuse my' for Personal Brave, not --personal on 'agent'." });
  }
  if (personal && args.includes("--hide")) {
    emit(action, "personal-brave", started, runDir, { ok: false, error: "personal-brave-always-visible", next: "Personal Brave is the user's real browser and is always visible; drop --hide." });
  }
  if (personal && action === "upload") {
    const file = rest[1];
    if (!file || !existsSync(file)) emit(action, "personal-brave", started, runDir, { ok: false, error: "file not found", next: "danikuse my upload <path> [--at SELECTOR] [--tab ID]" });
    if (statSync(file).size > 15 * 1024 * 1024) emit(action, "personal-brave", started, runDir, { ok: false, error: "file over 15 MB" });
    const flagVal = (f) => (rest.includes(f) ? rest[rest.indexOf(f) + 1] : undefined);
    const result = await bridgeCall("uploadFile", { filename: file.split(/[\\/]/).pop(), mime: "application/octet-stream", dataBase64: readFileSync(file).toString("base64"), selector: flagVal("--at"), tabId: flagVal("--tab") ? Number(flagVal("--tab")) : undefined }, 30000);
    emit(action, "personal-brave-bridge", started, runDir, result === null ? { ok: false, error: "bridge-unavailable" } : result.__bridgeError ? { ok: false, error: result.__bridgeError } : { ok: true, data: result });
  }
  if (personal && process.env.DANIKUSE_NO_BRIDGE !== "1" && (action === "tabs" || action === "open" || action === "eval" || action === "goto" || action === "close-tab" || action === "type" || action === "click" || action === "submit" || action === "scan")) {
    // Bridge first: extension in the user's Brave, no CDP, no restart, no focus steal.
    const flagVal = (f) => (rest.includes(f) ? rest[rest.indexOf(f) + 1] : undefined);
    const stripFlags = (extra) => rest.slice(1).filter((a, i, arr) => ![...extra, "--tab", "--at"].includes(a) && arr[i - 1] !== "--tab" && arr[i - 1] !== "--at").join(" ");
    const bridgeAction = action === "tabs" ? "listTabs" : action === "open" ? "openTab" : action === "goto" ? "navigateTab" : action === "close-tab" ? "closeTab" : action === "type" ? "typeOnTab" : action === "click" ? "clickOnTab" : action === "submit" ? "submitForm" : action === "scan" ? "scanPage" : "pageInfo";
    const fields = action === "open" ? { url: rest[1], active: rest.includes("--active") }
      : action === "goto" ? { url: rest[1], match: rest[2] || "github.com" }
      : action === "type" ? { text: stripFlags(["--send"]), submit: rest.includes("--send"), selector: flagVal("--at"), tabId: flagVal("--tab") ? Number(flagVal("--tab")) : undefined }
      : action === "click" ? { text: stripFlags([]), selector: flagVal("--at"), tabId: flagVal("--tab") ? Number(flagVal("--tab")) : undefined }
      : action === "close-tab" ? (rest[1] === "--id" ? { tabId: Number(rest[2]) } : { match: rest[1] || "" })
      : action === "eval" ? { tabId: flagVal("--tab") ? Number(flagVal("--tab")) : undefined }
      : action === "submit" ? { selector: flagVal("--at"), tabId: flagVal("--tab") ? Number(flagVal("--tab")) : undefined } : {};
    const result = await bridgeCall(bridgeAction, fields);
    if (result !== null) {
      emit(action, "personal-brave-bridge", started, runDir, result.__bridgeError ? { ok: false, error: result.__bridgeError } : { ok: true, data: result });
    }
    if (action === "tabs") {
      emit(action, "personal-brave", started, runDir, { ok: false, error: "bridge-unavailable", next: "Install the Danikuse Bridge once: run host/install-bridge.ps1, then brave://extensions -> Developer mode -> Load unpacked -> danikuse/extension. Fallback: danikuse my windows lists titles only." });
    }
  }
  if (personal && action === "windows") {
    // Claim-tab view of the live Brave: window titles only, no CDP, no restart.
    const r = run("agent-desktop", ["list-windows", "--app", "brave.exe"]);
    let titles = [];
    try { titles = JSON.parse(r.out).data.map((w) => w.title); } catch {}
    emit(action, "personal-brave", started, runDir, { ok: r.code === 0, data: titles, error: r.code === 0 ? null : r.text });
  }
  if (personal) {
    const port = Number(process.env.DANIKUSE_CDP_PORT || 9222);
    if (!(await personalCdpAlive(port))) {
      emit(action, "personal-brave", started, runDir, {
        ok: false,
        error: "personal-brave-cdp-unavailable",
        next: `Relaunch Brave for this task only, then retry: & "${brave}" --remote-debugging-port=${port} (tabs restore from session; close Brave fully first). Never leave the CDP port open after the task.`,
      });
    }
    run("agent-browser", ["--session", "danikuse-personal", "connect", String(port)]);
    if (action === "screenshot") {
      const shot = join(runDir, "screenshot.png");
      const r = run("agent-browser", ["--session", "danikuse-personal", "screenshot", shot]);
      emit(action, "personal-brave", started, runDir, { ok: r.code === 0, screenshot: r.code === 0 ? shot : null, error: r.code === 0 ? null : r.text });
    }
    const r = run("agent-browser", ["--session", "danikuse-personal", ...call]);
    emit(action, "personal-brave", started, runDir, { ok: r.code === 0, data: r.out, error: r.code === 0 ? null : r.text });
  }

  if (action === "visibility") {
    const st = readState();
    emit(action, "automation", started, runDir, { ok: true, data: { visible: st.agent?.visible ?? true, session: hide ? "danikuse-auto-bg" : "danikuse-auto" } });
  }
  if (action === "report-block") {
    const reason = rest[1];
    if (!BLOCK_REASONS.includes(reason)) {
      emit(action, "automation", started, runDir, { ok: false, error: `reason must be one of: ${BLOCK_REASONS.join(", ")}` });
    }
    emit(action, "automation", started, runDir, { ok: false, status: "captcha-blocked", error: `bot-detection: ${reason}`, data: { reason }, next: "Tell the user the site blocked this browser; switch surface or source, do not retry in a loop." });
  }
  if (action === "captcha-balance" || action === "captcha") {
    const key = process.env.DANIKUSE_CAPSOLVER_KEY;
    if (!key) emit(action, "automation", started, runDir, { ok: false, error: "no-key", next: "Register at capsolver.com, top up, then set DANIKUSE_CAPSOLVER_KEY." });
    const { balance, solveRecaptchaV2 } = await import("../captcha/capsolver.mjs");
    try {
      if (action === "captcha-balance") {
        emit(action, "automation", started, runDir, { ok: true, data: { balance: await balance(key) } });
      } else {
        const token = await solveRecaptchaV2(key, rest[2], rest[1], { invisible: rest.includes("--invisible") });
        emit(action, "automation", started, runDir, { ok: true, data: { token: token.slice(0, 24) + "…", full: token }, next: "Inject via eval: set #g-recaptcha-response value, call ___grecaptcha_cfg callback, then submit." });
      }
    } catch (e) {
      emit(action, "automation", started, runDir, { ok: false, error: String(e.message || e) });
    }
  }
  if (action === "open") writeState({ agent: { visible: !hide, session: hide ? "danikuse-auto-bg" : "danikuse-auto" } });
  if (action === "close") writeState({ agent: { visible: true, session: null } });

  const env = { AGENT_BROWSER_EXECUTABLE_PATH: brave };
  // Visible and background runs are separate sessions AND separate profiles:
  // two Brave processes cannot share one user-data-dir (Chromium lock).
  const base = ["--session", hide ? "danikuse-auto-bg" : "danikuse-auto",
    "--profile", hide ? AUTO_PROFILE_BG : AUTO_PROFILE];
  if (!hide) base.push("--headed");
  if (action === "open") {
    const stealthJs = join(dirname(fileURLToPath(import.meta.url)), "..", "stealth", "stealth.js");
    if (existsSync(stealthJs)) base.push("--init-script", stealthJs);
    // HTTP-level UA: headless Chromium sends HeadlessChrome/<v>; servers see it.
    base.push("--headers", JSON.stringify({ "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36" }));
  }
  if (action === "screenshot") {
    const shot = join(runDir, "screenshot.png");
    const r = run("agent-browser", [...base, "screenshot", shot], env);
    emit(action, "automation", started, runDir, { ok: r.code === 0, screenshot: r.code === 0 ? shot : null, error: r.code === 0 ? null : r.text });
  }
  const r = run("agent-browser", [...base, ...call], env);
  emit(action, "automation", started, runDir, { ok: r.code === 0, data: r.out, error: r.code === 0 ? null : r.text });
}

function desktopCmd(args) {
  const started = Date.now();
  const action = args[0] || "list-windows";
  const runDir = makeRunDir(`desktop-${action}`);
  if (action === "screenshot" && args.length < 2) {
    const shot = join(runDir, "screenshot.png");
    const r = run("agent-desktop", ["screenshot", shot]);
    emit(action, "desktop", started, runDir, { ok: r.code === 0, screenshot: r.code === 0 ? shot : null, error: r.code === 0 ? null : r.text });
  }
  const r = run("agent-desktop", args.length ? args : [action]);
  let data = r.out;
  try { data = JSON.parse(data); } catch {}
  emit(action, "desktop", started, runDir, { ok: r.code === 0, data, error: r.code === 0 ? null : r.text });
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "doctor") doctor();
else if (cmd === "my") await browserCmd(args, "personal");
else if (cmd === "agent") await browserCmd(args, "automation");
else if (cmd === "pc" || cmd === "desktop") desktopCmd(args);
else if (cmd) await browserCmd([cmd, ...args]);
else {
  emit("usage", "none", Date.now(), makeRunDir("usage"), { ok: false, error: "usage: danikuse doctor | danikuse my <verb> | danikuse agent <verb> [--show|--hide] | danikuse pc <args>  (my = your Brave, agent = agent browser, pc = desktop; bare verbs default to agent)" });
}
