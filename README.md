# drovr

drovr is a small service and a web app for one person's coding agents. The agents run in [herdr](https://herdr.dev), each in its own terminal pane, using the harness's normal interactive interface. drovr remembers the profile for each long-running agent and carries messages between those profiles.

The name follows herdr. A drover moves herds.

## Why it exists

herdr already runs the panes, names the agents, notices when one is idle, working, blocked, or done, and reaches other machines over SSH. drovr does not replace any of that.

The gap is everything herdr is not trying to be:

- A profile should stick around: instructions, MCP servers, skills, the harness, and which environment variables must be set. Launching an agent should apply that profile. The login for Claude Code, Codex, or OpenCode stays where that harness already keeps it.
- Profiles message each other with `drovr send` and `drovr reply`. A question is a message. The sender keeps working, and the reply arrives later as a new prompt when that profile is idle. The router decides when the target may be woken. drovr messages profiles only.
- A hub profile can also wake from a trigger the owner saved: a schedule, or a schedule with a cheap check. The wake is still that profile's own pane. If nothing changed, the pane stays asleep. A quiet reply shows no card.
- The person using it should be able to see who needs an answer, open a pane, edit a profile, and read the message log, from a phone or a desktop browser. The attention list is derived from herdr and from the message log.

A few constraints keep it small:

- Every agent is the harness's own interactive TUI inside a herdr pane. There is no `claude -p`, no SDK loop, and no headless runtime. A headless Claude Code run was measured at about 1.7 times the token use of the interactive TUI, and Hermes Agent used too many tokens to keep. Prompt caching and compaction stay the ones each harness already implements.
- v1 has persistent profiles on the hub, direct messages with history, and hub wakes from one trigger type. It does not have rooms or group chats. Inbound webhooks can come later as another trigger source.
- Profiles that run as long-lived bots run on one hub machine.
- The web app is written for this service. [Collie](https://github.com/AltanS/collie) is a useful reference for a herdr PWA. It is not a dependency, and this repo is not a fork of it.
- An earlier personal web UI for the same kind of fleet was a fork of another server. Keeping up with that upstream, and carrying features this setup does not use, was the reason to stop. herdr already reuses each harness's real TUI, so drovr can stay a thin layer.
- It is a single-user tool for one person's machines.

## How it relates to herdr

herdr is the multiplexer. It owns panes, agent state, launch, prompt, read, events, layout restore, native session resume, and `herdr --machine`.

drovr is a client of that API. It stores profiles, materializes them into a working directory, starts them with `herdr agent start`, and submits messages through `herdr agent prompt` when the router says the profile is ready. The browser talks only to drovr.

## Status

Design phase. The current plan is [docs/plan-final.md](docs/plan-final.md). No service and no web app are implemented yet.

## Documents

- [Final plan](docs/plan-final.md), the current plan. Build from this.
- [Original plan](docs/plan-original.md), kept as it was written.
- [Review](docs/plan-review.md) of that plan against current herdr, the three harnesses, Collie, and the earlier profile work.
- [Proposed design](docs/plan-proposed.md), including where it differs from the plan.
- [OpenDuet review](docs/openduet-review.md): why drovr borrows a few product ideas from [OpenDuet](https://github.com/CopilotKit/OpenDuet) and does not build on it.
- [OpenDuet takeaways](docs/plan-duet-takeaways.md): the working notes behind that review.
- [OpenBot review](docs/openbot-review.md): the platform under OpenDuet, and the one webhook rule drovr takes from it.
- [OpenDots review](docs/opendots-review.md): the text, call, and Slack template, and why drovr does not build on it.
- [Claude review](docs/claude-review.md): a second review of all of the above, with herdr source re-checked and the defects in the proposed design.
- [Claude proposal](docs/claude-proposed.md): an alternative design with explicit replies, worktree workspaces, harness-native permissions, and one trigger primitive. The final plan uses this as its base.
- [Codex review](docs/codex-review.md): a review of the Claude proposal and the earlier plans, focused on delivery, Stop, and limits.
- [Codex proposal](docs/codex-proposed.md): the delivery journal, request ids, pause-on-Stop, and the depth, fan-out, and rate limits. The final plan takes those guards.
