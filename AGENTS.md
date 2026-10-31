# fxbot

Read [CONVENTIONS.md](CONVENTIONS.md) before changing code. Current product scope is [docs/v1-plan.md](docs/v1-plan.md). Files under [archive/](archive/README.md), including the sample `AGENTS.md` files in the spike, are the old drovr design and are not instructions.

`CLAUDE.md` points here. This file is the instruction source for coding agents.

## What this repo is

fxbot is a small PWA and one Node server that runs [libfx](https://fx.sh/docs/lib). v1 is built: bot profiles and the chat UI. There is no test suite or CI. The phase stubs describe future work. Do not report them as running behavior.

Later ideas live as one-page stubs in [docs/phases/](docs/phases/). Do not build any of them during v1.

## Rules

- Prefer the smallest change that meets the task. Drop an older convention when it fights that.
- The stack is Vite, React, shadcn/ui, and a tiny Node server around libfx. Do not add Next.js, the Vercel AI SDK, a second agent runtime, or Hermes Agent.
- libfx behavior comes from the installed package or the published docs. Say what you could not verify.
- This is a public repo. Do not add private hostnames, machine names, personal subscriptions, home-directory paths, or private project names.
- Write "Hackers in the Loop" in full if that name is needed.

## Checks

Run these from the repository root after `npm install`, with Node 22.18 or newer:

- `npm run typecheck` runs `tsc --noEmit` over `src/`, `server/`, and `vite.config.ts`.
- `npm run build` builds the page and service worker into `dist/`. It does not typecheck.
- `git diff --check` checks whitespace on tracked changes. New files need a separate look; untracked files are outside that diff.

There are no automated tests. Behavior is checked by hand, in a browser or with `curl`, as the milestones in [docs/v1-plan.md](docs/v1-plan.md) describe. `npm run server` needs `FXBOT_BASE_URL`, from the environment or `.env`. Point it at disposable data with `FXBOT_DATA`. Do not claim a check passed unless it ran.
