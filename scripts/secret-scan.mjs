#!/usr/bin/env node
// Secret/personal-data scan over tracked files. Exit 1 on any finding.
// Run before every push: node scripts/secret-scan.mjs
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PATTERNS = [
  ["private-key", /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["api-key-openai-style", /\bsk-[A-Za-z0-9_-]{20,}/],
  ["github-token", /\b(gho|ghp|github_pat)_[A-Za-z0-9_]{15,}/],
  ["aws-key", /\bAKIA[0-9A-Z]{16}\b/],
  ["lunaroute-key", /\blr_[A-Za-z0-9]{15,}/],
  ["bearer-token", /Bearer\s+[A-Za-z0-9._-]{25,}/],
  ["personal-user-path", /C:\\\\?Users\\\\?[^\\<\s"]{2,}/i],
  ["email-address", /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(com|ru|net|org|io|dev|ai)\b/],
];
// Public material that is safe by design: the extension's public key in its
// manifest (its matching private key was never generated or kept).
const ALLOW = [
  /extension\/manifest\.json/,
];
const ALLOW_LINES = [/@example\.com/]; // benchmark fixtures

const files = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" }).split("\n").filter(Boolean);
const findings = [];
for (const file of files) {
  if (ALLOW.some((re) => re.test(file))) continue;
  let text;
  try { text = readFileSync(file, "utf8"); } catch { continue; }
  if (text.includes("\0")) continue; // binary
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (ALLOW_LINES.some((re) => re.test(line))) return;
    for (const [name, re] of PATTERNS) {
      if (re.test(line)) findings.push(`${file}:${i + 1} [${name}] ${line.trim().slice(0, 80)}`);
    }
  });
}
if (findings.length) {
  console.log(`FAIL ${findings.length} finding(s):`);
  findings.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log(`OK scanned ${files.length} tracked files, 0 findings`);
