#!/usr/bin/env node
// Danikuse native messaging host. Brave spawns this process when the Danikuse
// Bridge extension connects. It bridges two worlds:
//   extension  <-- stdio (uint32 LE length + JSON) -->  this host
//   CLI        <-- HTTP 127.0.0.1:17331 + token    -->  this host
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOME = process.env.DANIKUSE_HOME || join(homedir(), ".danikuse");
const PORT = 17331;
const token = randomBytes(16).toString("hex");
mkdirSync(HOME, { recursive: true });
writeFileSync(join(HOME, "bridge-token.txt"), token);

const pending = new Map();
let seq = 0;
let buffer = Buffer.alloc(0);

function sendToExtension(msg) {
  const body = Buffer.from(JSON.stringify(msg), "utf8");
  const head = Buffer.alloc(4);
  head.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([head, body]));
}

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.length >= 4) {
    const len = buffer.readUInt32LE(0);
    if (buffer.length < 4 + len) break;
    const raw = buffer.subarray(4, 4 + len).toString("utf8");
    buffer = buffer.subarray(4 + len);
    try {
      const msg = JSON.parse(raw);
      const waiter = pending.get(msg.id);
      if (waiter) {
        pending.delete(msg.id);
        msg.ok ? waiter.resolve(msg.result) : waiter.reject(new Error(msg.error || "extension error"));
      }
    } catch {}
  }
});
process.stdin.on("end", () => process.exit(0));

function callExtension(action, fields, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const id = `cmd-${++seq}`;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error("extension timeout")); }, timeoutMs);
    pending.set(id, {
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject: (e) => { clearTimeout(timer); reject(e); },
    });
    sendToExtension({ id, action, ...fields });
  });
}

createServer((req, res) => {
  if (req.headers["x-danikuse-token"] !== token) {
    res.writeHead(403).end("forbidden");
    return;
  }
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", async () => {
    try {
      const { action, ...fields } = JSON.parse(raw || "{}");
      const result = await callExtension(action, fields);
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, result }));
    } catch (e) {
      res.writeHead(502, { "content-type": "application/json" }).end(JSON.stringify({ ok: false, error: String(e) }));
    }
  });
}).listen(PORT, "127.0.0.1");
