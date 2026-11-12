# Danikuse — agent rules

- Three surfaces: `/danikuse-my`, `/danikuse-agent`, `/danikuse-desktop` (skills/ folder) are the user-facing commands; the surface is chosen by command name, never by flag. One CLI module sits behind all three.
- Minimal code (ponytail ladder): need it? already here? stdlib? platform? installed dep? one line? Only then write the minimum, with one small check. Never cut validation, security, or accessibility.
- Every CLI command returns the JSON contract in SKILL.md. No "done" without `status: ok` plus evidence in the run folder.
- Vocabulary is GLOSSARY.md: Confirm Mode, Autonomous Mode, Hard Stop, Personal Brave, Automation Browser, Run Folder, Benchmark, Captcha-Blocked. Use those terms, not synonyms.
- Settled decisions live in the wayfinder map and ADRs when they exist; do not re-litigate engine, license, or mode choices per task.
- Runs, screenshots, profiles, and `.env` files are local-only. Nothing personal enters this repo.
