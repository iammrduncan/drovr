import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import { agent, modelFor, open, resumeAll, send } from "./agent.ts";
import * as profiles from "./profiles.ts";
import type { Fields } from "./profiles.ts";

const port = 8787;
const host = process.env.FXBOT_HOST ?? "127.0.0.1";
const token = process.env.FXBOT_TOKEN;
if (process.env.FXBOT_HOST && !token) throw new Error("FXBOT_TOKEN is required when FXBOT_HOST is set");

const dist = join(import.meta.dirname, "..", "dist");
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const fail = (status: number, message: string): never => {
  throw Object.assign(new Error(message), { status });
};
const json = (res: ServerResponse, status: number, body: unknown) =>
  res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));

const sha = (value: string) => createHash("sha256").update(value).digest();
const authorized = (req: IncomingMessage) =>
  !token || timingSafeEqual(sha(req.headers.authorization ?? ""), sha(`Bearer ${token}`));

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (Number(req.headers["content-length"]) > 1 << 20) fail(413, "body is over 1 MiB");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1 << 20) fail(413, "body is over 1 MiB");
    chunks.push(chunk);
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {}
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return fail(400, "body must be a JSON object");
}

// Create needs only a name; the rest start empty. An empty model follows the default in settings.
// Update takes any of the three. Other keys are ignored.
function fields(input: Record<string, unknown>, create: boolean): Partial<Fields> {
  const out: Partial<Fields> = create ? { instructions: "", model: "" } : {};
  for (const key of ["name", "instructions", "model"] as const) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== "string") return fail(400, `${key} must be a string`);
    out[key] = key === "instructions" ? value : value.trim();
    if (key !== "instructions" && out[key]!.length > 200) fail(400, `${key} is over 200 characters`);
  }
  if ((create || out.name !== undefined) && !out.name) fail(400, "name is required");
  if (Buffer.byteLength(out.instructions ?? "") > 64 * 1024) fail(400, "instructions are over 64 KiB");
  return out;
}

async function api(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (!authorized(req)) return json(res, 401, { error: "missing or wrong bearer token" });
  const [, , resource, id, action, extra] = url.pathname.split("/");
  const method = req.method;
  if (resource === "health" && !id && method === "GET") return json(res, 200, { ok: true });
  if (resource === "settings" && !id) {
    if (method === "GET") return json(res, 200, profiles.getSettings());
    if (method !== "PATCH") return fail(405, "method not allowed");
    const { defaultModel } = await body(req);
    if (typeof defaultModel !== "string" || defaultModel.trim().length > 200)
      return fail(400, "defaultModel must be a string of at most 200 characters");
    return json(res, 200, profiles.saveSettings({ defaultModel: defaultModel.trim() }));
  }
  if (resource !== "profiles" || extra !== undefined) return fail(404, "not found");

  if (!id) {
    if (method === "GET") return json(res, 200, profiles.list());
    if (method === "POST") return json(res, 201, profiles.create(fields(await body(req), true) as Fields));
    return fail(405, "method not allowed");
  }
  if (!profiles.isId(id)) return fail(400, "profile id must be 12 hex characters");
  const profile = profiles.get(id) ?? fail(404, "profile not found");

  if (!action) {
    if (method === "GET") return json(res, 200, profile);
    if (method === "PATCH") return json(res, 200, profiles.save({ ...profile, ...fields(await body(req), false) }));
    if (method === "DELETE") {
      profiles.remove(id);
      return json(res, 200, { ok: true });
    }
  } else if (action === "messages" && method === "POST") {
    const { text, messageId } = await body(req);
    if (typeof text !== "string" || !text.trim()) return fail(400, "text is required");
    if (typeof messageId !== "string" || !/^[\w.-]{1,128}$/.test(messageId))
      return fail(400, "messageId must be 1 to 128 letters, digits, '.', '_', or '-'");
    if (!modelFor(profile)) return fail(400, "No model. Set a default model in Settings, or give this bot one.");
    return json(res, 200, (await send(profile, text, messageId)) ?? fail(404, "profile not found"));
  } else if (action === "stream" && method === "GET") {
    const cursor = Number(url.searchParams.get("cursor") ?? 0);
    if (!Number.isInteger(cursor) || cursor < 0) return fail(400, "cursor must be a whole number");
    res.writeHead(200, { "content-type": "application/x-ndjson", "cache-control": "no-store" });
    // No session until the first message, so there is nothing to replay.
    if (!profile.sessionId) return res.end();
    res.flushHeaders();
    // Replays from the cursor, then stays open. A closed response cancels the libfx stream.
    const lines = open(profile, profile.sessionId).stream(cursor) as ReadableStream<Uint8Array>;
    return pipeline(Readable.fromWeb(lines), res).catch(() => {});
  }
  return fail(action ? 404 : 405, action ? "not found" : "method not allowed");
}

// The built page. Paths that are not files get index.html, so the app's routes load.
function page(res: ServerResponse, pathname: string) {
  let file = normalize(join(dist, pathname));
  if (!file.startsWith(dist) || !statSync(file, { throwIfNoEntry: false })?.isFile()) file = join(dist, "index.html");
  try {
    const data = readFileSync(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-cache" });
    res.end(data);
  } catch {
    json(res, 404, { error: "no build in dist/; run npm run build" });
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) await api(req, res, url);
    else page(res, url.pathname);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    if (status === 500) console.error(error);
    if (!res.headersSent) json(res, status, { error: error instanceof Error ? error.message : String(error) });
    else res.destroy();
  }
});

server.listen(port, host, () => console.log(`fxbot server on http://${host}:${port}`));
resumeAll();

// Stop taking requests, then let libfx finish the turns this process started.
async function shutdown() {
  server.close();
  server.closeAllConnections();
  await agent.close();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
