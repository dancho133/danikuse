// Danikuse Bridge: extension side. Connects to the native host and executes
// tab commands the CLI sends. Commands: listTabs, openTab, navigateTab,
// closeTab, typeOnTab, clickOnTab, submitForm, scanPage, uploadFile,
// captureScreenshot, waitForSelector, pageInfo.
let port = null;

function connect() {
  port = chrome.runtime.connectNative("com.danikuse.bridge");
  port.onMessage.addListener(onCommand);
  port.onDisconnect.addListener(() => {
    port = null;
    setTimeout(connect, 2000);
  });
}

// MV3 service workers idle-suspend after ~30s, which kills the native port
// and the host's HTTP server with it. A 30s alarm keeps the worker alive.
try {
  chrome.alarms.create("danikuse-keepalive", { periodInMinutes: 0.5 });
  chrome.alarms.onAlarm.addListener(() => {});
} catch {}

function waitForLoad(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); resolve(false); }, timeoutMs);
    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function findHttpTab(msg) {
  const tabs = await chrome.tabs.query({});
  if (msg.tabId) {
    const t = tabs.find((t) => t.id === msg.tabId);
    if (t) return t;
  }
  // Every window has its own active tab: prefer the focused window first,
  // never a random background window.
  const [focused] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (focused && /^https?:/.test(focused.url || "")) return focused;
  return tabs.find((t) => t.active && /^https?:/.test(t.url || ""))
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
      const loaded = await waitForLoad(tab.id);
      reply(true, { id: tab.id, title: tab.title, url: msg.url, loaded });
    } else if (msg.action === "navigateTab") {
      if (!msg.tabId && !msg.match) throw new Error("goto needs a tab: pass tabId or a match string");
      const tabs = await chrome.tabs.query({});
      const tab = (msg.tabId && tabs.find((t) => t.id === msg.tabId))
        || tabs.find((t) => (t.url || "").includes(msg.match || ""));
      if (!tab) throw new Error("no matching open tab to navigate");
      await chrome.tabs.update(tab.id, { url: msg.url, active: true });
      const loaded = await waitForLoad(tab.id);
      reply(true, { id: tab.id, url: msg.url, loaded });
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
          // Any text-entry field: inputs without type, email/password/search,
          // textareas, contenteditables. Hidden/file/check/radio excluded.
          const el = selector ? pick(selector) : (pick('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="range"]):not([type="color"]):not([type="image"])') || pick("textarea") || pick('div[contenteditable="true"]'));
          if (!el) return { error: "no text field found" };
          el.focus();
          if (el.isContentEditable) {
            document.execCommand("insertText", false, text);
          } else {
            // Native setter + real events: React/Vue controlled inputs update.
            const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
            if (setter) setter.call(el, text); else el.value = text;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
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
      reply(true, res?.result);
    } else if (msg.action === "submitForm") {
      const tab = await findHttpTab(msg);
      if (!tab) throw new Error("no http tab to submit on");
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selector, allowAuth) => {
          // Sign-out forms: always refused (we once logged the user out).
          // Auth/search forms: refused unless the human passed an explicit
          // selector, which proves intent.
          const hard = /logout|signout/i;
          const soft = /login|signin|search|auth|session/i;
          // getAttribute, never .action/.id: inputs named "action" clobber the property.
          const sig = (f) => ((f.getAttribute("action") || "") + "/" + (f.getAttribute("id") || "") + "/" + (f.getAttribute("name") || ""));
          const shown = (f) => { const r = f.getBoundingClientRect(); const s = getComputedStyle(f); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
          const safe = (f) => f && !hard.test(sig(f)) && !soft.test(sig(f)) && shown(f);
          const form = selector
            ? document.querySelector(selector)?.closest("form")
            : (["form#newlink", "form.submit-form", "form[action*='submit']"].map((s) => document.querySelector(s)).find(safe)
              || [...document.querySelectorAll("form")].find(safe));
          if (!form) return { error: "no safe visible form found" };
          if (hard.test(sig(form))) return { error: "refusing to submit sign-out form" };
          if (soft.test(sig(form)) && !allowAuth) return { error: "refusing to submit auth/search form without explicit selector" };
          if (typeof form.requestSubmit === "function") form.requestSubmit();
          else form.submit();
          return { submitted: String(sig(form)).slice(0, 120) };
        },
        args: [msg.selector || null, Boolean(msg.allowAuth)],
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
          // atob -> bytes, no fetch(data:): CSP connect-src can't block it.
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const blob = new Blob([bytes], { type: mime });
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
      reply(true, res?.result);
    } else if (msg.action === "captureScreenshot") {
      const tab = await findHttpTab(msg);
      if (!tab) throw new Error("no http tab to capture");
      // Captures the visible tab of the window, not tab.id itself: report it.
      // JPEG, not PNG: native messages cap at 1 MB and PNGs of 1080p exceed it.
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 70 });
      reply(true, { jpgBase64: dataUrl.split(",", 2)[1], windowId: tab.windowId, tabActive: tab.active });
    } else if (msg.action === "waitForSelector") {
      const tab = await findHttpTab(msg);
      if (!tab) throw new Error("no http tab to wait on");
      const timeout = Math.min(Number(msg.timeoutMs) || 15000, 55000);
      const t0 = Date.now();
      let found = null;
      while (Date.now() - t0 < timeout) {
        const [res] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (selector) => {
            const e = document.querySelector(selector);
            if (!e) return null;
            const r = e.getBoundingClientRect();
            return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
          },
          args: [msg.selector],
        });
        if (res?.result) { found = res.result; break; }
        await new Promise((r) => setTimeout(r, 400));
      }
      if (!found) throw new Error(`selector not found in ${timeout}ms: ${msg.selector}`);
      reply(true, found);
    } else if (msg.action === "pageInfo") {
      const tab = await findHttpTab(msg);
      if (!tab) throw new Error("no http tab to read");
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
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
