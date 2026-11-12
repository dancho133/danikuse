# Danikuse architecture audit — docs vs code

Date: 2026-11-12. Scope: primary sources in this repo only — `GLOSSARY.md`,
`SKILL.md`, `skills/*/SKILL.md`, `bin/danikuse.mjs`, `extension/`, `host/`,
`scripts/benchmark.mjs`, `docs/*`, plus `README.md`/`README.ru.md`,
`AGENTS.md`, `install.ps1`/`install.sh`, `package.json` where they promise
behaviour. No other file was edited for this audit. External engines
(`agent-browser`, `agent-desktop`, Brave) were not audited; claims that rest
entirely on them are marked as such.

Verdict key: **Exists** = code implements it · **Prose-only** = rule exists
only as instruction text to the agent, no code enforcement · **Missing** =
promised, no code · **Contradicted** = docs and code (or two docs) disagree ·
**Undocumented** = code exists, docs do not describe it.

Headline: the CLI core (one JSON contract, three surface commands, two
browser paths, desktop passthrough, benchmark) is real and small. The safety
model (Confirm/Autonomous/Hard Stop) has **zero code enforcement** — it is
skill prose only. The Bridge (extension + native host) exists in code but is
contradicted by `docs/openai-plugins-reverse.md:25`, is not installed by
`install.ps1`, and is absent from the README layout.

## 1. Claim-by-claim table

| # | Claim (doc source) | Code evidence (file:line) | Verdict |
|---|---|---|---|
| 1 | One CLI module behind all surfaces (`SKILL.md:8`, `AGENTS.md:3`) | Single entry `bin/danikuse.mjs:229-236`; `package.json:7` bin maps `danikuse` → `./bin/danikuse.mjs` | Exists |
| 2 | Three surfaces chosen by command name, never by flag (`GLOSSARY.md:12`, `SKILL.md:8`, `AGENTS.md:3`) | Dispatch `my`/`agent`/`pc` at `bin/danikuse.mjs:231-233`; `--personal` on `agent` rejected `bin/danikuse.mjs:141-143`. **But** bare verbs fall back to flag selection: `bin/danikuse.mjs:131,234` | Contradicted (see §4.1) |
| 3 | `/danikuse` router/index skill + 3 surface skills (`SKILL.md:10-14`) | `SKILL.md`, `skills/danikuse-my/SKILL.md`, `skills/danikuse-agent/SKILL.md`, `skills/danikuse-desktop/SKILL.md` all present; installer copies all four `install.ps1:16-20` | Exists |
| 4 | Every call returns one JSON object `{status,browser,action,screenshot,error,next,durationMs,runDir}` (`SKILL.md:16`, `README.md:14`) | `emit()` builds exactly that shape (+optional `data`) `bin/danikuse.mjs:63-78`; every path ends in `emit` | Exists |
| 5 | Run Folder holds screenshots, JSON results, timing; local-only, never committed (`GLOSSARY.md:35-36`, `README.md:21`) | `makeRunDir()` → `~/.danikuse/runs/<stamp>-<action>` `bin/danikuse.mjs:56-61`; `result.json` written `bin/danikuse.mjs:75`; screenshot only on `screenshot` action `bin/danikuse.mjs:205-209,176-179,218-221`. `.gitignore:1` covers repo `runs/`, actual runs live outside repo in `~/.danikuse` | Exists (screenshots only when requested) |
| 6 | Automation Browser: Brave engine, separate light profile, default web surface (`GLOSSARY.md:31-33`, `README.md:20`) | `AGENT_BROWSER_EXECUTABLE_PATH=<Brave>` `bin/danikuse.mjs:199`; `--profile ~/.danikuse/automation-profile` `bin/danikuse.mjs:10,202-203`; profile dirs created `install.ps1:24` | Exists (~10 MB size claim: no code measures it) |
| 7 | Agent verbs `open,snapshot,fill,click,eval,screenshot,close` (`skills/danikuse-agent/SKILL.md:8`) | No allowlist: any verb passes through to `agent-browser` `bin/danikuse.mjs:210-211`; `screenshot` special-cased `bin/danikuse.mjs:205-209`; `open`/`close` update state `bin/danikuse.mjs:196-197` | Exists (by passthrough) |
| 8 | Agent visible by default, `--hide` for background, `--show` beats env (`SKILL.md:13`, `skills/danikuse-agent/SKILL.md:10`) | `hide = --hide ? true : --show ? false : DANIKUSE_HEADED==="0"` `bin/danikuse.mjs:133`; separate bg session+profile `bin/danikuse.mjs:202-204`; `--headed` when visible `bin/danikuse.mjs:204` | Exists |
| 9 | `danikuse agent visibility` reports recorded visibility (`skills/danikuse-agent/SKILL.md:10`, `docs/openai-plugins-reverse.md:17`) | `bin/danikuse.mjs:185-188` reads `state.json`; **but** returned `session` is re-derived from the current call's `--hide` flag, not the stored session | Exists, partially misleading |
| 10 | `danikuse agent report-block <reason>` with fixed enum → `status:"captcha-blocked"` (`skills/danikuse-agent/SKILL.md:13`, `SKILL.md:29`) | Enum `bin/danikuse.mjs:44`; validation + emit `bin/danikuse.mjs:189-194`; same enum in `extension`-independent CLI only | Exists |
| 11 | Captcha-Blocked = terminal state after persistent profile + Personal Brave session + own attempts (`GLOSSARY.md:43-45`, `SKILL.md:29`) | No attempt/escalation tracking anywhere; `report-block` accepts any valid reason at any time `bin/danikuse.mjs:189-194` | Prose-only |
| 12 | Confirm Mode default; Autonomous Mode one-task, explicit opt-in (`GLOSSARY.md:15-21`, `README.md:18-19`) | No mode flag, state field, prompt, or gate in CLI: grep for mode logic finds only `BLOCK_REASONS`; all verbs pass straight through `bin/danikuse.mjs:210,223` | Prose-only |
| 13 | Hard Stop: pay / password-access change / irreversible deletion stop in every mode (`GLOSSARY.md:23-25`, `README.md:19`) | No verb classification, no blocklist in `bin/danikuse.mjs` or `host/`; desktop deny-list from `docs/openai-plugins-reverse.md:13` also not implemented | Prose-only |
| 14 | Graded confirmation tiers (none / pre-approval / always-confirm / hand-off) (`SKILL.md:24-28`) | No code counterpart; root skill text only | Prose-only |
| 15 | Personal Brave: user's own Brave/profile, only for personal tasks, always visible, never headless (`GLOSSARY.md:27-29`, `skills/danikuse-my/SKILL.md:12`) | `--hide` on personal rejected `bin/danikuse.mjs:144-146`; surface guard `bin/danikuse.mjs:141-143`. "Only when task needs user session" is instruction text `skills/danikuse-my/SKILL.md:10`, not code | Exists (visibility) / Prose-only (task gating) |
| 16 | Bridge verbs first: `my tabs/open/eval` via extension, no CDP, no restart, no focus steal (`skills/danikuse-my/SKILL.md:8`) | Bridge dispatch `bin/danikuse.mjs:147-154`; maps `tabs→listTabs`, `open→openTab {active:false}`, `eval→pageInfo` `bin/danikuse.mjs:149-150`; extension opens inactive tab `extension/background.js:22-24` | Exists |
| 17 | Bridge `eval` returns title, URL, text of active page (`skills/danikuse-my/SKILL.md:8`) | `pageInfo` picks active http(s) tab (fallback: first http tab) and returns `{title,url,text≤4000 chars}` `extension/background.js:25-36`. **Note:** same verb `eval` over CDP returns arbitrary JS result `bin/danikuse.mjs:181-182` — two different semantics for one verb | Exists, inconsistent semantics |
| 18 | `my windows` = titles only, works without extension (`skills/danikuse-my/SKILL.md:8`, `docs/openai-plugins-reverse.md:19`) | `agent-desktop list-windows --app brave.exe`, titles extracted `bin/danikuse.mjs:159-165` | Exists |
| 19 | CDP verbs (`snapshot,fill,click,screenshot,close`) only when bridge unavailable (`skills/danikuse-my/SKILL.md:8`) | Fall-through is per-verb and silent: if bridge returns `null`, `open`/`eval` (not just `tabs`) continue into the CDP path `bin/danikuse.mjs:152-182`; only `tabs` emits `bridge-unavailable` `bin/danikuse.mjs:155-157`. No "task truly needs them" check | Contradicted (partial) |
| 20 | Personal Brave CDP: localhost port for this task only, never left open (`README.md:20`, `skills/danikuse-my/SKILL.md:11`) | CLI only *detects* a live port and instructs a manual relaunch `bin/danikuse.mjs:167-174`; it never starts/stops Brave, never closes the port; connect via `agent-browser --session danikuse-personal connect <port>` `bin/danikuse.mjs:175`. Cleanup is entirely the agent's manual duty | Prose-only (detection exists) |
| 21 | Desktop verbs `launch,snapshot,click,type,set-value,get,press,screenshot,list-windows,close-app` via `danikuse pc` (`skills/danikuse-desktop/SKILL.md:8`) | Verbatim passthrough to `agent-desktop` `bin/danikuse.mjs:214-227`; `screenshot` without a path arg special-cased `bin/danikuse.mjs:218-221`; alias `desktop` also accepted `bin/danikuse.mjs:233` | Exists (by passthrough) |
| 22 | Desktop: unique-window rule, observe→one action→refresh, `set-value` verifies via accessibility, check focus before typing (`skills/danikuse-desktop/SKILL.md:11-14`) | No window-count check, no ref staleness check, no value verification, no focus check in `bin/danikuse.mjs:214-227` — all delegated to `agent-desktop` + agent discipline | Prose-only |
| 23 | Desktop always visible cursor (`SKILL.md:14`, `docs/architecture.html:92,150`) | CLI passes args through unchanged; no headed/headless handling on desktop path `bin/danikuse.mjs:214-227` | Prose-only (engine-dependent) |
| 24 | Benchmark: 5 fixed tasks, local fixtures, timed report, pass ≥4/5 (`GLOSSARY.md:39-41`, `README.md:35`) | `scripts/benchmark.mjs:55-134` implements form-fill-submit, structured-extraction, dev-loop-screenshot, desktop-notepad, personal-brave-draft; verdict `passed>=4` `scripts/benchmark.mjs:138-141`; report to `~/.danikuse/runs/benchmark-<stamp>/report.json` `scripts/benchmark.mjs:15,139` | Exists |
| 25 | Benchmark Personal Brave task never touches user's live Brave (`scripts/benchmark.mjs:96-97` comment) | Uses throwaway profile + CDP port 9333 `scripts/benchmark.mjs:108-114`, **but** `my open`/`my eval` try the live Bridge first `bin/danikuse.mjs:147-154`: if the user's real Brave has the Bridge, benchmark `open` opens a tab in the *real* browser and `eval` reads the real active page | Contradicted (isolation leak, §4.3) |
| 26 | Benchmark exercises the surface commands users are told to use | Tasks 1–3 use legacy bare verbs `scripts/benchmark.mjs:58-80` (not `agent …`); task 4 uses the `desktop` alias `scripts/benchmark.mjs:89-92` (not documented `pc`) | Contradicted (tests legacy path) |
| 27 | `doctor` verifies prerequisites (`README.md:27`, `install.ps1:25`) | Checks Brave, agent-browser, agent-desktop versions + profile paths `bin/danikuse.mjs:85-103`; does **not** check Bridge extension, native-host registration, token file, or port 17331 | Exists, incomplete vs Bridge promise |
| 28 | Installer sets everything up (`README.md:5,26`, `install.ps1`) | `install.ps1:5-25` installs engines, the npm package, 4 skills (only if `~/.dsh/skills` already exists, else silently skips `install.ps1:15`), creates both profiles. It never runs `host/install-bridge.ps1`, never installs/loads the extension | Missing (Bridge install) |
| 29 | Native messaging host registered for Brave/Chrome/Chromium (`host/install-bridge.ps1:1-3`) | Registry writes `host/install-bridge.ps1:15-22`; manifest regenerated with pinned extension origin `host/install-bridge.ps1:7-13`; host binary `host/danikuse-host.mjs`, launcher `host/danikuse-host.cmd:2`. Manual step only — see #28. CLI error text claims "native host is already registered" `bin/danikuse.mjs:156`, which is false after a plain `install.ps1` run | Exists (manual), Contradicted (installer claim) |
| 30 | Extension + native host bridge itself "Danikuse does not have yet; Personal Brave stays CDP-on-demand" (`docs/openai-plugins-reverse.md:25`) | Extension exists `extension/manifest.json:3-9`, `extension/background.js:5-45`; host exists `host/danikuse-host.mjs:60-76`; CLI prefers it `bin/danikuse.mjs:147-154` | Contradicted (stale doc — bridge shipped) |
| 31 | Web reading: keyless Firecrawl (scrape/search/parse) for public stateless pages (`README.md:13`, `README.ru.md:13`, `skills/danikuse-agent/SKILL.md:16`) | Grep: Firecrawl appears only in docs (`README.md:13,44`, `SKILL.md:34`, agent skill). No CLI verb, no fetch, no config in `bin/`, `host/`, `scripts/` | Missing (conditional wording: "if available" / opt-in — but README presents it as a feature) |
| 32 | Optional layers not in core: Skyvern, captcha solvers, paid Firecrawl (`README.md:44`, `SKILL.md:34`) | Correctly absent from code; `SKILL.md:34` also says zero paid keys required | Exists (as non-feature) |
| 33 | "No second Chromium download; both engines drive installed Brave" (`README.md:11`) | Automation path pins Brave exe `bin/danikuse.mjs:199`; installer "downloads no browser" `install.ps1:1,5-6`. Desktop engine's browser use is external (`agent-desktop`), unverifiable in-repo | Exists for browser path |
| 34 | Install ≈156 MB, profile ≈10 MB, 500 MB budget (`README.md:31`) | No measurement code anywhere; `doctor` reports paths, not sizes `bin/danikuse.mjs:88-96` | Unverifiable in code |
| 35 | macOS/Linux not certified in v0.1 (`README.md:31`) | `install.sh:2-3` says the same and installs prereqs only; benchmark tasks 4–5 hard-fail non-Windows `scripts/benchmark.mjs:87,100`. **But** `install.sh` omits `automation-profile-bg`, skills, and the global package install that `install.ps1:7,16-24` performs | Exists (with installer drift) |
| 36 | Vocabulary fixed by GLOSSARY; synonyms avoided (`AGENTS.md:6`) | Code uses `captcha-blocked` `bin/danikuse.mjs:194`, `personal-brave`/`automation` browser labels `bin/danikuse.mjs:139,153,182`. Docs themselves drift: README still says "/danikuse as the only entry point" `README.md:5` vs three-surface rule `GLOSSARY.md:12`; agent skill contradicts itself on visibility default (§4.2) | Contradicted (doc-level drift) |
| 37 | Runs/screenshots/profiles/`.env` never committed (`AGENTS.md:8`, `SKILL.md:33`) | `.gitignore:1-5` covers `runs/`, `.danikuse/`, `.env`. **But** committed `host/com.danikuse.bridge.json:2` contains the maintainer's absolute personal path `C:\Users\<REDACTED>\...\danikuse\host\danikuse-host.cmd` (regenerated per-machine by `host/install-bridge.ps1:14`, so the committed copy is also stale for any other user) | Contradicted (one file) |
| 38 | License Apache-2.0 (`README.md:46`, `package.json:5`) | `LICENSE` present; `package.json:5` matches | Exists |

## 2. Promised, but no code

1. **All mode enforcement** — Confirm Mode, Autonomous Mode, Hard Stop, and
   the four graded tiers (#12–14) are prose in `SKILL.md:20-29` and the
   surface skills. The CLI will execute `click` on a Pay button, a desktop
   `type` into a terminal, or an `eval` that deletes data exactly as readily
   as a read. Safety depends entirely on the consuming agent obeying skill
   text. `docs/openai-plugins-reverse.md:13` even records OpenAI's desktop
   hard-deny list (terminals, auth dialogs, Windows key, security settings);
   it was not adopted in code.
2. **Keyless Firecrawl** (#31) — presented as the web-reading path in both
   READMEs; no verb, client, or fallback exists. Agent-skill wording
   ("if available", `skills/danikuse-agent/SKILL.md:16`) is the only hedge.
3. **Bridge installation** (#28) — `skills/danikuse-my/SKILL.md:8` leads with
   Bridge verbs and `bin/danikuse.mjs:156` asserts the host "is already
   registered", but `install.ps1` never registers it and cannot load an
   unpacked extension. First-run `my tabs` therefore always falls to the
   `bridge-unavailable` error unless the user manually runs
   `host/install-bridge.ps1` + loads `extension/` — a step no README
   documents (`README.md:37-42` layout doesn't mention `extension/` or
   `host/` at all).
4. **CDP port lifecycle** (#20) — "for this task only / never leave the port
   open" has detection (`personalCdpAlive`, `bin/danikuse.mjs:120-125,168`)
   but no start, no stop, no verification that the port was closed.
5. **Captcha escalation sequence** (#11) — no counters, no "tried profile →
   tried Personal Brave" state before `report-block` is accepted.
6. **Size budgets** (#34) — 156 MB / ~10 MB / 500 MB are unmeasured claims.

## 3. Code, but no (or stale) docs

1. **The whole Bridge stack post-dates its docs**: `extension/background.js`,
   `extension/manifest.json`, `host/danikuse-host.mjs` (HTTP 127.0.0.1:17331
   + rotating token file, `host/danikuse-host.mjs:13-16,60-76`), and
   `host/install-bridge.ps1` are described only in
   `skills/danikuse-my/SKILL.md:8` and the CLI's own error text, while
   `docs/openai-plugins-reverse.md:23-26` still lists the bridge under
   "Not adopted". README layout omits both folders entirely.
2. **Legacy bare-verb surface**: `danikuse open/fill/…` with a `--personal`
   flag (`bin/danikuse.mjs:131,234`) is the path the benchmark actually
   tests (#26) but no current skill documents it; the skills teach only
   `my`/`agent`/`pc`.
3. **`desktop` alias** for `pc` (`bin/danikuse.mjs:233`), used by
   `scripts/benchmark.mjs:89-92`, undocumented.
4. **`agy` in `doctor`** (`bin/danikuse.mjs:31-32,92`): reported but not
   required (`bin/danikuse.mjs:97`), contradicting the stance that AGY is
   development help, "not part of Danikuse" (`SKILL.md:35`,
   `docs/architecture.html:154`).
5. **Bridge plumbing details**: CLI bridge timeout 8 s
   (`bin/danikuse.mjs:113`) vs host→extension timeout 15 s
   (`host/danikuse-host.mjs:48`) — a slow extension reply makes the CLI
   declare the bridge unavailable and fall through to CDP (§4.3). Token is a
   plaintext file `~/.danikuse/bridge-token.txt`, rewritten on every host
   start (`host/danikuse-host.mjs:14-16`); undocumented.
6. **Extension surface beyond the CLI's use**: `chrome.tabs.query({})`
   returns tabs from *all* windows with URLs (`extension/background.js:20-21`)
   under `host_permissions:["<all_urls>"]` (`extension/manifest.json:8`);
   docs describe `tabs` only as "list his tabs" (`skills/danikuse-my/SKILL.md:8`).
   Stale comment: header promises `evalOnTab` (`extension/background.js:2`),
   implemented action is `pageInfo`.
7. **State file**: `~/.danikuse/state.json` shape `{agent:{visible,session},
   updated}` (`bin/danikuse.mjs:43-54,196-197`) is mentioned only in passing
   at `docs/openai-plugins-reverse.md:17`.
8. **Windows exe resolution** (`resolveCmd`, `bin/danikuse.mjs:25-34`):
   hard-coded `%APPDATA%\npm` paths with a silent fallback to the bare
   command name — despite the comment claiming binaries are "always"
   spawned directly, the fallback reintroduces `.cmd`-shim spawning.

## 4. Architecture consistency

### 4.1 Three surfaces
Mostly consistent: root router (`SKILL.md:10-14`), three skills, three CLI
prefixes (`bin/danikuse.mjs:231-233`), diagram (`docs/architecture.html:77-127`).
Two leaks: (a) the legacy bare-verb + `--personal` flag path
(`bin/danikuse.mjs:131,234`) reintroduces exactly the flag-chosen surface
that `GLOSSARY.md:12` abolished — and it is the only path the benchmark's
browser tasks exercise; (b) README onboarding still instructs "/danikuse as
the only entry point" (`README.md:5`, `README.ru.md:5`), pre-dating the
2026-11-12 reversal recorded in `GLOSSARY.md:12`.

### 4.2 Modes
Vocabulary is consistent across `GLOSSARY.md:15-25`, `SKILL.md:20-29`, and
both READMEs — as *language*. Architecturally there is no mode concept in
code: no state field, no per-task expiry for Autonomous Mode, no Hard Stop
gate. Related inconsistency: visibility defaults contradict each other —
"Visible window by default" and "background is the default posture unless
the user asks to watch" in the *same bullet* (`skills/danikuse-agent/SKILL.md:10`),
against "visible by default" (`SKILL.md:13`) and "по умолчанию всё видно"
(`docs/architecture.html:150`). Code default is visible
(`bin/danikuse.mjs:133,185-188`). Also `visibility`'s reported session is
computed from the *querying* call's flags, so `danikuse agent visibility
--hide` reports the bg session regardless of what is actually open.

### 4.3 Bridge vs CDP paths (Personal Brave)
Three paths exist and their precedence is subtle:
bridge (`bin/danikuse.mjs:147-154`) → `windows` via desktop engine
(`bin/danikuse.mjs:159-165`) → CDP via agent-browser
(`bin/danikuse.mjs:166-182`). Issues:
- Fall-through on bridge failure is silent for `open`/`eval`: a bridge
  timeout (8 s CLI vs 15 s host, §3.5) drops into CDP, so `my open` can
  relaunch-prompt or drive the CDP session instead of the live tab — the
  opposite of the documented "Bridge verbs first … CDP only when the bridge
  is unavailable and the task truly needs them" intent, with no signal to
  the agent beyond which path happened to answer.
- Same verb, two semantics: `eval` = page text snapshot (bridge,
  `extension/background.js:32-35`) vs arbitrary JS evaluation (CDP,
  `bin/danikuse.mjs:181`). Callers cannot tell which they got except from
  the `browser` field (`personal-brave-bridge` vs `personal-brave`).
- Benchmark isolation leak (#25): task 5's "throwaway profile" guarantee is
  void whenever the user's real Bridge is live, because `my open`/`my eval`
  prefer it over the CDP port the task sets up.
- `my screenshot`/`snapshot`/`fill`/`click` never try the bridge (by
  design, `bin/danikuse.mjs:147`), so Personal Brave rich interaction still
  requires the manual CDP relaunch that the Bridge was built to avoid.

### 4.4 State handling
State is minimal and asymmetric. Only the Automation Browser persists
anything: `state.json` `{agent:{visible,session}}` written on `open`/`close`
(`bin/danikuse.mjs:196-197`), read by `visibility` (`bin/danikuse.mjs:185-188`).
`close` unconditionally records `visible:true, session:null` even for a
`--hide` close, and session identity is otherwise re-derived per call from
flags/env (`bin/danikuse.mjs:133,202-203`) — there are no persistent
tab/window handles of the kind `docs/openai-plugins-reverse.md:7` describes
as the OpenAI model; each CLI call is a fresh process re-attaching by
session name. Personal Brave and Desktop keep no state at all (CDP port
comes from env `DANIKUSE_CDP_PORT`, default 9222, `bin/danikuse.mjs:167`).
All state/evidence writes swallow errors (`bin/danikuse.mjs:53,75`), so a
failed `result.json` write is invisible. The bridge token is the only other
persisted state and rotates per host start (`host/danikuse-host.mjs:14-16`),
which invalidates any CLI call racing a host restart (returns `null` →
treated as bridge-unavailable → CDP fall-through, §4.3).

### 4.5 Minor doc defects found in passing
- Numbering restart in `skills/danikuse-desktop/SKILL.md:13-14` (two steps
  numbered 2, then 3 twice).
- `docs/openai-plugins-reverse.md:15` labels the bridge-era changes "v0.2"
  while `package.json:3` is `0.1.0`.
- Committed native-host manifest carries a machine-specific absolute path
  (#37) and will be overwritten by `host/install-bridge.ps1:14` on any
  correct install.

## 5. Priority findings

1. Safety modes are unenforced prose (#12–14) — highest-risk gap between
   promise and code; any consumer that trusts the CLI to gate submit/pay/
   delete is unprotected.
2. Bridge is shipped but not installed and officially "not adopted"
   (#28–30) — reconcile `install.ps1`, `docs/openai-plugins-reverse.md:25`,
   and the README layout.
3. Benchmark tests the legacy bare-verb path and its Personal Brave task is
   not isolated when the Bridge is live (#25–26) — the 4/5 verdict does not
   currently certify the documented surfaces.
4. Remove or document the `--personal` bare-verb path (#2, §3.2) to restore
   "surface by command name, never by flag".
5. Fix the visibility-default contradiction (`skills/danikuse-agent/SKILL.md:10`)
   and make `visibility` report stored state, not the querying call's flags.
