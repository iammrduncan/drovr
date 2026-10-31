# v1 plan

v1 is bot profiles and the PWA. One person creates a few bots and keeps a long-running chat with each. The page is the product. A single Node process stores the profiles and runs [libfx 0.0.16](https://fx.sh/docs/lib). The model is an OpenAI-compatible endpoint: a cheap API, or a local server.

This is a plan. None of the app described here exists yet.

## Scope

- A profile list, a create/edit form, and a chat view.
- One persistent conversation per profile, resumed after a reload or a server restart.
- Replies stream into the page as tokens arrive.
- The app installs as a PWA. The shell opens offline and says when the server is unreachable.

## Non-goals

Memories, cross-bot messaging, a knowledge base, skills, herdr, worker harnesses, library and pages, chat rooms, and past sessions. Those stubs are in [docs/phases/](phases/).

Also out of v1: accounts, Next.js, the Vercel AI SDK, tools, MCP, a transcript database, and Hermes Agent.

## Repo layout

One package. Two entries: Vite for the page, `node server/index.ts` for the API. Node 22.12 or newer matches libfx (`^20.19.0 || >=22.12.0`) and runs this server's TypeScript directly. Checked here with Node 22.23.4: `node` executed a `.ts` file with no extra compiler.

```
package.json
index.html
vite.config.ts
src/
  main.tsx
  app.tsx              path switch and the three screens
  api.ts               fetch helper
  use-turn-stream.ts   NDJSON reader
  components/ui/       shadcn components, added only when a screen uses them
server/
  index.ts             node:http routes
  profiles.ts          JSON files
  agent.ts             the one libfx agent
data/                  gitignored
  profiles/<id>.json
  sessions/            libfx local() directory
```

`npm run dev` starts Vite. `npm run server` starts the API. Vite proxies `/api` to the server. In production the same Node process serves `dist/` and `/api`. No second port, and no process manager package.

## Server API

`node:http` and a path switch. No web framework.

| Method | Path | Body / response |
| --- | --- | --- |
| `GET` | `/api/health` | `{ "ok": true }` |
| `GET` | `/api/profiles` | array of profiles, without secrets |
| `POST` | `/api/profiles` | create; returns the profile |
| `GET` | `/api/profiles/:id` | one profile |
| `PATCH` | `/api/profiles/:id` | update name, instructions, or model |
| `DELETE` | `/api/profiles/:id` | removes the JSON file |
| `POST` | `/api/profiles/:id/messages` | `{ "text", "messageId" }` → `{ "sessionId", "messageId" }` after libfx accepts the prompt |
| `GET` | `/api/profiles/:id/stream?cursor=` | `application/x-ndjson`, replay then follow |

`messageId` is 1 to 128 letters, digits, `.`, `_`, or `-`. The same id again returns the original turn with `repeated: true` and does not run a second model call.

The server listens on `127.0.0.1` unless `FXBOT_HOST` is set. If `FXBOT_HOST` is set, `FXBOT_TOKEN` is required and every `/api` request sends `Authorization: Bearer <token>`. The key for the model stays in the server environment. The page never receives it.

Errors are a JSON `{ "error": "..." }` and a 4xx/5xx status. Unknown profiles are 404. A bad id or an empty message is 400.

## Data model

A directory of JSON files. v1 is one person and a handful of profiles. libfx already stores the conversation, so a database would be a second copy of the transcript plus a driver. SQLite can wait until a query needs it.

```json
{
  "id": "a1b2c3d4e5f6",
  "name": "Assistant",
  "instructions": "You are a concise personal assistant.",
  "model": "the-model-id",
  "sessionId": null
}
```

`id` is 12 hex characters from `node:crypto`, assigned on create, and never changes. `sessionId` stays `null` until the first message. The server then calls `agent.newSessionId()`, saves that id, and prompts the session. Name, instructions, and model are editable. Instructions are capped at 64 KiB, which is libfx's limit.

The model base URL and API key are process environment, shared by every profile:

| Variable | Role |
| --- | --- |
| `FXBOT_BASE_URL` | OpenAI-compatible origin, including the `/v1` prefix the server expects |
| `FXBOT_API_KEY` | sent as the provider key; omit when the endpoint needs none |
| `FXBOT_DATA` | data directory, default `./data` |
| `FXBOT_HOST` | bind address; default `127.0.0.1` |
| `FXBOT_TOKEN` | required when `FXBOT_HOST` is set |

Deleting a profile deletes its JSON file and leaves the libfx session files on disk. The agent API that was read has no method that deletes a durable session. `SessionStore.remove` belongs to the terminal API, which v1 does not use.

## libfx

Checked on 31 Oct 2026 against the [overview](https://fx.sh/docs/lib), [providers](https://fx.sh/docs/lib/providers), [prompts and streaming](https://fx.sh/docs/lib/prompts), [durability](https://fx.sh/docs/lib/durability), and [API reference](https://fx.sh/docs/lib/api) for libfx 0.0.16. Those pages say the TypeScript declarations inside the package are the exact contract. This plan was not compared with an installed copy. Gaps are listed at the end.

One agent per process, created once at startup:

```ts
import { createFxAgent } from "libfx";
import { local } from "libfx/durable-local";

const baseUrl = process.env.FXBOT_BASE_URL;
if (!baseUrl) throw new Error("FXBOT_BASE_URL is required");

const options = {
  name: "fxbot",
  provider: { name: "openai", baseUrl },
  durability: local({ dir: sessionsDir }),
};

const apiKey = process.env.FXBOT_API_KEY;
export const agent = createFxAgent(
  apiKey ? { ...options, credentials: async () => ({ apiKey }) } : options,
);
```

`createFxAgent` returns without doing I/O. The engine starts on the first turn. Requests go to `{baseUrl}/chat/completions`, over HTTPS, or over HTTP when the host is localhost. The provider `name` starts with a letter, then letters, digits, `_`, or `-`, at most 64 characters, and is not `gateway`, `codex`, or `grok`. The optional `models` map (context window, max output, tools, vision) can wait until a turn fails for lack of it.

Each profile is a session on that agent. Pass the saved model and instructions on every open, including after a restart. libfx does not keep the agent's instructions in the agent object; session options apply to the turns that object starts, and those settings are stored with each prompt.

```ts
const sessionId = profile.sessionId ?? (await agent.newSessionId());
const session = agent.session(sessionId, {
  model: profile.model,
  instructions: profile.instructions,
});
const turn = session.prompt(text, { messageId });
await turn.accepted;
```

Write `sessionId` into the profile file before `prompt`, so a restart still opens that session. On `local()`, that id is `wrun_` plus 10 to 64 letters and digits. `newSessionId()` creates one the durability accepts. `session(id)` rejects `null` and any other non-id, so the call always passes that string. Keep the agent name `fxbot`: a session's turns run only on an agent with the name that created it.

`GET .../stream` writes `session.stream(cursor)` to the response. `cursor` defaults to `0`, which replays from the first stored line and then stays open for new lines. Lines are JSON objects. `session.stream()` numbers them in `cursor`, starting at 1. Pipe the web stream with `Readable.fromWeb` from `node:stream`.

The hook in `use-turn-stream.ts` is a `fetch` reader. It splits the body on newlines, parses each line as JSON, remembers the last `cursor`, and after a dropped connection calls the same URL again with that cursor.

Lines the chat uses:

| `type` | Use |
| --- | --- |
| `turn_start` | starts a turn; `input` is the user text when present |
| `text_delta` | append `delta` to the current assistant message |
| `turn_end` | the turn finished; `stopReason` and optional `error` |
| `reasoning_delta`, `tool_start`, `tool_end` | ignore in v1 |

A session runs one turn at a time. A second prompt waits behind it. The turn keeps running if the browser disconnects. `await agent.close()` on shutdown waits for turns this process started.

Show the user's line in the composer immediately. On reload, rebuild the thread from the stream. `turn_start.input` is optional in the published types. See the gaps below before adding a second file for user text.

## UI

Match the path in `app.tsx` with a few lines of string checks.

| Path | Screen |
| --- | --- |
| `/` | Profile list. Name and model. Empty state offers create. |
| `/profiles/new` | Create form: name, instructions, model. |
| `/profiles/:id/edit` | Same form, plus delete. |
| `/profiles/:id` | Chat. History, a composer, the streaming reply, and a visible error when the server or the model fails. |

Use shadcn/ui for the button, input, textarea, and card. Add a component when a screen needs it. The layout fits a phone width: the list is a single column, and the chat composer stays on screen.

The page never sees the model key. On localhost there is no app token. When `FXBOT_HOST` is set, Vite inlines `VITE_FXBOT_TOKEN` from an uncommitted `.env` file so the page can send the bearer token. That build is a single shared secret, not an account system.

## PWA

`vite-plugin-pwa` writes the manifest and service worker. Name `fxbot`, `display: standalone`, `start_url: /`. Precache the shell. `/api` is network-only, so a cached chat is never shown as live. Offline, the shell loads and the chat says the server is unreachable.

## Milestones

Each one is done when its checks pass in a browser or with `curl`, and the line budget still holds.

1. **Boot.** Vite shows a page, and `GET /api/health` returns ok. Dev proxy reaches the API. `data/` is gitignored.
2. **Profiles.** `curl` can create, list, read, update, and delete a profile. Restart the server and the JSON file is still there. The file has no API key.
3. **Profile screens.** List, create, edit, and delete work in the browser, including the empty list. A narrow viewport still shows the actions.
4. **Streaming chat.** With `FXBOT_BASE_URL` pointed at an OpenAI-compatible server, a message appears in the chat and the reply grows as `text_delta` lines arrive. A repeated `messageId` does not start a second reply.
5. **Resume.** Restart the server, open the same profile, and the previous user and assistant text are there. A follow-up answer still uses that conversation. Record whether `turn_start.input` carried the user text.
6. **Install and offline.** The browser offers install. With the server stopped, the installed shell opens and the chat reports that it cannot reach the server.

## Line budget

Hand-written TypeScript and the small config files. Generated `src/components/ui/` does not count.

| Area | Lines |
| --- | --- |
| `server/` | 250 |
| `src/` screens, fetch, and the stream hook | 450 |
| Vite, TypeScript, and HTML config | 80 |
| **Core** | **about 800** |

Stop and delete something if the core passes about 1000 lines.

## Dependencies

| Package | Why it is here |
| --- | --- |
| `vite`, `react`, `react-dom` | the UI |
| `typescript` | the language of the server and the page |
| Tailwind and the packages the shadcn/ui Vite install adds | the chosen components |
| `vite-plugin-pwa` | manifest and offline shell |
| `libfx@0.0.16` | the only agent runtime |

Node's `http`, `fs`, `crypto`, and `stream` cover the server. No Express, database driver, router, state library, or AI SDK.

## Not verified

- The published guides were read. The `libfx@0.0.16` package was not installed, so its `.d.ts` was not diffed against this plan.
- No request was sent to an OpenAI-compatible server. The `{baseUrl}/chat/completions` rule and the custom-provider example are from the providers doc, including HTTP only on localhost.
- `turn_start.input` is optional on `StreamLine`. The guides do not say a plain text prompt always sets it. Milestone 5 checks a real session. If user text is missing on replay, append only those user lines to `data/profiles/<id>.messages.jsonl`. Skip that file if the stream already has them.
- The guides say a later process continues a turn that died mid-reply, and they also document `session.resume()`. They do not say whether `local()` continues by itself on the next `prompt()`. v1 does not call `resume()` unless a restart leaves a turn stuck.
- `newSessionId()` is in the API reference and was not executed. The quick start instead reads `sessionId` from `turn.accepted` after `agent.session()` with no id. If `newSessionId()` cannot run before the first provider call, use that quick-start path and save `accepted.sessionId`.
- The on-disk layout inside `local({ dir })` was not described in the pages that were read.
- `FX_AGENT_NAME_IN_USE` fires when one process creates two agents with the same name and different options on the same store. This plan creates one agent. It does not say what a restart does if `FXBOT_BASE_URL` changes under the name `fxbot`.
- Whether a native addon or WebAssembly loads on a given machine was not run. The Node entry uses the native addon when it is present.
