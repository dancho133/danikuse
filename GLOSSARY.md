# Danikuse

Danikuse is an open-source capability layer that gives an AI agent controlled use of a person's Brave browser and Windows desktop through three surface commands over one module. This glossary fixes the project's language; implementation details live in tickets and ADRs, not here.

## Language

**Danikuse**:
The whole capability layer: repo, installer, and the `/danikuse` router skill.
_Avoid_: plugin, extension, app

**Surface**:
One of the three user-facing entry commands, chosen by the user per task: `/danikuse-my` (Personal Brave), `/danikuse-agent` (Automation Browser), `/danikuse-desktop` (Desktop). The surface is chosen by command name, never by flag. Supersedes the earlier Single Entry rule, reversed by the user on 2026-11-12.
_Avoid_: mode, profile (for the entry choice)

**Confirm Mode**:
The default mode: the agent acts freely on reading, navigation, and drafts, and asks the user before sending, paying, publishing, or deleting.
_Avoid_: manual mode, safe mode

**Autonomous Mode**:
A mode the user switches on with an explicit instruction such as "do it fully yourself"; it applies to one task, waives intermediate confirmations, and expires when the task ends.
_Avoid_: autopilot, full-auto (as a permanent setting)

**Hard Stop**:
An action that stops the agent for user confirmation in every mode: paying money, changing passwords or access, irreversible deletion of someone else's data.
_Avoid_: blocker, warning

**Personal Brave**:
The user's own running Brave browser and profile, used only when a task is about the user personally (their sessions, their tabs).
_Avoid_: main browser, real Chrome

**Automation Browser**:
The agent's own lightweight browser: the installed Brave engine with a separate small profile, used by default for all automation.
_Avoid_: bot browser, second Chrome

**Run Folder**:
The local folder of one task execution holding its screenshots, JSON results, and timing; never committed to the repo.
_Avoid_: logs (as the whole concept), output

**Benchmark**:
The fixed set of five tasks that defines whether Danikuse works: form fill, structured extraction, dev loop with screenshot, desktop action, Personal Brave draft. Passing is at least 4 of 5 without intervention, each timed.
_Avoid_: demo, test run

**Captcha-Blocked**:
The honest terminal state of a task defeated by a captcha after all built-in layers; never reported as success.
_Avoid_: failed silently, done
