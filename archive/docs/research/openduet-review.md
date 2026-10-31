# OpenDuet review

Reviewed [CopilotKit/OpenDuet](https://github.com/CopilotKit/OpenDuet) at commit `677e0fcd148d80b99dd788c6d6f9c1c9f40a72db` (28 October 2026, "Enable OpenDuet's public-web research skill"). The working notes are in [plan-duet-takeaways.md](plan-duet-takeaways.md). This file is the longer pass over the README, the docs under `openbot/docs/`, the tenant package, and the agent, routing, handoff, task, and computer source. Nothing here was run. The repo has no published release to install.

**Verdict: borrow the product ideas below. Do not adopt OpenDuet, and do not build drovr on it.**

OpenDuet is a proactive personal assistant: mail, calendar, a morning brief, tasks, and a browser in a container. drovr is a router and a profile folder in front of herdr panes. The two meet at the product surface (a profile that wakes itself, a card the owner can answer, a pause before something leaves the workspace) and nowhere in the runtime. Putting drovr on OpenDuet would replace the native TUI with a headless AG-UI loop, replace herdr with a container per bot, and replace SQLite with Postgres plus a CopilotKit cloud project. That is the opposite of the constraints.

The [proposed design](plan-proposed.md) now includes the borrowed pieces. [plan-original.md](plan-original.md) is unchanged.

## What changed in the proposed design

These are the edits, and why.

1. **Difference 11.** A hub profile wakes on its own. The router sends the prompt into that profile's herdr pane. Schedules, webhooks, local watchers, and standing goals are that wake. v1 is hub-only. This is the requirement that OpenDuet's morning brief and routines made concrete, done with `herdr agent prompt` instead of a headless turn.

2. **Difference 12.** Tasks is the first PWA view, with Working, Needs input, Ready for review, and Resolved. An optional morning job stores that day's brief. A reply can end with `drovr: choices:` and the PWA shows those words as buttons. OpenDuet's Tasks tab and reply chips are the source of the labels and the buttons. The card opens the pane, not a second conversation.

3. **Difference 13.** `schedule.json` and `goals.json` live in the profile folder, next to the instructions, MCP, and skills. OpenDuet keeps its name, bots, and skills in one tenant folder. drovr already stored a profile as a folder; the new files are the schedule and the goals.

4. **Difference 9, rewritten.** An `@` from another agent that matches no allow row waits on a card: Allow once, Always allow, Refuse. The same card covers `drovr propose` when the path, command, or post leaves the profile workspace. The earlier draft refused the message immediately and called the allow list advisory only. The list still does not sandbox herdr. An agent can call herdr itself, and there is still no turn hook in front of every harness tool. herdr 0.9.5 does not install one, and OpenDuet's gateway only works because every tool call returns to its server.

5. **New section, Proactive profiles.** Floors (15 minutes for a schedule, 1 hour for a goal, 3 hours unless the owner picks slower), one queued wake per job or trigger, missed ticks skipped rather than replayed, a local hash so an unchanged goal does not wake the pane, `drovr: quiet` when a wake did run and nothing needs the owner, event payloads wrapped as data, and the queue rules below.

6. **Queue.** A schedule or event is a normal message and waits while the pane is working, blocked, or unknown. It does not open a second pane. Owner and agent messages in the same batch go out before wakes. A standing-goal check does not enqueue at all while the profile is busy, already queued, or already in Working or Needs input. A wake does not auto-relay. Further `@` traffic goes through `drovr msg` and the same approval rule.

7. **Data model.** `wake_cursors`, `wakes`, `tasks`, `approvals`, and `approval_rules`. Message state `awaiting_approval`. Extra workspace paths on `profile.json`.

8. **PWA.** Five views, Tasks first. Profiles edits the schedule, goals, triggers, workspace paths, and saved Always allow rules. The fleet counts on Tasks are read from SQLite and the herdr snapshot and do not wake anyone.

9. **Stage 3.** An off-list sender no longer ends as an immediate `refused`. The message stays `awaiting_approval` and is not prompted. The buttons are stage 4.

10. **Stage 4.** Proactive hub profiles: schedules, webhooks, watchers, goals, Tasks, the brief, approval cards, choice buttons. Acceptance is on a real hub herdr. No wake runs for a profile on a second machine.

11. **Later.** Schedules and webhooks left this list. A named channel as a first step toward rooms, scanning outgoing text for secrets, voice input, and push notifications joined it. Those three are in the notes as "later, maybe", and they stay out of v1.

12. **Refuses.** A headless wake, a container per profile, a hosted memory service, and a second model that picks who to wake are named next to the existing refusal of `claude -p` and SDK loops.

The notes leave three questions open. The plan answers them:

- A standing goal defaults to every 3 hours, with a floor of 1 hour. If its declared inputs (git status, paths, trigger ids) are unchanged, the pane is not woken. A goal with no inputs is labeled as one that wakes every interval.
- A schedule that fires while the profile is busy waits as one queued message. A second tick of the same job does not stack. Ticks more than five minutes late are skipped.
- An allow-list hit and an Always allow rule proceed with no card. Everything else that comes through drovr is a card on Tasks. v1 does not push.

## What OpenDuet is

OpenDuet's README calls it an open-source proactive agent that starts the day with a brief, keeps working while the person is away, and asks before it sends, pays, signs, or deletes. It is CopilotKit's project in that category. The README says it is independent of Anthropic.

In the repository, OpenDuet is a tenant package on top of OpenBot, which is the platform in `openbot/`. The package is `openbot/examples/openduet/`:

| File | Role |
| --- | --- |
| `brand.yaml` | Product name. `tenant.id` is `openduet` |
| `agents.yaml` | The OpenDuet bot, plus slots for a remote AG-UI agent and a harness picked at startup |
| `channels.yaml` | Two conversations, each pinned to one bot |
| `model.yaml` | Provider `openai`, default model `gpt-5.6-terra` |
| `skills.yaml` | Slash-commands: morning brief, first day, email reply, public-web research, skill authoring, bot authoring |

`scripts/start.sh` starts Postgres, each bot's computer, migrations, the API, a routine worker, and the app. The app is at port 3010, the API at 3001. The README says a hosted OpenDuet image and an OpenDuet deploy guide are not published. The Docker and Helm docs deploy OpenBot's own image.

CopilotKit Intelligence is required. The README says the server will not start without its key. Threads and memory live there, not in the local database. The local database is PostgreSQL with pgvector, for policy, approvals, audit, credentials, channels, and tasks. The runtime can send usage telemetry to CopilotKit. `COPILOTKIT_TELEMETRY_DISABLED=true` or `DO_NOT_TRACK=1` turns that off (`docs/telemetry.md`).

## How agents run

Agents are HTTP endpoints that speak AG-UI. `openbot/docs/architecture.md` lists the processes: `agent-computer` on 4100 (Chromium, `/workspace`, a shell), `agent-bot` on 4200 (a hand-written proof of concept), `agent-langgraph` on 4201, and an optional `agent-<framework>` harness on 4202. The README names LangGraph, Mastra, CrewAI, Pydantic AI, Google ADK, or a hand-written endpoint. The tree contains those adapters, including `agent-claude-sdk`.

`agent-claude-sdk` is the Claude Agent SDK behind FastAPI, not the interactive `claude` TUI. `requirements.txt` pins `claude-agent-sdk==0.2.152` and `ag-ui-claude-sdk==0.1.5`. `src/main.py` mounts `add_claude_fastapi_endpoint`. `src/model_mode.py` feeds history into `ClaudeSDKClient.query` through a `SessionWorker`. The model-only adapter sets `options.tools = []`, which its comment says the SDK maps to `--tools ""` (no Bash, Read, or Edit) and `permission_mode = "dontAsk"`. Credentials are `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`, and the process exits if both are set. That is a headless SDK loop with a subscription token as one possible credential. drovr does not use that loop. A headless Claude Code run was already measured at about 1.7 times the tokens of the interactive TUI, and this path does not resume a herdr pane.

Scheduled and group turns use the same headless path. `openbot/server/src/channels/group.ts` says each bot gets its own Intelligence thread and each turn runs through `toolkit/run-turn.ts`. That file's header describes one headless turn driven in-process against the CopilotKit runtime, including a hand-copied lock around the Intelligence gateway. `openbot/docs/routines.md` says a routine fires on a cron, runs as the person who created it, and posts back into the channel. The floor is 15 minutes. A person may have 20 routines enabled. Missed windows are skipped, not replayed. The sweep is a second process (a worker locally, a CronJob on Kubernetes) because a timer inside every API replica would double-fire. drovr is one process on one hub, so the plan keeps the skip rule and the floor and does not add a worker.

The computer is a container, created by a supervisor that holds the Docker socket (`architecture.md`). With `OPENBOT_ONE_COMPUTER_EACH`, each bot gets a container, a workspace volume, and a browser profile. `agent-computer/src/shell.ts` runs a command with `spawn`, a default timeout of 120 seconds, and a 64 KiB output cap, after the server gateway has already allowed it. The shell inherits PATH, locale, terminal names, and proxy variables, not the process environment. There is no terminal multiplexer. A search of the tree for `herdr`, `tmux`, and `zellij` found no matches. The live view in the app is the browser, proxied over a websocket, plus an activity list of commands that is held in the browser tab and discarded on reload. The durable record is the audit log.

This cannot sit under herdr. herdr already owns the pane, the TUI, the session resume, and the SSH machine. OpenDuet would be a second place the agent runs.

## Messages between agents

The notes say OpenDuet has no agent-to-agent messaging, and that its channels are views onto one user thread. The product channels match the second sentence. `channels.yaml` pins each conversation to one bot. `openbot/docs/coworkers.md` says a channel is a conversation with one coworker and one Intelligence thread, and the pin is fixed for the life of that thread. `server/src/openduet/channels.ts` is the OpenDuet feature on top: a named workstream with a purpose, still one person's conversation. The notes are right about that surface.

The platform underneath does hand work from one bot to another. `server/src/agents/handoff.ts` is the desk. The tool is `message_bot` (`handoff-tool.ts`), with a typed envelope: `task`, optional `constraints`, optional `expecting`. The comment in `handoff.ts` says free text was rejected because the receiving bot would have to guess the intent. A hop needs a bot-to-bot grant, an actor the asking person is allowed to see, and a depth cap carried in a signed assertion so the model cannot edit it. Defaults in `server/src/config.ts` are `BOT_HANDOFF_MAX_DEPTH=1` and `BOT_HANDOFF_MAX_PER_RUN=3`. Zero switches handoff off. A refusal is a sentence back to the asking bot, plus an `agent.handoff_refused` audit row, not a thrown error. Group replies that contain `@Name` use that same desk (`channels/group.ts`): same grant, same depth, same queue. A person's message is depth zero.

That is real inter-agent messaging, and it is still not drovr's router. It starts another headless AG-UI turn in another Intelligence thread. It does not address a live pane, an ordinary named agent with no profile, or a machine reached by `herdr --machine`. The grant is an administrator's record. drovr's allow list is one person's list of who may `@` whom, and a miss is now a card rather than a grant table. The typed envelope is a reasonable idea for a tool call. drovr's messages are the text the sender wrote, which is what `@name` already is. The plan does not adopt `message_bot`.

Delivery in `server/src/delivery/router.ts` is a different router. It pairs Slack, Teams, SMS, and push with a person and runs a headless turn as them. It does not choose which coding agent wakes.

## Profiles

A coworker is a durable bot profile (`coworkers.md`). `agents` stores the runtime endpoint. `agent_profiles` stores name, title, role, owner, and visibility. The role is sent as a system message on every run. Package agents are public and ownerless. People create more coworkers in the app, publish them to a team, and attach skills. Skills are instructions invoked with `/`. `skills.yaml` is explicit that a skill grants nothing: the tools it names are intersected with grants the bot already has. A long skill exists so a bot with many tools is offered only the tools of the skills that match the message.

drovr's profile was already a folder of instructions, MCP, and skills, materialized into the run directory the harness reads. OpenDuet's folder is a deployment-wide YAML package, not a per-harness cwd, and the role is injected as a system message on every headless turn. drovr keeps writing files the harness loads itself, because herdr's cold resume command does not carry flags. The plan adds `schedule.json` and `goals.json` to that folder so the proactive setup copies with the profile. It does not add a system-message injection path.

## Routing

`server/src/routing/classify.ts` runs when a new channel is created and the person did not name a coworker with `@`. The prompt lists each coworker's id, name, role, and which systems it can reach, and asks for JSON with an id, a reason, and a confidence. Below 0.6 the decision falls back to a default coworker (`picked-harness`, else the first public one). Failures (unreachable, unparsed, off-roster) also fall back and are labeled so an operator can count them. The comment at the top says this is channel creation, not a decision on every turn. After that, the channel stays pinned.

drovr's router is not this. The target is the `@name` the sender wrote, or the profile the schedule, trigger, or goal already names. A model in front of that would spend a call to guess a pane the owner can already name, and it can guess wrong. The plan leaves a classifier on the Later list.

`@` inside OpenDuet is a coworker name on the roster. It is not a herdr agent name, and it is not a plain pane. Untagged text does not stay untagged; the classifier assigns it. drovr leaves untagged owner text on the pane the owner is looking at.

## Remote machines

OpenDuet's "other computer" is a container on the same deployment. The supervisor creates, stops, resets, and lists those containers. Compose binds it to localhost. There is no SSH profile, no allowlist of remote CLI commands, and no notion of a hub plus the person's other machines. Slack and Teams are ways to reach the person, through OpenBot's delivery layer. The README says sign-in for a team, and Slack and Teams, are OpenBot's.

drovr already reaches other machines with `herdr --machine`. Stage 4 does not move proactive wakes onto those machines. A profile that should wake on its own runs on the hub, where the service can subscribe, read the transcript, and launch.

## The UI

The app is a React/Vite client in `openbot/app/`, phone-first, with Chat, Tasks, Make, channels, a live browser, approvals, and an admin surface for computers, grants, skills, and audit. OpenDuet's README table is the part that is real today: the morning brief, triage of mail into what needs the person and what can wait, Tasks, Make (pages, decks, dashboards), channels with a name and a color, reply chips, voice dictation when a transcription provider is set, and a setup checklist.

Tasks are derived, not stored as a status enum that the server updates by hand. `server/src/openduet/task-store.ts` computes, first match wins: `needs_input` if an approval or a question is waiting, `working` if the turn is queued or running, `resolved` if the person marked it done, `failed` if the turn ran out of attempts, `ready_for_review` if the turn finished and wrote a reply. The README's words are Working, Needs input, Ready for review, and Resolved. drovr uses those four. A wake that cannot be delivered is Needs input with the reason, rather than a fifth Failed column. OpenDuet's task is its own Intelligence thread so Chat stays one thread. drovr's card opens the herdr pane or the message, because the pane is the work.

Approvals are a gateway. `architecture.md` says every browser, file, and MCP call returns to the server, which resolves the target, evaluates policy, writes an audit row, and only then acts. The person sees Refuse, Allow once, and Always allow. A message to other people always asks, and the card shows who it goes to and the text. Deny rules and a fail-closed policy engine sit under that. The computer does not decide policy. While the person has the browser, bot actions are refused rather than queued.

drovr cannot copy that loop without standing inside the harness. The plan's card is the same three answers, used at drovr's own door: an off-list `@`, and `drovr propose` for a command, path, or post outside the workspace. Always allow stores the exact prefix or host the card showed, for that profile, not a pattern the agent picks. The profile page says the harness can still act on its own. That is the honest remainder of "the allow list is not a sandbox."

Reply chips in OpenDuet are a tool, `suggest_replies`, offered to every bot, with evals under `evals/reply-chips/`. The plan's buttons are a line the agent prints, `drovr: choices:`, because there is no tool side-channel. The owner taps one and the router sends that word. drovr does not invent choices.

Make, Gmail, Calendar, and public-web research are out of scope. The notes say so. Triage of an inbox is not a coding-agent fleet.

## License, maturity, activity

License is MIT, copyright 2026 CopilotKit (`LICENSE`). That would allow reuse of code. The verdict does not depend on the license. The runtime is the wrong shape even if the license is fine.

Activity, from the GitHub API on 29 October 2026:

| Fact | Value |
| --- | --- |
| Created | 21 October 2026 |
| Default branch | `main` |
| Tip reviewed | `677e0fcd` on 28 October 2026 |
| Commits on `main` | 73 |
| GitHub releases | 0 |
| Stars | 1368 |
| Forks | 167 |
| Open issues | 7 |
| Archived | no |

The README badge says early development. A commit on 27 October, `285423d18`, is "Describe only what works today in the README." The feature table is written against that rule, and the tree is already large: the app, the server, many agent adapters, a desktop shell, Helm charts, and evals for triage, voice, and reply chips. Star count over eight days is attention. It is not a stable API. Intelligence is an external service the process refuses to boot without. drovr's message log cannot live there.

Building on it would also mean tracking OpenBot's server, the CopilotKit runtime's private methods (`run-turn.ts` says the lock calls are `ɵ`-prefixed and restated by hand), and a tenant package whose agents.yaml prompt is hundreds of lines of product voice for a phone chat. drovr's earlier reason for leaving a forked UI was that kind of carrying cost. OpenDuet would repeat it.

## Against drovr's requirements

| Requirement | OpenDuet | Plan |
| --- | --- | --- |
| herdr does the heavy lifting | Own server, worker, supervisor, container per bot. No panes, no `herdr --machine` | Unchanged. Wakes call the router, which calls herdr |
| Native interactive TUIs only | AG-UI over HTTP, Claude Agent SDK query loop, container shell | Unchanged. A wake is `herdr agent prompt` into the open session |
| Router is core | Channel pin, plus a model that assigns untagged text at creation. `message_bot` is a tool with a depth cap, not a pane router | Unchanged, and it is now also the only path that types a schedule, event, or goal |
| `@` profiles and plain named panes | `@` is a coworker on the roster. Untagged text is assigned. No plain pane | Unchanged |
| One person, their machines | A deployment, team bots, Slack and Teams, Docker computers | Unchanged. Webhooks arrive on the same private front. Wakes stay on the hub |
| Own PWA | OpenDuet's app is the product | Unchanged. Tasks, cards, and choice buttons are views on drovr's service |
| As simple as possible | Postgres, pgvector, Intelligence, Docker, a worker, a policy engine | The new surface is files the owner edits, rows in the existing SQLite file, and cards. No second runtime |

## What was borrowed, and what was left

Borrowed, and now specified in [plan-proposed.md](plan-proposed.md):

- A hub profile that acts without an `@`, by the router waking its pane.
- Per-profile cron with a saved prompt, including an optional morning brief. The 15-minute floor and the "skip missed ticks" rule come from OpenDuet's routines.
- Webhooks (GitHub pull request, issue, and workflow run as the examples) and local watchers, each reduced to a short prompt. The payload is data, not instructions.
- A standing goal with a periodic check that stays quiet when inputs are unchanged, and `drovr: quiet` when a wake ran and nothing needs a person.
- Task cards: Working, Needs input, Ready for review, Resolved. Each opens the pane or the message.
- Approval cards with Allow once, Always allow, and Refuse, for off-list agent messages and for `drovr propose` outside the workspace. The decision is logged. The rule that asked is printed on the card.
- Choice buttons, from text the agent wrote.
- Schedule and goals in the profile folder, so a profile stays a directory of plain files.

Left, on purpose:

- AG-UI, the Claude Agent SDK loop, LangGraph and the other adapters, and any per-bot model client.
- CopilotKit Intelligence, Postgres, pgvector, and Docker computers.
- The intent classifier, team bots, Slack, Teams, and SMS.
- Gmail, calendar, triage, Make, and public-web research.
- OpenDuet's in-loop tool gateway, its CEL policy, and its audit product. drovr does not see harness tool calls.
- `message_bot`'s typed envelope and grant table.
- A separate routine worker, reply-chip tool calls, voice, secret scanning, and channels-as-rooms. The last three are on the Later list with the rooms that were already deferred.
- The OpenDuet app. The PWA stays drovr's.

## Sources

- Repository `CopilotKit/OpenDuet`, commit `677e0fcd148d80b99dd788c6d6f9c1c9f40a72db`, 28 October 2026. GitHub API metadata read 29 October 2026.
- `README.md`, `LICENSE`, `docs/telemetry.md`.
- `openbot/docs/architecture.md`, `coworkers.md`, `routines.md`, `README.md`.
- `openbot/examples/openduet/`: `agents.yaml`, `channels.yaml`, `skills.yaml`, `model.yaml`, `brand.yaml`.
- `openbot/agent-claude-sdk/src/main.py`, `adapter.py`, `model_mode.py`, `requirements.txt`.
- `openbot/agent-computer/src/shell.ts`.
- `openbot/server/src/routing/classify.ts`, `routing/service.ts`.
- `openbot/server/src/agents/handoff.ts`, `handoff-tool.ts`, `config.ts` (`handoffCaps`).
- `openbot/server/src/channels/group.ts`.
- `openbot/server/src/delivery/router.ts`.
- `openbot/server/src/openduet/task-store.ts` (status derivation).
- `openbot/toolkit/src/run-turn.ts` (headless turn).
- Working notes: [plan-duet-takeaways.md](plan-duet-takeaways.md).
