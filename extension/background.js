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
          const pick = (s) => [...document.querySelectorAll(s)].find((e) => { const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return false; const st = getComputedStyle(e); return st.visibility !== "hidden" && st.display !== "none" && st.opacity !== "0"; });
          const el = selector ? pick(selector) : (pick('div[contenteditable="true"]') || pick("textarea") || pick('input[type="text"]'));
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
          const visible = (e) => { const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return false; const s = getComputedStyle(e); return s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
          const els = (selector
            ? [...document.querySelectorAll(selector)]
            : [...document.querySelectorAll("button, a, input[type=submit]")]).filter(visible);
          const label = (e) => ((e.innerText || e.value || e.getAttribute("aria-label") || "").toLowerCase());
          const el = els.find((e) => label(e).includes(text.toLowerCase()));
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
    } else if (msg.action === "submitForm") {
      const tab = await findHttpTab(msg);
      if (!tab) throw new Error("no http tab to submit on");
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selector) => {
          const banned = /logout|login|signout|signin|search|auth|session/i;
          // getAttribute, never .action/.id: inputs named "action" clobber the property.
          const sig = (f) => ((f.getAttribute("action") || "") + "/" + (f.getAttribute("id") || "") + "/" + (f.getAttribute("name") || ""));
          const shown = (f) => { const r = f.getBoundingClientRect(); const s = getComputedStyle(f); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
          const safe = (f) => f && !banned.test(sig(f)) && shown(f);
          const form = selector
            ? document.querySelector(selector)?.closest("form")
            : (["form#newlink", "form.submit-form", "form[action*='submit']"].map((s) => document.querySelector(s)).find(safe)
              || [...document.querySelectorAll("form")].find(safe));
          if (!form) return { error: "no safe visible form found" };
          if (banned.test(sig(form))) return { error: "refusing to submit auth/search form" };
          if (typeof form.requestSubmit === "function") form.requestSubmit();
          else form.submit();
          return { submitted: String(sig(form)).slice(0, 120) };
        },
        args: [msg.selector || null],
      });
      if (res?.result?.error) throw new Error(res.result.error);
      reply(true, res?.result);
    } else if (msg.action === "scanPage") {
      const tab = await findHttpTab(msg);
      if (!tab) throw new Error("no http tab to scan");
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const els = [...document.querySelectorAll("button, a, input, select, textarea, [contenteditable=true], [role=button]")];
          const out = [];
          for (const e of els) {
            if (out.length >= 100) break;
            const r = e.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            const s = getComputedStyle(e);
            if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") continue;
            out.push({
              tag: e.tagName.toLowerCase(),
              text: ((e.innerText || e.value || e.getAttribute("aria-label") || e.placeholder || e.name || "").replace(/\s+/g, " ")).slice(0, 80),
              x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
            });
          }
          return out;
        },
      });
      reply(true, res?.result);
    } else if (msg.action === "uploadFile") {
      const tab = await findHttpTab(msg);
      if (!tab) throw new Error("no http tab to upload on");
      if (!msg.dataBase64 || msg.dataBase64.length > 20 * 1024 * 1024) throw new Error("file missing or over 15 MB");
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (selector, filename, mime, b64) => {
          const input = selector ? document.querySelector(selector) : document.querySelector('input[type="file"]');
          if (!input) return { error: "no file input found" };
          const blob = await (await fetch(`data:${mime};base64,${b64}`)).blob();
          const dt = new DataTransfer();
          dt.items.add(new File([blob], filename, { type: mime }));
          input.files = dt.files;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          return { uploaded: filename, size: blob.size };
        },
        args: [msg.selector || null, msg.filename, msg.mime || "application/octet-stream", msg.dataBase64],
      });
      if (res?.result?.error) throw new Error(res.result.error);
      await showCursor(tab.id, null);
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
