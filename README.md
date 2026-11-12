# Danikuse

One command that gives an AI agent controlled use of your Brave browser and your Windows desktop.

**Tell your AI agent:** "Install Danikuse from this repo: run `install.ps1`, then read `SKILL.md` and use `/danikuse` as the only entry point for browser and desktop work."

## Why

Browser agents, desktop agents, scrapers, and test drivers all exist separately. Danikuse wires the proven ones into a single route with a single safety model and a single evidence format:

- **Core:** [agent-browser](https://github.com/vercel-labs/agent-browser) + [agent-desktop](https://github.com/vercel-labs/agent-desktop), both driving the Brave you already have installed. No second Chromium download.
- **Dev loop:** the agent opens the site it just built, screenshots it, and looks at its own work.
- **Web reading:** agent-browser extraction first; keyless Firecrawl (scrape/search/parse) only for public stateless pages.
- **One JSON contract:** every action returns `{status, browser, action, screenshot, error, next, durationMs, runDir}`. No evidence, no "done".

## Safety model

- **Confirm Mode** (default): reading, navigation, and drafts are free; submit, pay, publish, and delete ask first.
- **Autonomous Mode**: only on your explicit "do it fully yourself", for one task. Paying money, changing passwords or access, and irreversible deletion are a **Hard Stop** in every mode.
- Two browsers: a light **Automation Browser** (Brave engine, separate profile, ~10 MB) by default, and your **Personal Brave** only for tasks about you, attached over a localhost CDP port for that task only.
- Runs and screenshots stay on your machine. Nothing personal is ever committed here.

## Install (Windows, certified)

```powershell
./install.ps1
node ./bin/danikuse.mjs doctor
npm run benchmark
```

Requires Node.js >= 18 and Brave. Install size is about 156 MB for both engines, inside the project's 500 MB budget; the automation profile starts around 10 MB. macOS/Linux are not certified in v0.1.

## Does it work?

That is a measured claim, not a slogan: `npm run benchmark` runs five tasks (form fill and submit, structured extraction, dev-loop screenshot, a desktop app action, a Personal Brave draft that is never submitted) against local fixtures and writes a timed report. v0.1 passes at 4 of 5 or better.

## Layout

- `bin/danikuse.mjs` — the CLI every route goes through
- `SKILL.md` + `skills/` — the surface skills: `/danikuse-my`, `/danikuse-agent`, `/danikuse-desktop`
- `extension/` + `host/` — Danikuse Bridge: a Brave extension and native messaging host, so Personal Brave works with no restart and no debug port. Register the host with `host/install-bridge.ps1`, then load `extension/` once via `brave://extensions` (Developer mode → Load unpacked)
- `dsh-commands/` — DeepSeek Harness slash-command bundle that registers the four `/danikuse*` commands in the chat input
- `AGENTS.md` — project rules, `GLOSSARY.md` — the fixed vocabulary
- `scripts/benchmark.mjs` — the five-task benchmark; `scripts/secret-scan.mjs` — secret/personal-data scan over tracked files (run `npm run scan` before pushing)

Optional layers with their own decisions, deliberately not in the core: Skyvern (AGPL, external HTTP only), captcha solver services, paid Firecrawl.

License: Apache-2.0. Russian version: [README.ru.md](README.ru.md).
