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
      reply(true, { id: updated.id, title: updated.title, url: updated.url });
    } else if (msg.action === "closeTab") {
      const tabs = await chrome.tabs.query({});
      const tab = (msg.tabId && tabs.find((t) => t.id === msg.tabId))
        || tabs.find((t) => (t.url || "").includes(msg.match || ""));
      if (!tab) throw new Error("no matching tab to close");
      await chrome.tabs.remove(tab.id);
      reply(true, { closed: tab.id, url: tab.url });
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
