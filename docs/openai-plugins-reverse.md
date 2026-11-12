# What Danikuse learned from OpenAI's bundled plugins (reverse-engineering notes)

Studied 2026-11-12 from the local Codex install: `computer-use` and `browser` plugins v26.1106.51428 (proprietary; only behaviour and interface shape were studied, no code copied).

## How they actually work

- **Persistent session, not per-action processes.** Both run inside a persistent `node_repl` JS session. The agent keeps `browser` / `tab` / `targetWindow` handles in session state and reuses them; actions are method calls on those handles.
- **Observe → one action → refresh.** Computer Use enforces a two-cell loop: capture state (screenshot and/or accessibility tree), stop and inspect, do exactly one action, refresh immediately. Element indexes and screenshot IDs are valid only for the observation that produced them; on any failure the outcome is "unknown" and you re-observe instead of retrying.
- **Unique target rule.** Window selection must produce exactly one returned window before any input; handles are never reconstructed from guessed fields.
- **Visibility is a capability.** `browser.capabilities.get("visibility")` with `get()`/`set()`; guidance: keep work in the background unless the user asks to see it.
- **Personal browser via extension, not restart.** The browser plugin talks to the user's real Chrome/Edge/Brave through a browser extension + native host (extension IDs checked by scripts), and *claims* an already-open tab (`browser.user.claimTab`). No browser restart, no debug port left open.
- **Bot detection is a first-class report.** A tab capability reports one of a fixed reason enum (`captcha_failed`, `access_denied`, `challenge_loop`, `sign_in_blocked`, `add_to_cart_blocked`, `purchase_blocked`, `unexpected_bot_error`); the agent then tells the user and switches source instead of looping.
- **Confirmations are graded, not binary.** Four tiers: no confirmation, pre-approval works (must name specific data + destination), always confirm at action time (even if pre-approved), hand-off required (password change, barrier bypass). Desktop automation adds a hard deny list (no terminals, no auth dialogs, no Windows key, no security settings).

## What Danikuse adopted (v0.2)

- `danikuse agent visibility` plus a persisted `state.json` (visible/session), moving toward handle-like state instead of re-deriving it per call.
- `danikuse agent report-block <reason>` with the same reason vocabulary, emitting `status: "captcha-blocked"` in the JSON contract and the run folder.
- `danikuse my windows`: claim-tab-style view of the live Brave (titles only) with no CDP and no restart.
- Observe → one action → refresh and unique-window rules written into the agent and desktop surface skills, including "outcome unknown → re-observe".
- Graded confirmation tiers in the root SKILL.md, replacing the flat Confirm Mode list.

## Later adopted

- The extension + native-host bridge was built the same day: `extension/` (MV3, deterministic ID from its public key) + `host/` (native messaging host, registered by `host/install-bridge.ps1`). Personal Brave now prefers the bridge (`danikuse my tabs/open/eval`); CDP remains the fallback for verbs the bridge does not cover. See docs/architecture-audit.md for the current state.

## Not adopted

- Their native helpers (`@oai/sky`, browser service) are closed binaries; Danikuse keeps its open engines (agent-browser, agent-desktop).
