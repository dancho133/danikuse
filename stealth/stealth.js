// Danikuse stealth init script for agent-browser (--init-script).
// Runs before page JS on every agent-surface navigation. Removes the cheap
// automation tells (webdriver flag, HeadlessChrome UA, empty plugins) and
// keeps every override native-looking (Function.prototype.toString proxy).
// Not a bot-evasion guarantee — honest layer, tested against bot.sannysoft.com.
(() => {
  // Every patched function must still print as native code.
  const nativeStrings = new Map();
  const origToString = Function.prototype.toString;
  const toStringHook = function () {
    if (nativeStrings.has(this)) return nativeStrings.get(this);
    return origToString.call(this);
  };
  nativeStrings.set(toStringHook, "function toString() { [native code] }");
  Function.prototype.toString = toStringHook;
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

  // 3. Non-empty plugins that quack like a real PluginArray. Plain object, NOT an
  // array: Array.isArray(navigator.plugins) must be false (spec: exotic slot).
  try {
    const fakePlugin = (name, file) => {
      const p = { name, filename: file, description: "", length: 1, 0: { type: "application/x-fake", suffixes: "", description: "" } };
      p.toString = mask(() => "[object Plugin]", "function toString() { [native code] }");
      try { Object.setPrototypeOf(p, Plugin.prototype); } catch {}
      try { Object.defineProperty(p, Symbol.toStringTag, { value: "Plugin" }); } catch {}
      return p;
    };
    const p0 = fakePlugin("Chrome PDF Plugin", "internal-pdf-viewer");
    const p1 = fakePlugin("Chromium PDF Plugin", "internal-pdf-viewer");
    const plugins = {
      0: p0, 1: p1, length: 2,
      item: mask((i) => plugins[i] || null, "function item() { [native code] }"),
      namedItem: mask((n) => (plugins[0].name === n ? plugins[0] : plugins[1].name === n ? plugins[1] : null), "function namedItem() { [native code] }"),
      refresh: mask(() => undefined, "function refresh() { [native code] }"),
    };
    plugins.toString = mask(() => "[object PluginArray]", "function toString() { [native code] }");
    try { Object.setPrototypeOf(plugins, PluginArray.prototype); } catch {}
    try { Object.defineProperty(plugins, Symbol.toStringTag, { value: "PluginArray" }); } catch {}
    define(Navigator.prototype, "plugins", plugins);
  } catch {}

  // 4. window.chrome stub.
  if (!window.chrome) define(window, "chrome", { runtime: {}, loadTimes: () => ({}), csi: () => ({}) });

  // 5. permissions.query for Notifications must say "prompt", not "denied".
  // Proxy over the REAL status: keeps instanceof + addEventListener working.
  try {
    const origQuery = Permissions.prototype.query;
    Permissions.prototype.query = mask(function (params) {
      return origQuery.call(this, params).then((status) => {
        if (params && params.name === "notifications" && status.state === "denied") {
          return new Proxy(status, { get: (t, p) => (p === "state" ? "prompt" : t[p]) });
        }
        return status;
      });
    }, "function query() { [native code] }");
  } catch {}

  // 6. WebGL unmasked vendor/renderer: only spoof SOFTWARE renderers
  // (SwiftShader/llvmpipe leak headless). Real GPUs keep their true string:
  // a GTX 1660 label on Intel/AMD/Apple hardware is itself a fingerprint.
  try {
    const probe = document.createElement("canvas").getContext("webgl");
    const dbg = probe && probe.getExtension("WEBGL_debug_renderer_info");
    const real = dbg ? String(probe.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "") : "";
    if (!/swiftshader|llvmpipe|software|basic render/i.test(real)) return;
    const spoof = (orig) => mask(function (p) {
      if (p === 37445) return "Google Inc. (NVIDIA)";
      if (p === 37446) return "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)";
      return orig.call(this, p);
    }, "function getParameter() { [native code] }");
    WebGLRenderingContext.prototype.getParameter = spoof(WebGLRenderingContext.prototype.getParameter);
    if (window.WebGL2RenderingContext) WebGL2RenderingContext.prototype.getParameter = spoof(WebGL2RenderingContext.prototype.getParameter);
  } catch {}
})();
