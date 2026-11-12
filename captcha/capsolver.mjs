// CapSolver adapter: turn a captcha site-key + page URL into a solution token.
// Key comes from DANIKUSE_CAPSOLVER_KEY (user registers at capsolver.com).
// Supports ReCaptcha v2 (checkbox/invisible) proxy-less; returns the token the
// agent then injects into the page (g-recaptcha-response + callback).
const API = "https://api.capsolver.com";

async function post(path, body) {
  const r = await fetch(API + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = await r.json();
  if (data.errorId !== 0) throw new Error(`capsolver: ${data.errorCode || "unknown"} ${data.errorDescription || ""}`.trim());
  return data;
}

export async function balance(apiKey) {
  const data = await post("/getBalance", { clientKey: apiKey });
  return data.balance;
}

export async function solveRecaptchaV2(apiKey, websiteURL, websiteKey, { invisible = false, timeoutMs = 120000 } = {}) {
  const { taskId } = await post("/createTask", {
    clientKey: apiKey,
    task: {
      type: invisible ? "ReCaptchaV2Task" : "ReCaptchaV2TaskProxyLess",
      websiteURL,
      websiteKey,
    },
  });
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 5000));
    const data = await post("/getTaskResult", { clientKey: apiKey, taskId });
    if (data.status === "ready") return data.solution.gRecaptchaResponse;
    if (data.status === "failed") throw new Error("capsolver: task failed");
  }
  throw new Error("capsolver: timeout waiting for solution");
}
