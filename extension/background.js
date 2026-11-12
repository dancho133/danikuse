// Danikuse Bridge: extension side. Connects to the native host and executes
// tab commands the CLI sends. Commands: listTabs, openTab, evalOnTab.
let port = null;

function connect() {
  port = chrome.runtime.connectNative("com.danikuse.bridge");
  port.onMessage.addListener(onCommand);
  port.onDisconnect.addListener(() => {
    port = null;
    setTimeout(connect, 2000);
  });
}

// Danikuse's own cursor: an overlay inside the page. It never touches the
// user's physical cursor; it only shows where the agent is acting.
async function showCursor(tabId, point) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (p) => {
        document.getElementById("danikuse-cursor")?.remove();
        const el = document.createElement("div");
        el.id = "danikuse-cursor";
        el.textContent = "Danikuse";
        el.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;background:#b3401e;color:#fff;font:600 11px system-ui;padding:4px 8px 4px 22px;border-radius:999px;transition:all .6s ease;opacity:0;";
        const dot = document.createElement("div");
        dot.style.cssText = "position:absolute;left:6px;top:50%;width:10px;height:10px;margin-top:-5px;border-radius:50%;background:#fff;";
        el.appendChild(dot);
        el.style.left = "24px";
        el.style.top = "24px";
        document.documentElement.appendChild(el);
        requestAnimationFrame(() => {
          el.style.opacity = "1";
          if (p) { el.style.left = Math.min(p.x, innerWidth - 110) + "px"; el.style.top = Math.min(p.y, innerHeight - 40) + "px"; }
        });
        setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 700); }, 2600);
      },
      args: [point || null],
    });
  } catch {}
}

async function findHttpTab(msg) {
  const tabs = await chrome.tabs.query({});
  return (msg.tabId && tabs.find((t) => t.id === msg.tabId))
    || tabs.find((t) => t.active && /^https?:/.test(t.url || ""))
    || tabs.find((t) => /^https?:/.test(t.url || ""));
}

async function onCommand(msg) {
  const reply = (ok, result, error) => {
    try { port.postMessage({ id: msg.id, ok, result, error }); } catch {}
  };
  try {
    if (msg.action === "listTabs") {
      const tabs = await chrome.tabs.query({});
      reply(true, tabs.map((t) => ({ id: t.id, title: t.title, url: t.url, active: t.active, windowId: t.windowId })));
    } else if (msg.action === "openTab") {
      const tab = await chrome.tabs.create({ url: msg.url, active: Boolean(msg.active) });
      reply(true, { id: tab.id, title: tab.title, url: tab.url });
    } else if (msg.action === "navigateTab") {
      const tabs = await chrome.tabs.query({});
      const tab = (msg.tabId && tabs.find((t) => t.id === msg.tabId))
        || tabs.find((t) => (t.url || "").includes(msg.match || "github.com"));
      if (!tab) throw new Error("no matching open tab to navigate");
      const updated = await chrome.tabs.update(tab.id, { url: msg.url, active: true });
      await showCursor(tab.id, null);
      reply(true, { id: updated.id, title: updated.title, url: updated.url });
    } else if (msg.action === "closeTab") {
      const tabs = await chrome.tabs.query({});
      const tab = (msg.tabId && tabs.find((t) => t.id === msg.tabId))
        || tabs.find((t) => (t.url || "").includes(msg.match || ""));
      if (!tab) throw new Error("no matching tab to close");
      await chrome.tabs.remove(tab.id);
      reply(true, { closed: tab.id, url: tab.url });
    } else if (msg.action === "typeOnTab") {
      const tab = await findHttpTab(msg);
      if (!tab) throw new Error("no http tab to type on");
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text, submit, selector) => {
          const el = selector ? document.querySelector(selector) : document.querySelector('div[contenteditable="true"], textarea, input[type="text"]');
          if (!el) return { error: "no text field found" };
          el.focus();
          document.execCommand("insertText", false, text);
          const r = el.getBoundingClientRect();
          if (submit) {
            setTimeout(() => {
              const btn = [...document.querySelectorAll("button")].find((b) => /send|отправ/i.test(b.getAttribute("aria-label") || b.textContent || ""));
              btn?.click();
            }, 600);
          }
          return { typed: text, x: r.left + r.width / 2, y: r.top + r.height / 2 };
        },
        args: [msg.text, Boolean(msg.submit), msg.selector || null],
      });
      if (res?.result?.error) throw new Error(res.result.error);
      await showCursor(tab.id, res?.result);
      reply(true, res?.result);
    } else if (msg.action === "clickOnTab") {
      const tab = await findHttpTab(msg);
      if (!tab) throw new Error("no http tab to click on");
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text, selector) => {
          const els = selector
            ? [...document.querySelectorAll(selector)]
            : [...document.querySelectorAll("button, a, input[type=submit]")];
          const el = els.find((e) => (e.innerText || e.value || "").toLowerCase().includes(text.toLowerCase()));
          if (!el) return { error: `no clickable element matching: ${text}` };
          el.scrollIntoView({ block: "center" });
          el.click();
          const r = el.getBoundingClientRect();
          return { clicked: (el.innerText || el.value || "").slice(0, 60), x: r.left + r.width / 2, y: r.top + r.height / 2 };
        },
        args: [msg.text || "", msg.selector || null],
      });
      if (res?.result?.error) throw new Error(res.result.error);
      await showCursor(tab.id, res?.result);
      reply(true, res?.result);
    } else if (msg.action === "pageInfo") {
      let tabId = msg.tabId;
      if (!tabId) {
        const tabs = await chrome.tabs.query({});
        tabId = (tabs.find((t) => t.active && /^https?:/.test(t.url || "")) || tabs.find((t) => /^https?:/.test(t.url || "")))?.id;
      }
      if (!tabId) throw new Error("no http tab to read");
      const [res] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({ title: document.title, url: location.href, text: (document.body?.innerText || "").slice(0, 4000) }),
      });
      reply(true, res?.result);
    } else {
      throw new Error(`unknown action: ${msg.action}`);
    }
  } catch (e) {
    reply(false, null, String(e));
  }
}

connect();
