# v1 plan

v1 is bot profiles and the PWA. One person creates a few bots and keeps a long-running chat with each. The page is the product. A single Node process stores the profiles and runs [libfx 0.0.16](https://fx.sh/docs/lib). The model is an OpenAI-compatible endpoint: a cheap API, or a local server.

v1 is built. This page describes what exists and records how each part was checked. [Checked during the build](#checked-during-the-build) lists what was tested and what was not.

## Scope

- A profile list, a create/edit form, and a chat view.
- One persistent conversation per profile, resumed after a reload or a server restart.
- Replies stream into the page as tokens arrive.
- The app installs as a PWA. The shell opens offline and says when the server is unreachable.

## Non-goals

Memories, cross-bot messaging, a knowledge base, skills, herdr, worker harnesses, library and pages, chat rooms, past sessions, and permissions. Those stubs are in [docs/phases/](phases/).

Also out of v1: accounts, Next.js, the Vercel AI SDK, tools, MCP, a transcript database, and Hermes Agent.

## Repo layout

One package. Two entries: Vite for the page, `node server/index.ts` for the API. Node 22.18 or newer. libfx needs `^20.19.0 || >=22.12.0`, and 22.18 is the first 22.x release that runs TypeScript without a flag. Checked here with Node 22.23.4.

```
package.json
index.html
vite.config.ts
tsconfig.json          one config for the page and the server
components.json        shadcn settings, for `npx shadcn@latest add`
public/                the two app icons
src/
  main.tsx
  app.tsx              path switch, the sidebar, and the screens
  api.ts               fetch helper
  use-turn-stream.ts   NDJSON reader
  index.css            Tailwind and the shadcn theme
  lib/utils.ts         shadcn's cn() import
  hooks/use-mobile.ts  shadcn's sidebar breakpoint hook
  components/ui/       shadcn components, added only when a screen uses them
server/
  index.ts             node:http routes
  profiles.ts          JSON files
  agent.ts             the one libfx agent
data/                  gitignored
  settings.json        the default model
  profiles/<id>.json
  sessions/            libfx local() directory
```

`npm run dev` starts Vite. `npm run server` starts the API on port 8787, loading `.env` when the file exists. Vite proxies `/api` to it. In production, `npm run build` writes `dist/`, and the same Node process serves `dist/` and `/api` on port 8787. No second port, and no process manager package.

Vite listens on `127.0.0.1` and accepts `*.ts.net` host names, so `tailscale serve --bg 5173` gives the tailnet the dev server over HTTPS. `tailscale serve --bg 8787` does the same for the built app.

Vite's dev proxy keeps the page's stream open after the API server stops. `vite.config.ts` closes it when the server's response ends early, so the chat sees the drop in development as it does in production.

## Server API

`node:http` and a path switch. No web framework.

| Method | Path | Body / response |
| --- | --- | --- |
| `GET` | `/api/health` | `{ "ok": true }` |
| `GET` | `/api/profiles` | array of profiles, sorted by name |
| `POST` | `/api/profiles` | `{ "name" }`, and optionally instructions and model → 201 and the profile |
| `GET` | `/api/profiles/:id` | one profile |
| `PATCH` | `/api/profiles/:id` | any of name, instructions, or model → the profile |
| `DELETE` | `/api/profiles/:id` | removes the JSON file → `{ "ok": true }` |
| `POST` | `/api/profiles/:id/messages` | `{ "text", "messageId" }` → `{ "messageId", "sessionId" }` after libfx accepts the prompt |
| `GET` | `/api/profiles/:id/stream?cursor=` | `application/x-ndjson`, replay then follow |
| `GET` | `/api/settings` | `{ "defaultModel" }`, empty until set |
| `PATCH` | `/api/settings` | `{ "defaultModel" }` → the settings |

`messageId` is 1 to 128 letters, digits, `.`, `_`, or `-`. The same id again returns the same ids, follows the original turn, and runs no second model call. libfx marks that turn's result `repeated: true`. The HTTP response does not carry it, because it answers at `accepted`, before the result exists. The page needs no flag: it keys turns by `messageId`.

A profile with no session yet streams an empty body. Name and model are trimmed and at most 200 characters, and the default model too. A message to a bot with no model of its own, while no default is set, is 400 and runs nothing. A request body is at most 1 MiB.

The server listens on `127.0.0.1` unless `FXBOT_HOST` is set. If `FXBOT_HOST` is set, `FXBOT_TOKEN` is required and every `/api` request sends `Authorization: Bearer <token>`. The key for the model stays in the server environment. The page never receives it.

Errors are a JSON `{ "error": "..." }` and a 4xx/5xx status. Unknown profiles are 404. A bad id, a bad body, or an empty message is 400. A wrong or missing token is 401. A body over 1 MiB is 413.

## Data model

A directory of JSON files. v1 is one person and a handful of profiles. libfx already stores the conversation, so a database would be a second copy of the transcript plus a driver. SQLite can wait until a query needs it.

```json
{
  "id": "a1b2c3d4e5f6",
  "name": "Assistant",
  "instructions": "You are a concise personal assistant.",
  "model": "the-model-id",
  "sessionId": null,
  "preview": "The start of the latest reply."
}
```

`id` is 12 hex characters from `node:crypto`, assigned on create, and never changes. `sessionId` stays `null` until the first message. The server then calls `agent.newSessionId()`, saves that id, and prompts the session. Name, instructions, and model are editable. A new bot is just a name: instructions and model start empty. An empty model follows `defaultModel` in `data/settings.json` at each turn, so changing the default changes every bot without a model of its own. `preview` is absent until a reply finishes; the server then saves its first 160 characters for the sidebar. A reply that runs again after a restart does not update it. Instructions are capped at 64 KiB, which is libfx's limit.

Profile reads and writes use sync `fs` calls, so a read-modify-write never interleaves with another request. A write goes to a temporary file and is renamed into place. Concurrent first messages to a new profile share one session.

The model base URL and API key are process environment, shared by every profile. `npm run server` also reads them from an uncommitted `.env` in the repository root; a variable already set in the environment wins.

| Variable | Role |
| --- | --- |
| `FXBOT_BASE_URL` | OpenAI-compatible origin, including the `/v1` prefix the server expects. Required. |
| `FXBOT_API_KEY` | sent as the provider key; omit when the endpoint needs none |
| `FXBOT_DATA` | data directory, default `./data` |
| `FXBOT_HOST` | bind address; default `127.0.0.1` |
| `FXBOT_TOKEN` | required when `FXBOT_HOST` is set |

Deleting a profile deletes its JSON file and leaves the libfx session files on disk. The agent API has no method that deletes a durable session. `SessionStore.remove` belongs to the terminal API, which v1 does not use.

## libfx

Checked on 31 Oct 2026 against the [overview](https://fx.sh/docs/lib), [providers](https://fx.sh/docs/lib/providers), [prompts and streaming](https://fx.sh/docs/lib/prompts), [durability](https://fx.sh/docs/lib/durability), and [API reference](https://fx.sh/docs/lib/api) for libfx 0.0.16. The installed package's `types/libfx.d.cts` matches the calls below.

One agent per process, created once at startup, in `server/agent.ts`:

```ts
const options = {
  name: "fxbot",
  provider: { name: "openai", baseUrl },
  durability: local({ dir: join(dataDir, "sessions") }),
};
export const agent = createFxAgent(apiKey ? { ...options, credentials: async () => ({ apiKey }) } : options);
```

`createFxAgent` returns without doing I/O. The engine starts on the first turn. Requests go to `{baseUrl}/chat/completions`, over HTTPS, or over HTTP when the host is localhost. The provider `name` starts with a letter, then letters, digits, `_`, or `-`, at most 64 characters, and is not `gateway`, `codex`, or `grok`. The optional `models` map (context window, max output, tools, vision) can wait until a turn fails for lack of it.

Each profile is a session on that agent. Every open passes the saved model and instructions, including after a restart. libfx does not keep the agent's instructions in the agent object; session options apply to the turns that object starts. A session opened without a model fails its turn with "a custom provider needs a model".

```ts
const session = agent.session(sessionId, { model: profile.model, instructions: profile.instructions });
await session.prompt(text, { messageId }).accepted;
```

`sessionId` is written into the profile file before `prompt`, so a restart still opens that session. On `local()`, that id is `wrun_` plus letters and digits, and `newSessionId()` returns one without a provider request. Keep the agent name `fxbot`: a session's turns run only on an agent with the name that created it.

`GET .../stream` pipes `session.stream(cursor)` to the response with `Readable.fromWeb`. `cursor` defaults to `0`, which replays from the first stored line and then stays open for new lines. A closed response cancels the libfx stream.

At startup the server calls `session.resume()` for every profile with a session. Without it, a turn cut off by a crash waits until that session's next prompt. With it, the turn runs again on its own. On `SIGINT` or `SIGTERM` the server stops taking requests and `agent.close()` waits for the turns this process started.

The hook in `use-turn-stream.ts` is a `fetch` reader. It splits the body on newlines, parses each line as JSON, remembers the last `cursor`, and after a dropped connection calls the same URL again with that cursor. It hides a line whose `epoch` is lower than one before it, as libfx's own reader does.

Lines the chat uses:

| `type` | Use |
| --- | --- |
| `turn_start`, `turn_resume` | start a turn, or start it again after a crash; `input` is the user text. The turn moves to the end of the thread and its reply restarts, because the new run sends the reply again from the beginning. |
| `text_delta` | append `delta` to the turn's reply |
| `reasoning_delta` | append `delta` to the turn's reasoning, shown with the Reasoning pattern |
| `turn_end` | the turn finished; any `stopReason` but `end_turn` shows a note, with `error.message` when present |
| `idle` | written by `resume()` when nothing was open; ignored |
| `tool_start`, `tool_end` | ignored in v1, which has no tools |

A session runs one turn at a time. A second prompt waits behind it. The turn keeps running if the browser disconnects.

The page shows the user's line in the thread as soon as it is sent. On reload, it rebuilds the thread from the stream. `turn_start.input` carried the user text in every session checked, including after a restart, so there is no second file for user text.

What the stream shows on failure:

- A provider that answers with an HTTP error: a `text_delta` holding the status and body, then `turn_end` with `stopReason: "refused"`.
- A provider that cannot be reached: `turn_end` with `stopReason: "error"` and `error.message` `HostStreamFailed`.
- A turn that fails before it starts: only a `turn_end`, with no `turn_start`.

## UI

`app.tsx` matches the path with a few string checks.

A sidebar lists the bots, each with an avatar (its initial, in a color picked from its id) and a preview of its latest reply, under a New bot button. It reloads as replies finish. On a phone it opens from the menu button.

| Path | Screen |
| --- | --- |
| `/` | Pick a bot, or make one. Empty state offers create. |
| `/profiles/new` | Create form: just a name. |
| `/profiles/:id/edit` | Name, model, and instructions, plus delete. An empty model shows the default it follows. |
| `/settings` | The default model. Linked at the foot of the sidebar. |
| `/profiles/:id` | Chat. History, a composer, the streaming reply, and a visible error when the server or the model fails. |

The chat follows shadcn's [AI Elements](https://ui.shadcn.com/docs/ai-elements) patterns, Chat, Message, and Prompt Input, built from the shadcn components `message-scroller`, `message`, `bubble`, and `input-group`. Those patterns are code copied into the project, with no AI SDK; the docs' demos use the AI SDK only to script fake turns, and fxbot feeds them from its own stream hook. Your message is a bubble and the scroll anchor, so a new question settles near the top and the reply streams under it. The reply is markdown, rendered with [Streamdown](https://streamdown.ai), which sanitizes HTML, and a finished reply has Copy. When the model sends reasoning, the Reasoning pattern shows it above the reply: open under "Thinking" while it streams, folded to "Thought" once the reply starts. libfx turns both `reasoning_content` and `reasoning` deltas into `reasoning_delta` lines; both were checked against the mock. An empty chat centers its composer under the bot's name. The composer keeps its place in the tree, so it keeps focus when the first turn arrives.

Enter sends and Shift+Enter adds a line. A message that could not be sent shows Retry, which sends the same `messageId` again. The theme follows the system's light or dark setting. The layout fits a phone width, and the composer stays on screen.

The project uses shadcn's Radix base (`radix-nova` in `components.json`) and keeps the packages its install adds: `radix-ui`, `lucide-react`, `tw-animate-css`, the `shadcn` package for its `shadcn/tailwind.css`, and the Geist font. The components import them; fxbot's own code imports only `@/components/ui`. Add a component with `npx shadcn@latest add <name>` when a screen needs it. Code highlighting in replies (Streamdown's Shiki plugin, or shadcn's Code Block) is not added. Of the other AI Elements patterns, Context has no context window to measure against, Suggestion has no prompts to suggest, and Chain of Thought, Tool, Task, Plan, Queue, Subagent, Confirmation, Stack Trace, Sources, and Inline Citation show tool calls, plans, and web sources, which v1 does not have.

The page never sees the model key. On localhost there is no app token. When `FXBOT_HOST` is set, Vite inlines `VITE_FXBOT_TOKEN` from an uncommitted `.env` file so the page can send the bearer token. Vite inlines only `VITE_` variables, so the model key in the same file never reaches the page. That build is a single shared secret, not an account system.

## PWA

`vite-plugin-pwa` writes the manifest and service worker. Name `fxbot`, `display: standalone`, `start_url: /`, and 192 and 512 pixel icons. The worker precaches the shell, the icons, and the font. Navigations fall back to `index.html` except under `/api`. The worker has no route for `/api`, so those requests always go to the network and a cached chat is never shown as live. Offline, the shell loads and the chat says the server is unreachable. It keeps retrying and recovers on its own when the server returns.

A service worker needs a secure context: `localhost`, or HTTPS. A page opened over plain HTTP on a LAN address works as a website but does not install.

## Milestones

Each one was checked in headless Chromium or with `curl` on 31 Oct 2026, against a mock OpenAI-compatible server. The line budget holds.

1. **Boot.** Done. Vite shows a page, and `GET /api/health` returns ok, directly and through the dev proxy. `data/` is gitignored.
2. **Profiles.** Done. `curl` created, listed, read, updated, and deleted a profile, and got 400, 404, 405, and 413 for bad requests. After a restart the JSON file was still there. With `FXBOT_API_KEY` set, no file under the data directory contains the key.
3. **Profile screens.** Done. The sidebar, create, edit, and delete work in the browser, including the empty list, at 1280, 390, and 320 pixels wide. On a phone the sidebar opens from the menu, and every action is on screen.
4. **Streaming chat.** Done. A message appears at once and the reply grows as `text_delta` lines arrive. A repeated `messageId` made no second provider request.
5. **Resume.** Done. After a restart and a reload, the previous user and assistant text are back, and the follow-up request to the model carried the whole conversation. `turn_start.input` carried the user text. A server killed mid-reply finishes that reply after it restarts, shown once.
6. **Install and offline.** Done. Chromium reports no installability errors for the production build. With the server stopped, the cached shell opens and the chat and the list say they cannot reach the server.

## Line budget

Hand-written TypeScript and the small config files. Generated `src/components/ui/` does not count.

| Area | Budget | Lines |
| --- | --- | --- |
| `server/` | 250 | 267 |
| `src/` screens, fetch, and the stream hook | 450 | 657 |
| Vite, TypeScript, and HTML config | 80 | 76 |
| **Core** | **about 800** | **1000** |

`src/` passed its budget when the chat moved to the sidebar layout and the AI Elements patterns, with Reasoning, reply previews, and Settings. The core is at the line below: the next feature deletes something first.

Stop and delete something if the core passes about 1000 lines.

## Dependencies

| Package | Why it is here |
| --- | --- |
| `vite`, `@vitejs/plugin-react`, `react`, `react-dom` | the UI |
| `typescript`, `@types/node`, `@types/react`, `@types/react-dom` | the language of the server and the page, checked by `npm run typecheck` |
| `tailwindcss`, `@tailwindcss/vite`, `class-variance-authority`, `cn`, `radix-ui`, `lucide-react`, `tw-animate-css`, `shadcn`, `@fontsource-variable/geist` | Tailwind and what the shadcn components and theme import |
| `@shadcn/react` | the scrolling behind Message Scroller |
| `streamdown` | markdown replies |
| `vite-plugin-pwa` | manifest and offline shell |
| `libfx@0.0.16` | the only agent runtime |

The page's JavaScript is about 280 kB gzipped, most of it React, Streamdown's markdown parser, and Radix.

Node's `http`, `fs`, `crypto`, and `stream` cover the server. No Express, database driver, router, state library, or AI SDK.

`npm audit` reports moderate advisories in `workbox-build`, which `vite-plugin-pwa` uses at build time. `npm audit --omit=dev` reports none.

## Checked during the build

- The `libfx@0.0.16` package was installed and its declarations read. The native addon loaded on Linux x64 with glibc 2.41.
- Every model request went to a mock OpenAI-compatible server on `http://localhost`. No hosted API or real local model server was tried.
- `newSessionId()` ran before any provider request.
- `turn_start.input` carried the user text for plain text prompts, including after a restart.
- A repeated `messageId` returned the original turn and made no provider request.
- `local()` does not continue a crashed turn by itself. The next `prompt()` runs it again from the start before the new prompt. `resume()` at startup does the same without waiting for a prompt.
- After a crash, the re-run turn writes a second `turn_start` with a higher epoch and sends the whole reply again.
- `local({ dir })` writes `runs/`, `steps/`, `events/`, `streams/`, `.locks/`, and `version.txt`. That layout is not documented, so nothing reads it directly.
- Not checked: what a restart does if `FXBOT_BASE_URL` changes under the agent name `fxbot`. The README says saved sessions follow the agent's provider.
- Not checked: Safari, iOS, Firefox, a real install prompt, a browser on another device over a LAN address (only `curl` was), and the WebAssembly backend.
