# drovr

drovr is a small service and a web app for one person's coding agents. The agents run in [herdr](https://herdr.dev), each in its own terminal pane, using the harness's normal interactive interface. drovr remembers the profile for each long-running agent and carries `@name` messages between agents.

The name follows herdr. A drover moves herds.

## Why it exists

herdr already runs the panes, names the agents, notices when one is idle, working, blocked, or done, and reaches other machines over SSH. drovr does not replace any of that.

The gap is everything herdr is not trying to be:

- A profile should stick around: instructions, MCP servers, skills, the harness, and which environment variables must be set. Launching an agent should apply that profile. The login for Claude Code, Codex, or OpenCode stays where that harness already keeps it.
- Agents should be able to address each other with `@name`, including an ordinary herdr agent that has no profile. A router decides when the target may be woken and how the message is delivered. That router is part of the product, not an optional add-on.
- A hub profile should also be able to wake when nobody tagged it: a saved prompt on a schedule, a webhook or a local watcher turned into a prompt, or a periodic check of a standing goal. The wake is still that profile's own pane. If nothing changed, the pane stays asleep, or the reply is quiet and no card is shown.
- The person using it should be able to see who needs an answer, open a pane, edit a profile, and read the message log, from a phone or a desktop browser. Work in progress shows up as a task card.

A few constraints keep it small:

- Every agent is the harness's own interactive TUI inside a herdr pane. There is no `claude -p`, no SDK loop, and no headless runtime. A headless Claude Code run was measured at about 1.7 times the token use of the interactive TUI, and Hermes Agent used too many tokens to keep. Prompt caching and compaction stay the ones each harness already implements.
- v1 has persistent profiles, direct messages with history per pair, and hub-only wakes from schedules, events, and standing goals. It does not have rooms or group chats.
- Profiles that run as long-lived bots run on one hub machine. Other machines are reached through herdr.
- The web app is written for this service. [Collie](https://github.com/AltanS/collie) is a useful reference for a herdr PWA. It is not a dependency, and this repo is not a fork of it.
- An earlier personal web UI for the same kind of fleet was a fork of another server. Keeping up with that upstream, and carrying features this setup does not use, was the reason to stop. herdr already reuses each harness's real TUI, so drovr can stay a thin layer.
- It is a single-user tool for one person's machines.

## How it relates to herdr

herdr is the multiplexer. It owns panes, agent state, launch, prompt, read, events, layout restore, native session resume, and `herdr --machine`.

drovr is a client of that API. It stores profiles, materializes them into a working directory, starts them with `herdr agent start`, and sends `@name` traffic and hub wakes through `herdr agent prompt` when the router says the target is ready. The browser talks only to drovr.

## Status

Design phase. No service and no web app are implemented yet.

## Documents

- [Original plan](docs/plan-original.md), kept as it was written.
- [Review](docs/plan-review.md) of that plan against current herdr, the three harnesses, Collie, and the earlier profile work.
- [Proposed design](docs/plan-proposed.md), including where it differs from the plan.
- [OpenDuet review](docs/openduet-review.md): why drovr borrows a few product ideas from [OpenDuet](https://github.com/CopilotKit/OpenDuet) and does not build on it.
- [OpenDuet takeaways](docs/plan-duet-takeaways.md): the working notes behind that review.
