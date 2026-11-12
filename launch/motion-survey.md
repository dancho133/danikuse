# Survey of Open-Source Motion & Video-Generation Repositories for Danikuse

**Author:** Research Analyst  
**Target Audience:** Senior Engineer, Danikuse Core Team  
**Date:** 2026-11-12  
**Target Deliverable:** 20-second Danikuse launch demo video and landing page motion graphics  
**Certified Platform:** Windows 10/11 x86_64, Node.js >= 18, Brave Browser, Apache-2.0 codebase  

---

## Executive Summary

This survey evaluates open-source motion graphics, video-generation, and UI animation repositories to identify the most practical, fast-rendering tooling for Danikuse's 20-second launch demo and landing page assets on Windows. Of the eight surveyed subjects, four are active video/motion renderers (`raea`, `pixelfx`, `explainroo`, `remotion-dev/skills`), two are motion analysis/recording frameworks (`Awwwards-mcp`, `reanimate`), one is a motion prompt taxonomy (`motion-prompt`), and two are non-visual tools included in the prompt whose scopes were verified as writing linting (`SlopMonster`) and binary/app reverse-engineering (`rea`). For an immediate, friction-free local demo on Windows, **`vincentsch/explainroo`** (curated from `awesome-claude-video-skills`) is the standout choice for full narrated video generation (2.0-minute local render with Kokoro TTS, Whisper alignment, dynamic camera moves, and app screen recording), paired with **`patch-gg/pixelfx`** for instant (<1s) procedural retro UI transitions, Hard Stop alert badges, and canvas animations. High-end React/GPU motion graphics can be powered by **`shinyobjectz/raea`** (FSL-1.1-ALv2, native DX12/Vulkan GPU renderer) or industry-standard **`remotion-dev/skills`** (Remotion License, CPU/Puppeteer).

---

## Ranking by Fit for Fast Local Demo on Windows

Repos are ranked primarily by their ability to generate motion/video assets locally on Windows with minimal friction, fast execution time, zero external API costs, and permissive licensing aligned with Danikuse.

| Rank | Repository / Tool | Primary Output | Render / Turnaround Time | Windows Friction | License | Best Danikuse Role |
|:---:|:---|:---|:---:|:---:|:---:|:---|
| **1** | **`vincentsch/explainroo`** *(Curated #1)* | Full Narrated Video (MP4) | ~2.0 min | None (Node.js + Chrome + ffmpeg) | MIT | Complete 20s demo video assembly with local voiceover & zooms |
| **2** | **`patch-gg/pixelfx`** | Pixel Art VFX / Transitions | Instant (<1 s) | None (Pure Node.js Canvas / JS) | MIT | Terminal glitch wipes, "Hard Stop" alert badge, benchmark pass burst |
| **3** | **`shinyobjectz/raea`** | Video, Motion Graphics, 3D | ~1 s (GPU) | Low (x64 installer, needs DX12/Vulkan) | FSL-1.1-ALv2 | High-framerate 60fps React/TSX compositor for browser mockups |
| **4** | **`remotion-dev/skills`** *(Curated #2)* | React Video / Motion Graphics | ~4.5 min | Low (Node.js + Puppeteer) | Remotion (Free <=3 empl.) | Battle-tested React timeline animation of browser DOM actions |
| **5** | **`feitangyuan/onetake`** *(Curated #3)* | Single-Take Continuous Video | ~8.5 min | Moderate (Python + Playwright + ffmpeg) | PolyForm Noncommercial | Unbroken camera flight from `/danikuse` prompt to DOM click |
| **6** | **`showheyohtaki/motion-prompt`** | Motion Prompt Taxonomy | Instant (Static) | None (Browser gallery / Markdown) | MIT | Directing camera moves & easing vocabulary in demo prompts |
| **7** | **`INSANE0777/Awwwards-mcp`** | Motion Sheets, WebM Capture | 10–30 s | Low (Node.js MCP + Playwright) | MIT | Recording award-winning landing pages to extract GSAP timelines |
| **8** | **`NiazMorshed2007/reanimate`** | Re-engineered Web Animation | 15–60 min | High (Explicitly untested on Windows, needs Bun) | MIT | Reverse-engineering CSS/Framer Motion cards from references |
| **9** | **`ItsssssJack/SlopMonster`** | Text Linting Reports | Instant (<100 ms) | None (Python 3 stdlib) | MIT | Linting voiceover script & demo text to avoid AI marketing slop |
| **10** | **`morluto/rea`** | Binary / App RE Reports | Variable | Moderate (Node.js MCP, native tools) | MIT | Inspecting target desktop app UI hierarchies for demo scenario |

---

## Detailed Repository Profiles

### 1. `shinyobjectz/raea`
- **Source:** [https://github.com/shinyobjectz/raea](https://github.com/shinyobjectz/raea)
- **Primary Evidence:** `README.md` lines 18–38, 52–63, 118–125; `LICENSE` (FSL-1.1-ALv2).
- **What it generates:** Videos (MP4), motion graphics, 2D/3D scenes, Gaussian splats, and mini-games. Compositions are written in React and TypeScript and rendered via Bevy 0.20 and WGSL shaders. Includes a built-in quality auditor (`raea check`) that flags clipped text, low contrast, and loudness anomalies.
- **Input format:** React/TSX component code importing `raea` primitives (`<Composition>`, `<AbsoluteFill>`, `interpolate`, `useCurrentFrame`), styled with Tailwind CSS or SVG, compiled via CLI (`raea render <file.tsx> -o <out.mp4>`).
- **Runtime cost:** Local GPU accelerated (DirectX 12 or Vulkan on Windows x86_64, Metal on macOS). Renders 90 frames in ~1 second. Needs MSVC C++ Redistributable (x64) and current graphics drivers. 100% offline; zero telemetry or API token cost (`RAEA_OFFLINE=1` supported).
- **License:** Functional Source License 1.1, ALv2 Future License (`FSL-1.1-ALv2`, copyright Shane Murphy). Free to use, modify, and distribute for any purpose except creating a competing video rendering engine; automatically converts to Apache-2.0 two years post-release.
- **Windows compatibility:** Certified first-class support in v0.1.1 via PowerShell one-liner (`irm https://raea.io/install.ps1 | iex`).
- **Concrete 20-second Danikuse demo role:** Render a sleek, 60fps high-resolution motion graphic sequence showing a 3D isometric Windows desktop frame with a floating Brave window, animating Danikuse's `/danikuse-agent` prompt execution, DOM element targeting, and JSON result drawer in ~1 second local render time.

---

### 2. `patch-gg/pixelfx`
- **Source:** [https://github.com/patch-gg/pixelfx](https://github.com/patch-gg/pixelfx)
- **Primary Evidence:** `README.md` lines 5–25, 41–58, 88–105, 178–184; `package.json`.
- **What it generates:** 244 procedural pixel art visual effects, animations, UI badges, sprite sheets (PNG + Aseprite JSON), animated GIFs, and MP4 clips. Categories include transitions (glitch wipe, blinds, iris), UI (achievements, combos, countdowns), impacts, sci-fi (EMP, force field, glitch), and character acts.
- **Input format:** JavaScript modules exporting pure mathematical functions `draw(p, t, o)` or particle simulations `create(o)` / `act`. Rendered via Node CLI (`node tools/render.mjs <category>/<name> --gif/--sheet/--mp4`) or imported into HTML5 Canvas / WebGL.
- **Runtime cost:** Pure CPU / Canvas execution in Node.js or browser. Zero GPU requirements. Renders single effects in milliseconds; completely free, local, and dependency-free.
- **License:** MIT License (code and effects). Note: `gallery/fonts` contains Patch Pixel font which is proprietary to Patch and excluded.
- **Windows compatibility:** 100% native compatibility. Runs directly in standard Node.js on Windows with no native build chains.
- **Concrete 20-second Danikuse demo role:** Provide stylized developer-centric micro-animations: a retro glitch transition wiping between Personal Brave and Automation Browser views, a pulsating red "Hard Stop" barrier badge when sensitive operations are attempted, and a particle burst when the 5-task benchmark reports 5/5 passed.

---

### 3. `ItsssssJack/SlopMonster` (Writing only, scope confirmed)
- **Source:** [https://github.com/ItsssssJack/SlopMonster](https://github.com/ItsssssJack/SlopMonster)
- **Primary Evidence:** `README.md` lines 1–32, 105–124; `tools/deslop.py` lines 1–80.
- **Scope Confirmation:** **Confirmed writing/copy linter only.** Does not generate video, motion graphics, SVG animations, or 3D graphics. It inspects English text, Markdown, and HTML for five categories of repetitive AI writing patterns (vocabulary tells like "delve"/"seamless", empty contrasts like "not just X, but Y", punctuation density, 3-item list structures, unverified proof metrics) and outputs a 0–5 score.
- **Input format:** Text strings via CLI flag (`--text "..."`), Markdown files, or HTML files passed to Python script (`python3 tools/deslop.py <file>`).
- **Runtime cost:** Zero GPU, zero external API. Executes in Python 3 standard library in under 50 milliseconds.
- **License:** MIT License.
- **Windows compatibility:** 100% native. Runs immediately with any Windows Python 3 install.
- **Concrete 20-second Danikuse demo role:** Run in pre-production / CI (`python tools/deslop.py launch/demo-script.md`) to lint and cleanse the 20-second voiceover narration script and on-screen caption text, ensuring Danikuse presents an authentic, punchy developer voice free of generic AI promotional clichés.

---

### 4. `morluto/rea` (Reverse engineering only, scope confirmed)
- **Source:** [https://github.com/morluto/rea](https://github.com/morluto/rea)
- **Primary Evidence:** `README.md` lines 15–35, 100–140, 215–235; npm package `rea-agents`.
- **Scope Confirmation:** **Confirmed software/binary reverse-engineering MCP toolkit only.** Does not generate video, motion graphics, or visual animation. It provides tools for AI coding agents to deconstruct native binaries (via Ghidra, Hopper, IDA), inspect Electron/Node ASAR packages, trace network protocols, and capture static application snapshots.
- **Input format:** File paths to binaries (PE/ELF/Mach-O), extracted JavaScript/Electron directories, or natural language prompts via MCP interface (`npx rea-agents setup`).
- **Runtime cost:** Local CPU and memory. Requires external native decompilers (Hopper/Ghidra/IDA) for native analysis; static JS analysis runs on Node.js.
- **License:** MIT License.
- **Windows compatibility:** Windows supported via Node.js CLI/MCP; native binary providers require local Windows configuration.
- **Concrete 20-second Danikuse demo role:** Use in demo preparation to reverse-engineer an opaque Windows desktop application or Electron bundle, extracting the exact internal selectors, window titles, and IPC endpoints that Danikuse's `/danikuse-desktop` surface then autonomously automates during the 20-second screen recording.

---

### 5. `NiazMorshed2007/reanimate`
- **Source:** [https://github.com/NiazMorshed2007/reanimate](https://github.com/NiazMorshed2007/reanimate)
- **Primary Evidence:** `README.md` lines 15–45, 130–165; `SKILL.md`.
- **What it generates:** Web motion graphics and UI animation code (CSS, Framer Motion, GSAP, SVG, three.js, WebGL2/WebGPU) reverse-engineered from reference animations, along with frame-by-frame contact comparison sheets and verification videos.
- **Input format:** Reference website URL, screen recording (`.mp4`, `.mov`), `.gif`, or `.lottie` file, directed by Claude Code skill prompts (`/reanimate the hero entrance on https://example.com into components/Hero.tsx`).
- **Runtime cost:** Local execution requiring Bun runtime (>=1.1), headless Playwright Chromium (SwiftShader CPU emulation or hardware GPU), and static ffmpeg (~250 MB total download). Zero API token cost.
- **License:** MIT License.
- **Windows compatibility:** **High friction / Untested.** `README.md` explicitly notes: *"Needs Bun 1.1 or later, on macOS or Linux (Windows is untested)."*
- **Concrete 20-second Danikuse demo role:** Extract and clone high-polish micro-interactions (such as the Vercel toolbar hover glow or Clerk feature card flip) from top developer landing pages, converting them into matching React/Tailwind components for the Danikuse launch site or demo video title cards.

---

### 6. `INSANE0777/Awwwards-mcp`
- **Source:** [https://github.com/INSANE0777/Awwwards-mcp](https://github.com/INSANE0777/Awwwards-mcp)
- **Primary Evidence:** `README.md` lines 20–55, 115–160; tools `record_site_motion`, `get_motion_dna`, `analyze_scroll_map`.
- **What it generates:** Motion Evidence Sheets (`sheet.html`, `motion-sheet.md`), inline filmstrip JPEGs, recorded `.webm` motion-through videos of live URLs, runtime Motion DNA fingerprints (easing vocab, ScrollTrigger stats), and GSAP animation timelines.
- **Input format:** Natural language MCP queries or tool parameters specifying site slugs or live URLs (e.g. `record_site_motion(url="https://...", viewport="desktop")`).
- **Runtime cost:** Local Node.js MCP server using Playwright Chromium and `ffmpeg-static`. No external API keys required; reads local SQLite/FTS5 cache and queries Awwwards public endpoints.
- **License:** MIT License.
- **Windows compatibility:** Fully functional on Windows with Node.js and Playwright.
- **Concrete 20-second Danikuse demo role:** Capture reference screen motion from award-winning landing pages and extract their exact GSAP tween timing, scroll scrub ratios, and easing curves to construct a professional motion choreography specification for Danikuse's landing page hero banner.

---

### 7. `showheyohtaki/motion-prompt`
- **Source:** [https://github.com/showheyohtaki/motion-prompt](https://github.com/showheyohtaki/motion-prompt)
- **Primary Evidence:** `README.md` lines 10–35, 70–110; `packs/` directories; `LICENSE` (MIT).
- **Contradiction Note:** Task specified `showheyotaki/motion-prompt` (missing 'h'); primary source verified as `showheyohtaki/motion-prompt` (Shohei Ohtaki).
- **What it generates:** A curated visual taxonomy and prompt library of 192 named motion moves across 8 packs (motion graphics, camera transitions, UI components, landing page effects, lighting). Generates animated GIF previews, video references, and standardized prompt syntax across 5 languages.
- **Input format:** Text prompt tokens citing standardized move names and numbers (e.g., `#005 mask reveal`, `#032 slow dolly in`, `#049 cursor click`), or web gallery visual picker sending JSON picks to AI agents (`npx skills add showheyohtaki/motion-prompt`).
- **Runtime cost:** Zero compute cost. Operates as static markdown docs, local web gallery, or LLM system prompt instructions.
- **License:** MIT License (Copyright 2026 Shohei Ohtaki).
- **Windows compatibility:** 100% platform-agnostic (web browser and text).
- **Concrete 20-second Danikuse demo role:** Serve as the exact motion design lexicon in Danikuse's demo script prompt, allowing the author to specify precise camera movements (`#032 slow dolly in on terminal`), entrance dynamics (`#005 mask reveal for JSON contract`), and pacing without ambiguous hand-waving descriptions.

---

### 8. Curated Top 3 from `zhuyansen/awesome-claude-video-skills`
- **Source:** [https://github.com/zhuyansen/awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills)
- **Primary Evidence:** `README.md` lines 12–28 ("Which one to install"), 65–110 ("Tested end to end" benchmark table); `LICENSE` (CC0-1.0).
- **Benchmark Context:** The awesome list benchmarked 16 agent-driven video skills on 2026-10-11 generating a 15-second promo video with 5 copy lines at 1080p30. The maintainers specifically highlighted three standout tools:

#### 8A. `vincentsch/explainroo` *(Curated #1: Editor's Gold Pick)*
- **Source:** [https://github.com/vincentsch/explainroo](https://github.com/vincentsch/explainroo)
- **Primary Evidence:** `README.md` lines 1–60, 110–145; `package.json`.
- **What it generates:** Complete, fully-produced explainer/demo videos (MP4), complete with synchronized open-source voiceover (Kokoro TTS), subtitle word alignment (Whisper), canvas animations (Rough.js, Lucide icons), dynamic camera panning/zooms, procedurally mixed background music, sound effects, and QA validation reports.
- **Input format:** Markdown narration script (`script.md`) + JavaScript drawing instructions (`scenes.js`), or natural language prompt via CLI (`npx --yes explainroo`).
- **Runtime cost:** 100% free and local. Runs on Node.js, headless Chrome, local Python Kokoro TTS (82M params), Whisper, and ffmpeg. Fastest recorded runtime in the benchmark: **2.0 minutes** for a finished 15-second promo.
- **License:** MIT License.
- **Windows compatibility:** Fully supported on Windows via Node.js / npx.
- **Concrete 20-second Danikuse demo role:** **The primary recommended generator for the entire Danikuse launch video.** Danikuse executes `explainroo record` to capture its real terminal CLI and Brave browser automation, writes a 20-second voiceover in `script.md` explaining Confirm Mode vs Autonomous Mode, and lets `explainroo` assemble the MP4 with camera zooms, synchronized captions, and local voiceover in under 3 minutes.

#### 8B. `remotion-dev/skills` *(Curated #2: Premier React Video Ecosystem)*
- **Source:** [https://github.com/remotion-dev/skills](https://github.com/remotion-dev/skills) (monorepo: `remotion-dev/remotion`)
- **Primary Evidence:** `README.md` lines 10–45; `package.json`; `LICENSE.md` in `remotion-dev/remotion`.
- **What it generates:** Programmatic React-rendered videos (MP4/WebM), motion graphics, animated charts, captions, and title cards. Includes live preview via Remotion Studio and comprehensive agent skills (`/remotion-create`, `/remotion-render`).
- **Input format:** React/TypeScript components utilizing Remotion APIs (`Composition`, `interpolate`, `spring`, `useCurrentFrame`), styled with CSS/Tailwind.
- **Runtime cost:** Local CPU/Puppeteer rendering. Benchmark runtime: **4.5 minutes**. Free for individuals and companies with up to 3 employees; commercial license required for companies with 4+ employees.
- **License:** Remotion License (`NOASSERTION` / Custom). Free tier covers personal and small commercial use (<=3 employees); commercial tier requires paid license.
- **Windows compatibility:** Outstanding. Mature cross-platform support across Windows, macOS, and Linux.
- **Concrete 20-second Danikuse demo role:** Build an interactive, pixel-perfect animation of the Danikuse JSON response contract drawer (`{status: "ok", browser: "brave", durationMs: 1420}`), animating each key-value pair appearing in sync with terminal typing before exporting to high-bitrate MP4.

#### 8C. `feitangyuan/onetake` *(Curated #3: Single-Take Visual Continuity)*
- **Source:** [https://github.com/feitangyuan/onetake](https://github.com/feitangyuan/onetake)
- **Primary Evidence:** `README.md` lines 15–50, 95–135; `LICENSE` (PolyForm Noncommercial 1.0.0).
- **What it generates:** Continuous single-take product launch films (MP4, up to 4K60) where scenes morph into each other without hard cuts, featuring realistic motion blur (180° shutter emulation), HTML-rebuilt UI mockups, and automated continuity verification via `probe.py`.
- **Input format:** Concept prompts, beat sheets, and UI screenshots rebuilt in HTML via Claude Code / Codex skill (`~/.claude/skills/onetake`).
- **Runtime cost:** Local Python 3 (Playwright, NumPy, SciPy, Pillow, matplotlib) + Node.js + ffmpeg. Benchmark runtime: **8.5 minutes**.
- **License:** PolyForm Noncommercial 1.0.0 (Free for personal/noncommercial use; commercial Pro license is $79 one-time).
- **Windows compatibility:** Good compatibility, though requires Python Playwright + Node environment setup.
- **Concrete 20-second Danikuse demo role:** Execute an unbroken 20-second visual flight: the camera pushes into the Danikuse terminal cursor as it runs `danikuse open`, morphs the terminal window directly into the Brave browser address bar, zooms into the web page form, triggers a red Hard Stop ripple on a payment field, and pulls back to reveal the 5/5 benchmark badge.

---

## Technical Comparison Matrix

| Repository | Primary Output | Input Paradigm | Compute / Runtime Engine | Turnaround Time (15–20s) | License | Windows Native Score (1–10) |
|:---|:---|:---|:---|:---:|:---|:---:|
| **`vincentsch/explainroo`** | Full Narrated Video (MP4) | `script.md` + `scenes.js` / CLI | Local Node + Chrome + Kokoro TTS + Whisper | **2.0 min** | MIT | **10/10** |
| **`patch-gg/pixelfx`** | Pixel Art VFX / Transitions | JS functions `draw(p,t,o)` | Local Node.js Canvas / CPU | **< 1 sec** | MIT | **10/10** |
| **`shinyobjectz/raea`** | Video / 3D / Motion Graphics | React / TSX components | Local GPU (DirectX 12 / Vulkan / Bevy) | **~1 sec** | FSL-1.1-ALv2 | **8/10** |
| **`remotion-dev/skills`** | React Video / Motion Graphics | React / TSX + Remotion CLI | Local Node.js + Puppeteer (Chrome) | **4.5 min** | Remotion License | **9/10** |
| **`feitangyuan/onetake`** | Single-Take Continuous MP4 | Concept Beat Sheet + HTML UI | Local Python + Playwright + ffmpeg | **8.5 min** | PolyForm Noncommercial | **7/10** |
| **`showheyohtaki/motion-prompt`**| Motion Vocabulary & Samples | Prompt Tokens / Web Picker | Platform-agnostic static docs / gallery | **Instant** | MIT | **10/10** |
| **`INSANE0777/Awwwards-mcp`** | Motion Filmstrips & WebM | MCP Prompts / Site URLs | Local Node.js MCP + Playwright | **15–30 sec** | MIT | **9/10** |
| **`NiazMorshed2007/reanimate`**| Re-engineered Web Code | Reference Videos / URLs | Local Bun + Playwright + SwiftShader | **15–60 min** | MIT | **3/10** (Untested) |
| **`ItsssssJack/SlopMonster`** | Text Slop Audit Reports | Plain Text / Markdown / HTML | Local Python 3 Standard Library | **< 50 ms** | MIT | **10/10** (Text only) |
| **`morluto/rea`** | Software Architecture Reports| Native Binaries / Electron ASAR| Local Node.js MCP + Decompilers | Variable | MIT | **7/10** (RE only) |

---

## 20-Second Danikuse Launch Demo: Storyboard & Tooling Blueprint

Danikuse requires a crisp, high-signal developer demo showcasing its core value proposition: **one command giving AI agents controlled use of Brave and Windows desktop with explicit safety modes and verifiable JSON evidence**.

```
[00:00 - 00:04] Hook: The Fragmentation & Solution
├── Visual: Split screen showing scattered browser drivers and scrapers collapsing into `danikuse`.
├── Audio Voiceover (via explainroo / Kokoro): "Browser agents and desktop scrapers are fragmented. Danikuse unifies them."
└── Tooling: explainroo scene composition + motion-prompt #005 mask reveal.

[00:04 - 00:09] The Engine: Automation Browser vs Personal Brave
├── Visual: Fast launch of lightweight Automation Browser profile (~10 MB), then switching to Personal Brave over bridge.
├── Motion: pixelfx retro glitch wipe transition separating the two browser states.
└── Audio Voiceover: "One light automation browser for daily tasks; your personal Brave attached with no debug port."

[00:09 - 00:14] The Safety Model: Confirm Mode & Hard Stop
├── Visual: Agent navigates form. Read and extract pass freely. An attempted payment field halts with an emphatic red barrier.
├── Motion: pixelfx animated Hard Stop shield badge with light buffer glow.
└── Audio Voiceover: "Confirm Mode asks before mutating. Payments and passwords hit an instant Hard Stop."

[00:14 - 00:17] Verifiable Evidence: The Benchmark & JSON Contract
├── Visual: Terminal displays `npm run benchmark` passing 5 of 5 tasks; JSON response card slides out with run evidence.
├── Motion: raea / remotion animated JSON tree reveal with glowing property keys.
└── Audio Voiceover: "Every action returns one verifiable JSON contract. No evidence, no done."

[00:17 - 00:20] Call to Action & Install
├── Visual: PowerShell command `irm https://.../install.ps1 | iex` pastes and executes; Apache-2.0 badge and GitHub logo.
├── Audio: Subtle musical resolve and final branding chord.
└── Tooling: explainroo automated audio ducking and MP4 export.
```

---

## Recommended Danikuse Stack Selection

1. **Primary Video Producer:** Use **`vincentsch/explainroo`**. It solves video, local voice generation (Kokoro), subtitle alignment (Whisper), terminal screen capture (`explainroo record`), and automated quality verification in one unified, MIT-licensed package on Windows that renders in 2 minutes.
2. **Visual Micro-FX & Transitions:** Incorporate **`patch-gg/pixelfx`** for retro terminal accents, transition wipes, and safety alert badges without adding heavy video dependencies.
3. **Choreography & Prompt Language:** Use **`showheyohtaki/motion-prompt`** to standardize all animation instructions given to coding agents drafting scenes.
4. **Copy Quality Gate:** Run **`ItsssssJack/SlopMonster`** in CI on `launch/demo-script.md` to ensure voiceover copy remains clear, direct, and free of AI marketing fluff.
