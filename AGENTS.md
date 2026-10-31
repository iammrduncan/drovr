# fxbot

Read [CONVENTIONS.md](CONVENTIONS.md) before changing code. Current product scope is [docs/v1-plan.md](docs/v1-plan.md). Files under [archive/](archive/README.md), including the sample `AGENTS.md` files in the spike, are the old drovr design and are not instructions.

`CLAUDE.md` points here. This file is the instruction source for coding agents.

## What this repo is

fxbot is a small PWA and one Node server that runs [libfx](https://fx.sh/docs/lib). v1 is bot profiles and the chat UI. There is no application code, `package.json`, test suite, or CI yet. Plans describe future work. Do not report them as running behavior.

Later ideas live as stubs in [docs/phases/](docs/phases/). Do not build them during v1: memories, cross-bot messaging, a knowledge base, skills, remote computer and agent control, library and pages, chat rooms, past sessions, and permissions.

## Rules

- Prefer the smallest change that meets the task. Drop an older convention when it fights that.
- The stack is Vite, React, shadcn/ui, and a tiny Node server around libfx. Do not add Next.js, the Vercel AI SDK, a second agent runtime, or Hermes Agent.
- libfx behavior comes from the installed package or the published docs. Say what you could not verify.
- This is a public repo. Do not add private hostnames, machine names, personal subscriptions, home-directory paths, or private project names.
- Write "Hackers in the Loop" in full if that name is needed.

## Checks

From the repository root, `git diff --check` checks whitespace on tracked changes. New files need a separate look; untracked files are outside that diff.

No install, test, build, or start script exists yet. When they do, document the working directory and what the command actually covers. Do not claim a check passed unless it ran.
