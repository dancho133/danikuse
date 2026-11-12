# X thread — Danikuse launch (draft, EN)

1/ My agent kept opening MY browser to do its work. Tabs everywhere, screen jumping. So I built Danikuse: three separate doors for it — my Brave, its own browser, and my desktop. It picks the door by command name, never by guessing.

2/ The part I'm proud of: my Brave is driven through a small extension. No browser restart, no debug port left open, new tabs open inactive. It reads my tabs and acts in the one I'd already opened.

3/ Its own browser runs on the same Brave engine with a separate 10 MB profile. Say "in the background" and there's no window at all. Desktop apps get a visible cursor I can watch.

4/ Proof, not promises: a five-task benchmark (form fill, extraction, dev-loop screenshot, desktop app, personal-browser draft) passes 5/5. Install is ~156 MB, zero paid keys. Limits, stated plainly: live captchas and long logged-in flows aren't battle-tested yet.

5/ It's Apache-2.0, built on agent-browser + agent-desktop with Playwright in the loop. Public pages go through keyless Firecrawl. If you build browser agents, I'd like your review more than your star: github.com/dancho133/danikuse

Posted: https://x.com/danik13dev/status/2120983521552707945 (posts 2-3 reworded live, 1/4/5 verbatim)
