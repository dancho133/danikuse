// Danikuse stealth init script for agent-browser (--init-script).
// Runs before page JS on every agent-surface navigation. Removes the cheap
// automation tells (webdriver flag, HeadlessChrome UA, empty plugins) and
// keeps every override native-looking (Function.prototype.toString proxy).
// Not a bot-evasion guarantee — honest layer, tested against bot.sannysoft.com.
(() => {
  // Every patched function must still print as native code.
  const nativeStrings = new Map();
  const origToString = Function.prototype.toString;
  Function.prototype.toString = function () {
    if (nativeStrings.has(this)) return nativeStrings.get(this);
    return origToString.call(this);
  };
  const mask = (fn, fake) => { try { nativeStrings.set(fn, fake); } catch {} return fn; };

  const define = (obj, prop, value, fakeGet) => {
    try {
      const getter = mask(() => value, fakeGet || `function get ${prop}() { [native code] }`);
      Object.defineProperty(obj, prop, { get: getter, configurable: true });
    } catch {}
  };

  // 1. navigator.webdriver must be false (absent in real browsers).
  define(Navigator.prototype, "webdriver", false);

  // 2. Plausible navigator surface + clean UA (no HeadlessChrome token).
  try {
    define(Navigator.prototype, "userAgent",
      navigator.userAgent.replace(/HeadlessChrome\/[\d.]+/, "Chrome/157.0.0.0"));
  } catch {}
  define(Navigator.prototype, "languages", ["en-US", "en"]);
  define(Navigator.prototype, "language", "en-US");
  define(Navigator.prototype, "hardwareConcurrency", 8);
  define(Navigator.prototype, "deviceMemory", 8);
  define(Navigator.prototype, "maxTouchPoints", 0);
  define(Navigator.prototype, "platform", "Win32");

  // 3. Non-empty plugins that quack like a real PluginArray.
  try {
    const fakePlugin = (name, file) => {
      const p = { name, filename: file, description: "", length: 1, 0: { type: "application/x-fake", suffixes: "", description: "" } };
      p.toString = mask(() => "[object Plugin]", "function toString() { [native code] }");
      try { Object.setPrototypeOf(p, Plugin.prototype); } catch {}
      try { Object.defineProperty(p, Symbol.toStringTag, { value: "Plugin" }); } catch {}
      return p;
    };
    const plugins = [fakePlugin("Chrome PDF Plugin", "internal-pdf-viewer"), fakePlugin("Chromium PDF Plugin", "internal-pdf-viewer")];
    plugins.item = mask((i) => plugins[i] || null, "function item() { [native code] }");
    plugins.namedItem = mask((n) => plugins.find((p) => p.name === n) || null, "function namedItem() { [native code] }");
    plugins.toString = mask(() => "[object PluginArray]", "function toString() { [native code] }");
    plugins.refresh = mask(() => undefined, "function refresh() { [native code] }");
    try { Object.setPrototypeOf(plugins, PluginArray.prototype); } catch {}
    try { Object.defineProperty(plugins, Symbol.toStringTag, { value: "PluginArray" }); } catch {}
    define(Navigator.prototype, "plugins", plugins);
  } catch {}

  // 4. window.chrome stub.
  if (!window.chrome) define(window, "chrome", { runtime: {}, loadTimes: () => ({}), csi: () => ({}) });

  // 5. permissions.query for Notifications must say "prompt", not "denied".
  try {
    const origQuery = Permissions.prototype.query;
    Permissions.prototype.query = mask(function (params) {
      if (params && params.name === "notifications") return Promise.resolve({ state: "prompt", onchange: null });
      return origQuery.call(this, params);
    }, "function query() { [native code] }");
  } catch {}

  // 6. WebGL unmasked vendor/renderer: plausible discrete GPU string.
  try {
    const origGetParam = WebGLRenderingContext.prototype.getParameter;
    const spoofed = mask(function (p) {
      if (p === 37445) return "Google Inc. (NVIDIA)";
      if (p === 37446) return "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)";
      return origGetParam.call(this, p);
    }, "function getParameter() { [native code] }");
    WebGLRenderingContext.prototype.getParameter = spoofed;
    if (window.WebGL2RenderingContext) WebGL2RenderingContext.prototype.getParameter = spoofed;
  } catch {}
})();
