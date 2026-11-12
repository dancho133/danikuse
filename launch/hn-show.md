# Hacker News Show HN — Danikuse (draft)

Title: Show HN: Danikuse – three explicit surfaces for AI browser/desktop control

Body:

I got tired of agents that drive my personal browser as if it were theirs: tabs popping open, focus stolen mid-thought. Danikuse splits computer use into three surfaces the user picks by command name:

- my Brave, driven through a local extension (tab list, background opens, page text) with no restart and no debug port;
- an agent-owned browser on the installed Brave engine with a separate profile, headed or headless;
- Windows desktop apps through UI Automation with a visible cursor.

One CLI sits behind all three and returns one JSON object per action, with screenshots and timing in a local run folder. A five-task benchmark (form fill, structured extraction, dev-loop screenshot, desktop action, personal-browser draft) passes 5/5. Install is ~156 MB, no paid keys, Windows-first.

Underneath: Vercel's agent-browser/agent-desktop and Playwright. Public pages go through keyless Firecrawl. Apache-2.0: github.com/dancho133/danikuse

What I'd like reviewed: the surface split itself (is explicit choice better than the agent guessing?), and the extension bridge design. Known weak spots: live captchas, long authenticated flows.
