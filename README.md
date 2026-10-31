# fxbot

fxbot is a small installable web app for long-running chats with bot profiles. The browser is the UI on desktop and mobile. One Node server runs [libfx](https://fx.sh/docs/lib) and sends each conversation to an OpenAI-compatible model API, either a cheap hosted API or a local model server.

Simplicity is the rule: a small core, few dependencies, and no abstraction until a second real use. See [CONVENTIONS.md](CONVENTIONS.md).

## Stack

Vite, React, and shadcn/ui for the PWA, with the chat built from shadcn's AI Elements patterns. A tiny Node server for profiles and libfx. No Next.js, and no Vercel AI SDK. The browser reads libfx's event stream with a small hook of our own.

## Order

1. **v1.** The PWA and bot profiles. [docs/v1-plan.md](docs/v1-plan.md).
2. Persistent memories for each profile.
3. Cross-bot messaging.
4. A knowledge base.

Later, and not scheduled: self-learning skills, remote computer and agent control through [herdr](https://herdr.dev), library and pages, chat rooms, past sessions, and permissions. One-page stubs are in [docs/phases/](docs/phases/).

The previous design and spike are in [archive/](archive/README.md). The git host may still use the old repository name until the owner renames it.

## Run

Node 22.18 or newer. From the repository root:

```sh
npm install
npm run server   # API on 127.0.0.1:8787
npm run dev      # page on 127.0.0.1:5173, proxies /api
```

The server needs `FXBOT_BASE_URL`: an OpenAI-compatible endpoint, including its `/v1` prefix, such as a hosted API or a local model server at `http://localhost:11434/v1`. Set `FXBOT_API_KEY` when the endpoint needs a key. Put them in an uncommitted `.env` in the repository root, or in the environment, which wins. The key stays on the server. Profiles and conversations are stored in `./data`, or in `FXBOT_DATA`.

For one process, run `npm run build`, then `npm run server` serves the built page and `/api` on port 8787.

To reach it over Tailscale, leave both servers on loopback and run `tailscale serve --bg 5173` once, or `8787` for the built app. Your tailnet then opens it at `https://<machine>.<tailnet>.ts.net`, with HTTPS, so the PWA can install.

To reach the server from another device without Tailscale, set `FXBOT_HOST` (for example `0.0.0.0`) and `FXBOT_TOKEN`. Put the same token in an uncommitted `.env` as `VITE_FXBOT_TOKEN` before `npm run build`. Installing the PWA needs HTTPS or localhost.

## Status

v1 is built: bot profiles, a streaming chat that survives reloads and server restarts, and an installable shell that opens offline. It was checked against a mock OpenAI-compatible server, not a hosted model. [docs/v1-plan.md](docs/v1-plan.md) records what was checked.
