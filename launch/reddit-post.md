# Reddit r/ClaudeAI — Danikuse (draft)

Title: I split AI computer use into 3 explicit surfaces so it stops hijacking my browser

Body:

Problem I kept hitting: I ask an agent to do something on the web and it opens tabs in MY browser, steals focus, and I lose my place. Every tool I tried routes everything through one entry point and guesses.

What I built instead (open source, Apache-2.0): three commands, each a different surface.

- /danikuse-my works in my Brave through a small extension. It lists my tabs, opens new ones inactive, reads page text. No restart, no debug port. It reuses the tab I already have open instead of spawning new ones.
- /danikuse-agent is the agent's own browser on the same Brave engine, separate profile. Visible by default, `--hide` sends it fully to background.
- /danikuse-desktop drives Windows apps with a cursor I can watch.

Every action returns one JSON result plus screenshot and timing in a local folder. There's a five-task benchmark and it passes 5/5 on my machine.

Honest limits: captchas on live sites and long logged-in flows aren't proven yet, Windows only for now.

Demo that sold me it works: GitHub → repo → Gemini answers "привет" → YouTube, across my own tabs, in seconds.

Repo: github.com/dancho133/danikuse. Tear the approach apart in the comments — that's what it's posted for.
