# fxbot

fxbot is a small installable web app for long-running chats with bot profiles. The browser is the UI on desktop and mobile. One Node server runs [libfx](https://fx.sh/docs/lib) and sends each conversation to an OpenAI-compatible model API, either a cheap hosted API or a local model server.

Simplicity is the rule: a small core, few dependencies, and no abstraction until a second real use. See [CONVENTIONS.md](CONVENTIONS.md).

## Stack

Vite, React, and shadcn/ui for the PWA. A tiny Node server for profiles and libfx. No Next.js, and no Vercel AI SDK. The browser reads libfx's event stream with a small hook of our own.

## Order

1. **v1.** The PWA and bot profiles. [docs/v1-plan.md](docs/v1-plan.md).
2. Persistent memories for each profile.
3. Cross-bot messaging.
4. A knowledge base.

Later, and not scheduled: self-learning skills, remote computer and agent control through [herdr](https://herdr.dev), library and pages, chat rooms, past sessions, and permissions. One-page stubs are in [docs/phases/](docs/phases/).

The previous design and spike are in [archive/](archive/README.md). The git host may still use the old repository name until the owner renames it.

## Status

Docs only. No app is implemented yet.
