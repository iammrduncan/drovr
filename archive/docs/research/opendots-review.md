# OpenDots review

Reviewed [CopilotKit/OpenDots](https://github.com/CopilotKit/OpenDots) at commit `8091324942b86789ed0da7facbee855145d933b0` (22 October 2026, "Merge pull request #148 from DevJoaoLopes/chore/knip-configuration"). That commit is the default-branch tip cloned on 29 October 2026. The GitHub repository's `pushed_at` that day was 28 October 2026, which is later than this tip, so something other than `main` was pushed after it. This review is `main` at `80913249`: the README, `docs/`, and `src/`. Nothing here was run.

**Verdict: ignore it. Do not adopt OpenDots, do not build on it, and do not take a new rule into the plan.**

OpenDots is a single-owner template for specialist agents that chat, take a call, and answer a Slack mention. Each specialist can have an OpenBot computer. Conversations live in CopilotKit Intelligence. The agent loop is TanStack AI behind AG-UI. The README says schedules are not a goal or event system, and that multi-specialist delegation is further work. drovr already has a stronger wake model, and it wakes a herdr pane instead of a headless turn. The pieces that look familiar are already in [plan-proposed.md](plan-proposed.md), or they are Slack, calls, and a document editor, which drovr does not need.

This review does not change the proposed design. The webhook filter in that file came from the [OpenBot review](openbot-review.md), not from here.

## What it is

The README calls OpenDots an open-source template for always-on coworkers that move between text, calls, and Slack. The badge says alpha. `package.json` is version `0.1.0`. It is a starting point you clone, not a hosted product.

A Space is a library of pages, stored locally, with a visual editor. A Dot is a specialist: a name, a role, instructions, and which tools it may use. Pages can be written by hand before any model is configured. Chat needs CopilotKit Intelligence and a model key. The dev server is Vite on `http://127.0.0.1:5173`, with the API started beside it. Node.js 24 and npm are the documented toolchain.

The README is careful about what was actually tried. Live Intelligence, model replies, and page chat were checked on 29 September 2026. Live OpenBot computer browsing, files, and shell were checked locally. Live speech and call controls were checked on 30 September 2026. Slack, and spoken work handed to the compute agent, still needed a connected service. Automatic Learning's cloud schedule and published skills did too.

## How agents run

`src/server/dot-agent.ts` is a `DotAgent` extending `@ag-ui/client`'s `AbstractAgent`. The turn is `@copilotkit/runtime`'s `BuiltInAgent`, with tools executed through `@tanstack/ai`'s `chat` and an OpenAI-compatible adapter. The default run limit is 90 seconds (`DEFAULT_AGENT_RUN_TIMEOUT_MS` in `platform-config.ts`), overridable with `AGENT_RUN_TIMEOUT_MS`. A settings change mid-turn aborts the run.

Scheduled turns and the compute side of a call do not go through the browser. `src/server/headless.ts` loads the runtime's `/info`, checks the Dot is one of its agents, and runs `@copilotkit/core`'s `IntelligenceAgent` against the Intelligence websocket. The comment in that file says the core runtime discovery is browser-only, so the server uses this Node client on purpose. The prompt is added as a user message. A scheduled prompt is marked with the id prefix `opendots:scheduled_task:`, so a replayed history can still tell it from something the owner typed.

There is no interactive coding-harness TUI. A search of `src/` for a handoff tool, a group conversation, or a delegate call found none. The computer's terminal is a bounded command inside an OpenBot container (`docs/COMPUTERS.md`), displayed in the Computer panel. It is not Claude Code, Codex, or OpenCode, and it is not a herdr pane.

The public-page browser is a separate process (`src/browser/`). `security.ts` resolves the URL and refuses private, link-local, and documentation addresses before a fetch. That browser is read-only and is not the Dot computer. When a computer is configured, research goes there instead of this process. When it is not, and the provider is `browser`, the Dot gets a `read_public_page` tool. The default research provider is Parallel.

## Messages between agents

The README states the limit directly: specialist Dots have separate roles and conversations, and multi-Dot group conversations and automatic delegation are further work. The data model matches that. A `Dot` has instructions and a list of Spaces. A `Conversation` binds one Intelligence thread to one Dot and one owner. Nothing in `src/server` routes one Dot's reply to another Dot.

Slack mentions are not agent-to-agent either. `slack-channel.ts` accepts a message only when the provider is Slack, the workspace id matches `slackTeam`, the actor is a human, and the user id is on `slackUsers`. It then runs that thread's agent as the single owner. A paused app posts a notice and does not run.

drovr's `@name` router, including plain panes and the hop cap, has no counterpart here. There is nothing to borrow.

## Profiles

A Dot is the persona: `name`, `instructions`, flags for research, memory, and connected apps, a Composio toolkit list, a default Space, and an optional Learning container id (`src/shared/types.ts`). The owner edits these in the app. They are rows in SQLite, not a directory of files the harness loads.

That is thinner than drovr's profile folder, and it is aimed at a chat specialist rather than a coding harness. Instructions are a column handed to the AG-UI agent on the turn. They are not `CLAUDE.md` or `AGENTS.md` in a run directory. MCP connections are per Dot (`connection-store`), with a URL and a token that the API does not return. Computer capabilities are per Dot and start disabled (`docs/COMPUTERS.md`).

No schedule file and no standing-goal file live next to the instructions. A scheduled task is a row in the `tasks` table, pointed at a thread.

## Routing and wakes

There is no router that chooses a Dot from the text. The owner opens a Dot's conversation, or Slack is wired to one `slackDotId`. Page chat is a thread bound to the specialist for that page.

Wakes are the background runner in `src/server/runner.ts`. A one-second timer claims at most one task. If a run is already active, the tick returns. The claim takes a lease of at least three minutes, or twice the run timeout. `src/server/index.ts` wires that claim to `platform.turn`, which calls `runThreadTurn` in the task's Intelligence thread and tags the prompt as a scheduled task. A task row with no thread binding fails and tells the owner to create the schedule from a conversation. `research()` remains the fallback inside `Runner` when no execute function is passed. Losing the lease or stopping the server marks the run `interrupted` and asks for an explicit retry, because a side effect may already have happened.

That is a single in-process queue for headless research turns. It does not look at a pane's working or blocked state, because there is no pane. drovr's queue already waits on herdr's status, keeps owner and agent messages ahead of wakes, and does not enqueue a standing-goal check while the profile is busy. OpenDots' "one at a time" rule is the smaller version of that, and it does not improve it.

## Proactivity

A task has a prompt and an optional `intervalSeconds`. The API accepts 60 seconds through one year, or null for a one-shot (`src/server/app.ts`). The runner stores `nextRunAt`. The UI can pause, cancel, or edit the interval (`TaskActions.tsx`). There is no cron expression, no timezone, no missed-tick policy beyond "if we were down, the next claim runs whatever is due," and no local pre-check that skips a wake when nothing changed.

The README says this plainly: schedules are recurring instructions, not a complete goal or event-trigger system, and event triggers are on the "extending the template" list. A 60-second floor would also fight drovr's token budget. drovr stays at 15 minutes for a schedule and one hour for a standing goal, with a hash that skips an unchanged checkout.

`drovr: quiet` has no analogue. A finished research run stores a result and sources. There is no "say nothing" outcome that suppresses a card.

## Approvals

Three different pauses, all inside the headless tool loop.

A page save can ask for a review card first. The owner gets Approve and save, or Decline. Approval writes the page in a Space the Dot may use. The same draft retried after approval returns the page that was already saved. A changed draft needs a new review (`README`, `src/shared/page-review.ts`).

Connected-service tools carry a `readOnly` hint. The comment in `connection-types.ts` says the hint is only a hint and the owner still decides. A tool that changes something returns `approval_required`. The model is then supposed to call `request_connection_action` with the server's approval id and a one-sentence summary. The pending record keeps the connection, the tool, and the arguments, and it expires after 60 minutes (`APPROVAL_TTL_MS`). Only the owner's approval runs it.

Computer browser, file, and shell permissions are switches on the Dot, off until the owner enables them. The server checks them. Revoking one cancels the in-flight request and does not undo a finished side effect. A global Settings pause aborts running tasks and calls.

drovr's approval card is the same idea at a different door: Allow once, Always allow, Refuse, for an off-list `@` and for `drovr propose` outside the workspace. OpenDots can pause every tool because the tool runs in its process. drovr cannot, and the plan already says so. The 60-minute expiry is a poor fit for one person who may look at the phone the next morning. drovr leaves the card until the owner answers. No change.

## Remote machines

The Dot computer is an OpenBot container, pinned in `deployment/computers` and started by OpenBot's supervisor (`docs/COMPUTERS.md`). The app derives a per-Dot credential from a master token it keeps. Files and the browser profile survive stop and start. The supervisor holds the Docker socket. Computers do not publish host ports in the container layout. Shell runs in the container, not on the OpenDots host. `COMPUTER_RUNTIME=runsc` can select gVisor if the host already has it. The template does not install it and does not set an egress policy.

That is the same container-per-agent model as OpenBot. It is not SSH to another machine the owner already uses. drovr keeps `herdr --machine` for those machines and does not add a supervisor.

## UI

The client is React under `src/client/`: Spaces, a page editor (Tiptap), Dot chat, a computer panel, call view, task rows, and connection cards. Theme follows the system, or light, or dark. There is no web app manifest and no service worker for the product. The `serviceWorkers: 'block'` hit in `src/browser` is the research browser refusing page service workers, not an installable app.

drovr's PWA, with Tasks as the first view, stays drovr's. OpenDots' task row is a research job with a status of queued, running, paused, completed, failed, interrupted, or cancelled. That is a job queue, not herdr's working, blocked, and done. The four card names already in the plan are the ones that match a pane.

## Channels

Slack uses `@copilotkit/channels` (`slack-channel.ts`). Setup is a managed Channels connection: one workspace id, an allowlist of Slack user ids, and one specialist. The README points at OpenTag as the pattern and at CopilotKit's hosted channel docs. Identity fails closed: a workspace or user that is not on the list returns null and the message is not the owner's.

Calls are WebRTC. `voice.ts` requires an audio SDP offer, `VOICE_API_KEY`, and `VOICE_MODEL`. One call at a time. The connection has 30 seconds to become active. Speech is a separate provider. Longer work during the call is delegated to the same compute agent, with a receipt written back into the thread (`voice-receipt.ts`). The call screen has a timer, captions, and mute. The README says the spoken handoff to compute was not verified against a live provider.

Text chat is the same Intelligence thread as the call and the schedule. There is no SMS path in this repository.

drovr does not add Slack, calls, or a speech provider. The owner's phone surface is the PWA. Voice was already on the Later list as voice input in the composer, which is dictation, not a realtime call beside a second model.

## Storage and hosted dependencies

Two stores, on purpose. `README` says conversation messages, tool calls, and run events go to the configured Intelligence deployment. OpenDots has no SQLite conversation log. SQLite, through Node's `node:sqlite` `DatabaseSync`, holds pages, Spaces, Dots, thread bindings, tasks, memories, call receipts, and computer metadata (`store.ts`, `workspace.ts`). Both files use WAL.

The model provider receives the conversation, including page text the Dot is allowed to see, and tool results. Public-web research sends the query and chosen URLs to Parallel unless `WEB_SEARCH_PROVIDER=disabled`. Composio, when `COMPOSIO_API_KEY` is set and the owner turns connected apps on, sees tool arguments. Speech and Slack send data to those providers when used. SDK telemetry is tagged `OpenDots` and turns off with `COPILOTKIT_TELEMETRY_DISABLED=true` or `DO_NOT_TRACK=1`. A local Intelligence evaluation still needs a CopilotKit sign-in.

drovr's message log is the product. It stays in the hub's own SQLite file, on `better-sqlite3`, for the reason already in the plan: Node's `node:sqlite` was still a release candidate in the Node 26 docs checked on 29 October 2026. OpenDots using `node:sqlite` does not change that. Intelligence as the conversation store is the dependency the OpenDuet review already refused.

## License, maturity, activity

License is MIT. The `LICENSE` file says Copyright (c) Atai Barkai, with no year. `package.json` names the same person as author.

From the GitHub API on 29 October 2026, and from this clone:

| Fact | Value |
| --- | --- |
| Created | 29 September 2026 |
| Default branch | `main` |
| Tip reviewed | `80913249` on 22 October 2026 |
| Commits on `main` | 66 |
| GitHub releases | 0 |
| Package version | `0.1.0` |
| Stars | 6164 |
| Forks | 896 |
| Open issues | 77 |
| Status badge | alpha |
| Archived | no |

The README's own verification notes stop at 30 September 2026 for live calls, and they leave Slack unverified. Sixty-six commits and no release, three weeks after the first live checks, is an early template with a lot of attention. It is not a base to fork. OpenBot's skin named OpenDots is a stylesheet over OpenBot, not this repository. Building on this tree would still mean tracking Intelligence, the Channels SDK, TanStack AI, and the pinned OpenBot computer images.

## Against drovr's requirements

| Requirement | OpenDots at this commit | Plan |
| --- | --- | --- |
| herdr does the heavy lifting | Its own API, Vite app, and optional OpenBot computers | Unchanged |
| Native interactive TUIs | AG-UI plus TanStack AI. Container shell for computer tools | Unchanged |
| Router is core | The owner, or one Slack specialist, picks the Dot | Unchanged |
| `@` profiles and plain panes | No Dot-to-Dot messaging | Unchanged |
| Proactive hub profiles | Interval tasks, minimum 60 seconds, one headless run at a time. No event triggers, no quiet skip | Unchanged. drovr's floors and the pre-check stay |
| One person, their machines | Single owner. Computers are containers on this deployment | Unchanged |
| Own PWA | A web app, not an installable PWA | Unchanged |
| As simple as possible | Intelligence for every conversation, plus optional Parallel, Composio, voice, Slack, and Docker computers | Nothing added |

## What was considered, and what was left

These are the ideas that look close to drovr, and why none of them become an edit.

| Idea in OpenDots | Where it would have landed | Why it did not |
| --- | --- | --- |
| A scheduled prompt in the same thread the owner already has open | The wake header in Proactive profiles | A drovr wake is already one prompt in the profile's open herdr session |
| One background run at a time, and a pause that stops new ones | Queue and busy state | The router already waits while a pane is working or blocked, and Stop cancels queued wakes without starting another |
| Approve a write, let a read proceed | Approvals | Already the split between workspace work and `drovr propose`. OpenDots can do it inside the tool loop. drovr cannot |
| Mark a crashed run interrupted and ask before retrying | Failure modes | herdr keeps the pane across a drovr restart. The service reconciles and does not invent a second run |
| Slack allowlist of one workspace and named users | Later | Slack is not a v1 channel |
| A call beside the chat, with work delegated to the same agent | Later, and only as composer dictation if it is ever built | A second realtime model is a new token path. The plan does not add one |

Left with those:

- Spaces, the page editor, and the save-review card.
- Parallel, Composio, and the public-page browser.
- OpenBot computers as the place a Dot acts.
- CopilotKit Intelligence as the conversation log, and `node:sqlite` for the rest.
- Channels SDK Slack, and WebRTC calls.
- The 60-second schedule floor.

## Sources

- Repository `CopilotKit/OpenDots`, commit `8091324942b86789ed0da7facbee855145d933b0`, 22 October 2026. GitHub API metadata read 29 October 2026.
- `README.md`, `LICENSE`, `package.json`, `docs/COMPUTERS.md`, `docs/SETUP.md`, `docs/CONNECTIONS.md`.
- `src/server/dot-agent.ts`, `headless.ts`, `runner.ts`, `app.ts`, `store.ts`, `workspace.ts`, `slack-channel.ts`, `voice.ts`, `platform-config.ts`.
- `src/shared/types.ts`, `scheduled-message.ts`, `connection-types.ts`.
- `src/browser/security.ts`.
