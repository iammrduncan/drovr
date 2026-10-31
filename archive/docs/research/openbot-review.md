# OpenBot review

Reviewed [CopilotKit/OpenBot](https://github.com/CopilotKit/OpenBot) at commit `aafe043c7bac95b838351e5006c0ecd868efb634` (28 October 2026, "fix(desktop): never reattach a previous installation's volumes on a fresh install"). That commit is the default-branch tip cloned on 29 October 2026. It is newer than the OpenBot tree vendored inside OpenDuet at `677e0fcd`. The [OpenDuet review](openduet-review.md) covers the tenant package and the product ideas already taken from it. This file is the platform itself: README, `docs/`, and the server, agent, computer, and responsibility source at this commit. Nothing here was run.

**Verdict: do not adopt OpenBot, and do not build drovr on it. Borrow one webhook rule. Leave the rest.**

OpenBot is the agent platform OpenDuet runs on. A Bot is an AG-UI endpoint. Each Bot can have a container with a browser, files, and a shell. Every tool call returns to a gateway before it acts. Threads live in CopilotKit Intelligence. That is a headless runtime with its own computers. drovr's agents are harness TUIs in herdr panes, and the router is what wakes them. OpenBot would replace both.

The one rule worth taking is already in [plan-proposed.md](plan-proposed.md): a webhook names the repository and the event types it accepts, a bad or missing GitHub signature is refused, and a repeated body does not wake the pane. The rest of OpenBot's responsibilities, gateway, and channels are the headless version of things the proposed design already does with a herdr prompt, or they are surfaces drovr does not need.

## What changed in the proposed design

One edit, in the Events section, plus the failure rows and the stage 4 webhook check that follow from it.

A GitHub trigger now requires `X-Hub-Signature-256`. A missing signature is a 401, same as a bad one. The trigger names one `owner/name` repository; any other repository is a 403. It lists event types such as `pull_request.opened`; any other type is stored as `skipped` and does not become a prompt. An empty list still means the pull-request, issue, and workflow-run extracts v1 already builds. The identity of a delivery is a hash of the raw body, so a replay does not wake the pane a second time.

That comes from `server/src/responsibilities/github.ts` and `triggers.ts` at this commit. OpenBot verifies the signature with the raw body, refuses a repository that is not the one registered, and types the event as `pull_request.opened` rather than waking on every GitHub event. It also refuses to use `X-GitHub-Delivery` as the identity, because that header is not covered by the signature. drovr's previous wording checked the signature only when the header was present, and it would have prompted on any of the extracted event types. A busy pull request would have woken the profile on every synchronize. The filter drops those before a prompt exists.

No other section changed. Schedules, standing goals, task cards, approval cards, and the native-TUI rule stay as they were after the OpenDuet pass.

## What it is

OpenBot's README calls it an agent platform you clone and run yourself. There is no hosted product. The badge says beta. A fresh clone sets `OPENBOT_SINGLE_USER=true`, so every request is one administrator until an identity provider is configured. The example tenant is `examples/fintech`: a General Assistant, a Knowledge bot, an optional Risk Analyst, and ten catalog roles (expense review, meeting follow-ups, release notes, ticket triage, and others) that are YAML, not code.

`scripts/start.sh` starts Postgres, the shipped bots, a computer supervisor, migrations, the API on port 3001, a routine worker, and the React app on port 3010. Bun 1.4 or newer is required. The published image is `ghcr.io/copilotkit/openbot`. The latest GitHub release is `v0.2.0`, published 12 October 2026. `main` has moved on since that tag.

The server refuses to start without `DATABASE_URL`, `KEY_ENCRYPTION_KEY`, `INTELLIGENCE_API_URL`, `INTELLIGENCE_GATEWAY_WS_URL`, and `INTELLIGENCE_API_KEY`. Intelligence can be CopilotKit's managed service or a local Docker evaluation on a Mac. The README describes that local licence as a 30-day preview, renewed with `npx copilotkit@latest local renew`, not as a production install. A self-hosted Intelligence still needs its own licence or memory is refused.

## How agents run

A Bot is any HTTP endpoint that speaks AG-UI. The README names LangGraph, Mastra, CrewAI, Pydantic AI, Google ADK, or a hand-written endpoint. The tree has an adapter for each, plus `agent-claude-sdk`.

`agent-claude-sdk` is the Claude Agent SDK behind FastAPI. `requirements.txt` pins `claude-agent-sdk==0.2.152` and `ag-ui-claude-sdk==0.1.5`. `src/main.py` mounts an AG-UI endpoint. `src/model_mode.py` drives `ClaudeSDKClient.query`. The model-only mode sets tools to an empty list, which the adapter comment says the SDK maps to `--tools ""`, and sets `permission_mode` to `dontAsk`. Credentials are an API key or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`. That is a headless query loop. It is not the interactive `claude` TUI, and it does not resume a herdr session.

Scheduled work, responsibilities, and group turns use the same headless path. `toolkit/src/run-turn.ts` runs one turn in-process against the CopilotKit runtime. `docs/routines.md` gives that turn a 15-minute floor, a cap of 20 enabled routines per person, and a rule that missed windows are skipped. The sweep is a separate worker, because a timer in every API replica would fire twice. drovr is one process, so it keeps the floor and the skip and does not add a worker. Those choices were already in the proposed design from the OpenDuet pass. They are OpenBot's.

The computer is a container. `agent-computer` on port 4100 holds Chromium, a `/workspace`, and a browser profile. The supervisor on port 4500 creates one container per Bot when `COMPUTER_SUPERVISOR_URL` is set, and it holds the Docker socket. `agent-computer/src/shell.ts` runs a command with `spawn` after the gateway has allowed it, with a default timeout of 120 seconds and a 64 KiB output cap. The child inherits PATH, locale, terminal names, and proxy variables, not the rest of the environment. A search of this tree for `herdr`, `tmux`, and `zellij` found no matches. `COMPUTER_RUNTIME=runsc` selects gVisor where the host already has it.

This commit also adds an OpenBot Recorder and an OpenBot Browser: a person does the task in their own browser, and the bot is taught from that recording (`README` history, commit message on `f678b330`). The recorder masks secrets before anything leaves the browser. That is a demonstration feature for the container browser. drovr does not have a container browser, and the harness already has its own login. Nothing from the recorder moves into the plan.

## Messages between agents

`server/src/agents/handoff.ts` is the desk. The tool is `message_bot` (`handoff-tool.ts`): a typed envelope with `task`, optional `constraints`, and optional `expecting`. A hop needs a bot-to-bot grant and a depth carried in a signed assertion. Defaults in `server/src/config.ts` are one level deep and three bots per run. Zero switches the tool off. A refusal is a sentence back to the asking bot and an audit row. A group conversation gives each bot its own Intelligence thread, and a reply that names a peer as `@Name` uses the same desk (`server/src/channels/group.ts`).

That is inter-agent messaging inside one deployment. It starts another headless turn. It does not address a live terminal pane, an ordinary named agent with no profile, or a machine reached over SSH. drovr's router already does those three, with a hop cap of 4 and an approval card when the sender is off the allow list. The typed envelope stays out. drovr messages are the text the sender wrote.

`server/src/delivery/router.ts` is a different router. It pairs Slack, Teams, SMS, and push with a person and runs a headless turn as them. The README route `/bots/:id/reach` is that surface. It does not choose which coding agent wakes.

## Profiles

A coworker is a row in `agent_profiles` plus a runtime endpoint in `agents`. The standing role is sent as a system message on every run (`docs/coworkers.md`). Package agents come from `agents.yaml` or from one file per agent under the tenant's `agents/` directory. People create more from `/bots`, set visibility, attach skills, and publish a bot to a team. Skills are `/` instructions. Naming a tool in a skill grants nothing; the offer is intersected with grants the bot already has.

drovr's profile is a folder the harness reads from its run directory, because herdr's cold resume command does not carry flags. OpenBot injects the role as a system message on a headless turn. Those are different mechanisms. The folder already holds instructions, MCP, skills, `schedule.json`, and `goals.json`. This review does not add a system-message path.

## Routing and wakes

Untagged text at channel creation is classified by a model (`server/src/routing/classify.ts`). The prompt lists each coworker's role and which systems it can reach. Below a confidence of 0.6, or on any failure, the decision falls back to a default coworker. After that, the channel stays pinned to one bot. `@` in that flow is a coworker on the roster, not a herdr pane.

Responsibilities are the newer wake path, and they are the part of this commit that looks most like drovr's proactive profiles. `server/src/responsibilities/types.ts` stores a title, an instruction of up to 6,000 characters, success criteria, and up to 20 subscriptions. Sources include manual, schedule, slack, github, webhook, linear, sentry, pagerduty, email, and connector. `triggers.ts` says every kind ends the same way: an ingress route checks the vendor's signature, applies a narrow filter, and enqueues one run. The engine (`engine.ts`) claims that run from the shared work queue and calls the normal headless turn. A paused bot is skipped, not failed. There is no second engine.

The filter is the piece drovr was missing. `triggerFilterSchema` takes a list of event types, where `issues` matches `issues.opened`, and one optional dotted field that must equal a value. A GitHub trigger can lock `owner/name`. Empty event types mean every event that kind delivers. drovr's version is narrower on purpose: the owner lists the types that may prompt, an empty list means the three GitHub shapes v1 already extracts, and there is no dotted-field language. Linear, Sentry, PagerDuty, and email are not v1 triggers.

Success criteria are a second text field so the bot knows what finished looks like. drovr's goal text can say that. A separate field would not change when the router wakes the pane, so the plan does not add one.

A responsibility run is still a headless AG-UI turn into an Intelligence thread. drovr's wake is a prompt in the profile's herdr pane. The plan keeps that.

## Proactivity

Routines and responsibilities are both proactive, and they overlap.

A routine is a sentence turned into a cron, fired by the worker, posted back into the channel as the person who created it. Floor 15 minutes. Cap 20. Ten consecutive failures switch it off. Missed windows are skipped rather than replayed.

A responsibility is a lasting goal on one bot, with subscriptions. A matching event queues a run. A schedule subscription is one of those sources. The bot's own tools can create and update responsibilities (`responsibilities/tools.ts`), which is how a conversation grows standing work. drovr does not give the agent a command that creates a schedule or a goal. The owner edits the profile files. That stays, because a model that can schedule itself is how a floor gets talked around.

drovr already has the routine floor, the skip-missed rule, standing goals with a local pre-check, and `drovr: quiet`. OpenBot does not have drovr's "hash the checkout and do not wake when it is unchanged." Its skip is "the bot is paused" or "the event did not match the filter." The hash stays drovr's. The event-type filter is what this review adds.

## Approvals

The gateway is the product boundary. `docs/architecture.md` says every browser, file, and MCP call returns to the server, which resolves the target, evaluates a CEL policy, writes an audit row, and only then calls the computer. Deny rules run before allow rules. A missing or empty policy permits nothing. A broken deny rule denies. The shipped startup default is an explicit allow-all, replaced by `AGENT_COMPUTER_POLICY` or a saved administrator policy. The person sees Refuse, Allow once, and Always allow. A message to other people always asks. While a person holds the browser, bot actions are refused rather than queued.

drovr cannot sit in that loop. herdr 0.9.5 does not install a turn hook drovr could use, and the plan refuses to add one. The approval card already in the plan is the same three answers, at drovr's own door: an off-list `@`, and `drovr propose` outside the workspace. OpenBot's CEL language, team rules, and audit export are a multi-user product. They are not a fit for one person's herdr panes. The plan does not grow a policy engine.

## Remote machines

OpenBot's other computer is a container on the same deployment. The supervisor creates, stops, resets, and lists those containers. Compose binds the computer and the supervisor to localhost. There is no SSH profile and no allowlist of remote CLI commands. Slack, Teams, and SMS reach the person. They do not reach another machine that person already uses.

drovr already reaches other machines with `herdr --machine`. Proactive wakes stay on the hub, where the service can subscribe, read the transcript, and launch. This review does not move them.

## UI

The app is React and Vite. Routes cover channels, a direct bot chat, a bot page with responsibilities, reach, memory, and approvals, routines, settings, and an admin surface for computers, policy, credentials, plugins, skills, learning, people, and audit. A desktop shell (Tauri) and an Expo app under `mobile/` (`openbot-mobile`, Expo 55, with a dev client) talk to the same server. The web app is not an installable PWA in this tree: there is no web app manifest and no service worker for the product UI.

This commit lets a person pick a skin: OpenDuet, OpenDots, or OpenMuse (`83011637`). The skins are frames and styles over OpenBot's own API. The OpenDots skin tests say the frame wears `brand.yaml` and must not draw the OpenDots name. That skin is not the OpenDots repository reviewed separately. Adopting the skin would still mean adopting OpenBot.

drovr's PWA stays drovr's. Tasks, the brief, and the approval cards are views on drovr's service. They do not become OpenBot routes.

## Channels

Slack and Teams are OpenBot delivery channels, through a pairing and the reach page. SMS is in the same delivery router. A responsibility can also subscribe to Slack, email, Linear, Sentry, and PagerDuty, each with that vendor's signature check. Those are ways for outside systems to start a headless turn, and ways for the bot to reach the person where they already chat.

drovr v1 does not add Slack, Teams, SMS, or email. The owner reaches agents through the PWA and through `@` inside a pane. GitHub webhooks are the outside event v1 accepts, and only as a prompt into a hub pane. The other vendors stay off the plan. Push notifications were already on the Later list.

## Storage and hosted dependencies

PostgreSQL with pgvector holds policy, audit, credentials, grants, channels, routines, and responsibilities. CopilotKit Intelligence holds threads and memory, and the process will not boot without it. Model keys are the operator's, encrypted at rest. The computer images and the supervisor are Docker. Telemetry goes to CopilotKit unless `COPILOTKIT_TELEMETRY_DISABLED` or `DO_NOT_TRACK` is set. The desktop app has its own telemetry document.

drovr keeps one SQLite file and the profile directory on the hub. It does not take Postgres, Intelligence, or a container per agent. OpenBot's local Intelligence option does not change that: it is still a second service, with a preview licence, and the threads would leave the hub's own log.

## License, maturity, activity

License is MIT, copyright 2026 CopilotKit (`LICENSE`). The licence would allow copying code. The runtime is the wrong shape anyway.

From the GitHub API on 29 October 2026, and from this clone:

| Fact | Value |
| --- | --- |
| Created | 17 August 2026 |
| Default branch | `main` |
| Tip reviewed | `aafe043c` on 28 October 2026 |
| Commits on `main` | 585 |
| Latest release | `v0.2.0`, 12 October 2026 |
| GitHub releases | 19 |
| Stars | 7690 |
| Forks | 1026 |
| Open issues | 51 |
| Status badge | beta |
| Archived | no |

The README says it is early, a template, and under active development. The commit rate matches that: the tip is a desktop-install fix, and the days before it include the recorder, the skins, and setup fixes. Nineteen releases means there is a versioned image. `v0.2.0` was published on 12 October 2026, and this tip is 28 October, so a deploy of the latest release and a checkout of `main` are not the same tree. drovr would be tracking a moving platform, a private CopilotKit runtime surface (`run-turn.ts` still reaches `ɵ`-prefixed methods), and a tenant YAML package. That is the carrying cost the design already refused.

## Against drovr's requirements

| Requirement | OpenBot at this commit | Plan |
| --- | --- | --- |
| herdr does the heavy lifting | Own server, worker, supervisor, container per bot | Unchanged |
| Native interactive TUIs | AG-UI over HTTP, Claude Agent SDK query, container shell | Unchanged |
| Router is core | Channel pin, a model for untagged text, `message_bot`, and a responsibility queue | The router stays the only keystroke path, including wakes |
| `@` profiles and plain panes | `@` is a coworker or a group peer. No plain pane | Unchanged |
| Proactive hub profiles | Routines and responsibilities, both headless turns | Unchanged, plus the webhook filter from this review |
| One person, their machines | A deployment, team bots, company sign-in, Docker computers | Unchanged. Wakes stay on the hub |
| Own PWA | React app, Tauri desktop, Expo mobile | Unchanged |
| As simple as possible | Postgres, Intelligence, Docker, a worker, CEL policy, many ingress vendors | One new filter on the webhook drovr already had |

## What was borrowed, and what was left

Borrowed, now in the Events section of [plan-proposed.md](plan-proposed.md):

- A GitHub trigger requires a signature over the raw body.
- It names one repository and refuses any other.
- It lists event types. Other types are skipped and do not prompt.
- A repeated body is one delivery. The unsigned delivery id is not the key.

Left:

- AG-UI, every framework adapter, and the Claude Agent SDK loop.
- CopilotKit Intelligence, Postgres, pgvector, and Docker computers.
- The CEL gateway, team approval rules, and the audit product.
- `message_bot`, the intent classifier, and team bots.
- Routines as a second worker. The floor and the skip-missed rule were already taken.
- Responsibilities as a headless goal engine, including success-criteria as a separate field, and subscriptions for Linear, Sentry, PagerDuty, email, and Slack.
- Letting the agent create its own schedules.
- Slack, Teams, SMS, the recorder, the skins, and the Expo app.

## Sources

- Repository `CopilotKit/OpenBot`, commit `aafe043c7bac95b838351e5006c0ecd868efb634`, 28 October 2026. GitHub API metadata and the `v0.2.0` release read 29 October 2026.
- `README.md`, `LICENSE`, `docs/README.md`, `docs/architecture.md`, `docs/coworkers.md`, `docs/routines.md`.
- `agent-claude-sdk/src/main.py`, `adapter.py`, `model_mode.py`, `requirements.txt`.
- `agent-computer/src/shell.ts`.
- `server/src/agents/handoff.ts`, `handoff-tool.ts`, `config.ts`.
- `server/src/channels/group.ts`, `server/src/routing/classify.ts`, `server/src/delivery/router.ts`.
- `server/src/responsibilities/types.ts`, `triggers.ts`, `engine.ts`, `github.ts`.
- `toolkit/src/run-turn.ts`.
- `mobile/package.json` (Expo). Skin tests under `app/tests/skins-opendots-frame.test.tsx`.
