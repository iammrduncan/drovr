# Review of the agent fleet plan

The plan's shape is the right one. herdr stays the multiplexer. drovr adds persistent profiles and @name messaging. The PWA talks only to drovr. Native interactive TUIs stay the only way an agent runs. v1 stays a single-user tool with profiles, direct messages, and no rooms.

The plan leaves six questions open. Source and current docs close four of them well enough to design against, with the limits called out below. Two are product choices; this review answers them. The [proposed design](plan-proposed.md) keeps the plan and changes how profiles are applied, how a reply is captured, and what a remote machine can do in v1.

Checked on 29 October 2026. Nothing here was executed against a live herdr server, a live harness, or an SSH machine.

## How this was checked

herdr's stable documentation index at <https://herdr.dev/llms.txt> names 0.9.5 as the current stable release. That matches the plan's pin from 24 October 2026. The GitHub release `v0.9.5` is commit `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`, published 14 October 2026. The pages below were fetched from <https://herdr.dev/docs/> on 29 October 2026, and the same behaviors were read in the `v0.9.5` source. `master` had moved on (commit `bc8c289`, 28 October 2026). This review does not re-audit `master`.

| Question | What was read |
| --- | --- |
| Panes, names, prompt, read, state | [Agents](https://herdr.dev/docs/agents/), [Agent automation](https://herdr.dev/docs/agent-automation/), [CLI reference](https://herdr.dev/docs/cli-reference/), [Socket API](https://herdr.dev/docs/socket-api/) |
| Restart and resume | [Session state](https://herdr.dev/docs/session-state/), `src/persist/restore.rs`, `src/persist/snapshot.rs`, `src/agent_resume.rs` |
| Other machines | [Connecting machines](https://herdr.dev/docs/connecting-machines/), `src/cli/target.rs`, `src/remote.rs`, `src/remote/saved.rs` |
| What the integrations actually hook | `src/integration/assets/claude/herdr-agent-state.sh`, `src/integration/assets/codex/herdr-agent-state.sh`, `src/integration/assets/opencode/herdr-agent-state.js`, `src/integration/claude_settings.rs`, release notes for v0.9.5 |
| Profiles | Claude Code docs (directory, CLI reference, sessions), Codex docs (config, skills, troubleshooting, resume), OpenCode v1 and v2 config docs, magnesium goal 34 |
| Prior PWA | [Collie README](https://github.com/AltanS/collie/blob/main/README.md), Collie issue 61, Collie ADR 0073, <https://colliepwa.dev/> |

## What already holds

These parts of the plan match herdr and the requirements. The proposed design keeps them.

- herdr already owns workspaces, tabs, panes, agent detection, agent names, `agent start`, `agent prompt`, `agent read`, `agent wait`, layout restore, native session resume, saved SSH machines, and notifications. drovr should call those, not reimplement them.
- An agent name matches `[a-z][a-z0-9_-]{0,31}`, is unique among live agents on one server, and is an alias for the current occupant. It is cleared when that agent exits, is released, or is replaced. It is not a pane label, and a herdr session is a separate server namespace.
- `agent start` needs an existing shell pane. Arguments after `--` are passed through. The kind selects herdr's interactive executable (`claude`, `codex`, `opencode` are all supported kinds).
- `agent prompt` refuses with `agent_blocked` when a dialog is open, and it can submit while the agent is already working. `idle` and `done` both mean ready for input. `done` means the server has not marked that completion seen. Reads do not mark it seen. Focus does.
- `HERDR_PANE_ID` inside a pane stays an alias for that terminal after the pane moves. Attributing `drovr msg` from that variable is sound.
- The PWA should not open herdr's socket. Collie uses the same split: one process on the machine, the browser talks only to that process, and the process binds loopback behind `tailscale serve` or a reverse proxy.
- A herdr plugin is optional packaging. The socket and CLI are enough.
- v1 without rooms matches the requirement. Magnesium's room and classifier work (goals 08 and 09) is a later product, not a simpler one.
- One SQLite file on the hub is enough for one person's profiles, allow list, and message log.

## Open questions

### 1. Which flags carry a full profile without moving the login?

Resolved for design: put the profile in files in a stable directory, and launch the harness there. Do not relocate `~/.claude` or `~/.codex`. Do not depend on extra CLI flags surviving a herdr restart.

herdr's cold resume commands are fixed in `src/agent_resume.rs` at v0.9.5. They are the whole command:

| Harness | Command herdr types after a cold restart |
| --- | --- |
| Claude Code | `claude --resume <session id>` |
| Codex | `codex resume <session id>` |
| OpenCode | `opencode --session <session id>` |

A reported `resume_argv` would win over that built-in command, but the Claude, Codex, and OpenCode integrations do not send one. `resume_argv` also rejects apostrophes, control characters, more than 64 arguments, and more than 8 KiB. It is a poor place for a profile.

The snapshot stores `launch_argv`, and cold restore does not replay it on the native-resume path. It is applied when a live handoff imports the existing process, where it is the shell respawn command. `pane split --env` is also absent from the snapshot. Cold restore builds the new shell's herdr identity variables and no extra environment (`PaneLaunchEnv::from_extra` is called with an empty list in `restore.rs`). A profile passed only as `agent start` arguments or as `--env` is gone after a cold restart, even when the conversation id comes back.

Login locations, from current docs:

- Claude Code keeps personal configuration under `~/.claude`. `CLAUDE_CONFIG_DIR` replaces that directory, so it would point the login somewhere else. Leave it unset.
- Codex keeps config, auth, sessions, and skills under `CODEX_HOME`, default `~/.codex`. Setting `CODEX_HOME` moves auth with it. Leave it unset. `auth.json` or the OS keychain stays the login.
- OpenCode's CLI docs put credentials in `~/.local/share/opencode/auth.json`, separate from `opencode.json`. Leave that data directory alone.

What each harness will load from the working directory, which herdr does restore:

| Piece | Claude Code | Codex | OpenCode |
| --- | --- | --- | --- |
| Instructions | `CLAUDE.md`, or `AGENTS.md` in place of it, from the project. Documented as loaded every session. | `AGENTS.md`, discovered from the working directory. Documented as included on the first turn of a session. | `AGENTS.md`, reloaded when the file changes, before the next prompt. v2 does not fall back to `CLAUDE.md`. |
| MCP | Project `.mcp.json`. `--mcp-config` and `--strict-mcp-config` exist, and herdr will not pass them on resume. | `[mcp_servers]` in user `config.toml`, or in a trusted project's `.codex/config.toml`. Project config cannot override provider auth. | v2 `mcp.servers` in the project `opencode.json`. `OPENCODE_CONFIG` is an environment variable, and that variable does not survive herdr's cold restore. |
| Skills | `.claude/skills/<name>/SKILL.md` | `.agents/skills/<name>/SKILL.md` from the working directory. Parent directories are scanned inside a git repository. | `skills` in config, and `.opencode/skills/` |
| System-prompt flags | `--append-system-prompt` is recorded on the conversation's first request. A different value on a later `--resume` waits until compaction. Unsuitable as the profile body. | One-shot `-c` overrides apply to that invocation. herdr's resume command does not include them. | Project `opencode.json` is the durable layer. |

Codex ignores project `.codex/` until the project is trusted. A brand-new run directory can come up blocked on that prompt, or it can silently skip the profile's MCP. The first launch has to be trusted once.

Claude's own session doc says the JSONL record format is internal and changes between versions. File-based instructions, MCP, and skills are the supported way to carry a profile. Parsing the transcript is a separate, more fragile choice and is discussed below.

Not run: no harness was started, so this is documentation plus herdr's resume source, not a measured launch.

### 2. Does done plus the transcript capture every reply?

Resolved: use herdr's settle signal, and read the harness transcript. Do not use a turn-end hook as the way drovr learns that a turn ended. Do not use the screen as the reply.

herdr does not track turns. From Agent automation: `agent prompt --wait` "does not track individual turns." If the agent is already working, the end of the turn already in progress can satisfy the wait. `completion_seq` identifies one idle transition as completed work. Startup and session changes do not set it. Older servers may omit it. drovr should treat a new `completion_seq` after a successful prompt as the settle signal, and it should ignore a settle that was already current when the prompt was sent.

`done` and `idle` both mean ready for input. `blocked` means herdr saw an approval or question. `unknown` means herdr cannot classify the pane. A blocked or unknown pane is not a finished reply. herdr's blocked detection is strict for screen-reading agents: an unfamiliar prompt can show as idle (`default_known_agent_idle_fallback`). Automation that types on that idle can answer a dialog. The router has to treat an unexpected idle with care, which the proposed design does by binding delivery to the occupant and by not auto-approving anything.

herdr 0.9.5 does not install turn hooks for these three harnesses:

- The v0.9.5 release notes say herdr no longer installs Codex turn hooks, because those sessions started with a hook-timeout warning, and Codex state comes from screen detection again. The Codex integration script (integration version 10) handles `session` only and returns immediately for any other hook event. It reports the session id and discards the transcript path after checking that the path is non-empty.
- The Claude installer keeps a `SessionStart` hook and removes herdr's own `Stop`, `UserPromptSubmit`, `PreToolUse`, and `SessionEnd` commands. The Claude script (integration version 11) exits unless the event is `SessionStart`. It sends the session id. The path is not stored: `session_ref_from_report` keeps a path only for Pi and OMP. The public `agent_session` object is source, agent, kind, and value.
- OpenCode's plugin (integration version 13) does report lifecycle, including idle, over `session.status`. That is still herdr's agent state, not a transcript.

So a drovr Stop hook would be a second channel herdr just finished removing from its own integrations. herdr's installer leaves unrelated hook commands in place, so a private hook would not be deleted on reinstall, and it could record `transcript_path`. It would not know about turns herdr already represents as `done` or `idle`, and a short hook timeout is the failure mode Codex already hit. The hook is a poor primary signal.

The screen is a poor transcript. Claude Code and OpenCode draw history on the alternate screen. `agent read` will scroll that history only when the agent is idle, recognized, and at the bottom, and an explicit read returns `agent_not_idle` while it is working, blocked, or unknown. herdr's own docs say that when the full response is still unavailable, ask the agent to write a file. That is a last resort for a person, not the router's reply path.

Where the transcript actually is:

| Harness | Where | How sure |
| --- | --- | --- |
| Claude Code | `~/.claude/projects/<encoded cwd>/<session id>.jsonl`. The directory encoding and the 200-character hash rule are in Claude's session docs. Hooks receive `transcript_path`. The record format is documented as internal and unstable. | Official docs. Not opened on a live session. |
| Codex | `$CODEX_HOME/sessions`, default `~/.codex/sessions`. Archived sessions live under `$CODEX_HOME/archived_sessions`. herdr stores the session id. The filename pattern inside that directory is not in the Codex pages read for this review. | Directory is official. Filename match is still to be checked once, on a real session. |
| OpenCode | herdr stores a `ses_…` id once the integration is installed. Collie, against OpenCode 1.18.9 and herdr 0.7.5, read `session`, `message`, and `part` in `$XDG_DATA_HOME/opencode/opencode.db`. OpenCode 2's `opencode session export <id>` is a documented CLI. A later secondary write-up describes a `session_message` table. | The id link is herdr's integration. The table layout must be pinned to the installed OpenCode, not assumed from Collie. |

Collie reached the same split for a different reason. ADR 0073 reads the agent's own log for chat, explicitly not the screen, because full-session files were tens or hundreds of megabytes and a screen is the wrong object. drovr should copy that decision and not Collie's code.

A reply is the assistant text appended after drovr's prompt, associated with the new `completion_seq`. Text already on screen when the prompt was sent is not that reply. A turn that settles `blocked` is not a reply either. The owner needs to see it.

### 3. After a herdr restart, what comes back?

Resolved in source, not by restarting a server.

Detach and reattach keeps the process, so the name, the conversation, and the launch environment all remain. That is the normal case. Cold restart is the one that matters.

On a cold restart, with native resume enabled (the default):

- Layout, cwd, and a valid official session id come back. herdr then runs the resume command in that directory. Duplicate session ids in one restore are suppressed.
- If the snapshot has both an agent name and a managed-agent kind, and a resume plan exists, the name is restored (`restore.rs`, the `pending_native_agent_restore` branch). `agent start` is what sets the managed kind. A profile launched that way can come back named, as long as the integration had reported a session before the shutdown.
- A name with no managed kind is dropped on that path. The test `cold_restore_with_gapped_public_tab_numbers_drops_unmanaged_agent_name` saves a Codex session id and the name `planner` without a managed kind, and the restored terminal's name is empty. An ordinary agent that only got `agent rename` does not keep its name across a cold restart.
- With resume disabled, the name is dropped even when the managed kind is present. `restore_carries_persisted_agent_session_metadata` asserts `agent_name` is `None` while the OpenCode session id is kept. The session id is more durable than the name.
- If no session id was reported yet, there is no resume plan, and the cold path does not restore the name either.
- Live handoff (`herdr update --handoff`, experimental) keeps the process and restores managed names. In-flight waits and event subscriptions do not survive the handoff. Homebrew, mise, and Nix installs cannot use `herdr update --handoff`.
- Public pane numbers and workspace ids are in the snapshot, and a restore test keeps those numbers. Internal pane ids are remapped. Whether the public string `w1:p2` is identical after a real restart was not observed. drovr should re-resolve by session id, then by name, and store whatever public id herdr reports after restore.
- Profile launch arguments do not come back. See question 1. The cwd does come back, which is why the profile has to live in files in that directory.
- Pane screen history is off by default and is skipped when native resume runs. It is not a transcript.

drovr's own profile-to-session row is still required. herdr will resume a managed profile pane by itself when the session id is valid. drovr re-applies the name if herdr did not, and relaunches from the saved session id if the pane came back as a shell. It should not invent a second resume command.

### 4. Do events stream through `herdr --machine`?

Resolved for the documented CLI: no. Poll remote machines. Subscribe on the hub socket.

`herdr --machine` forwards a fixed command list (`src/cli/target.rs`): workspace, worktree, tab, pane, notification, most of `agent` (not `attach`, and not `agent explain --file`), `api snapshot`, `status server`, a subset of plugin commands, and a subset of server commands. `events.subscribe` is not a CLI command on that list. `terminal session observe` and `terminal session control` are not on it either.

What does work over `--machine`, one SSH command at a time, with no automatic retry:

- `herdr --machine <label> api snapshot`
- `herdr --machine <label> agent list`, `agent prompt`, `agent read`, `agent wait`, `agent start`, `agent rename`
- pane split, read, and the other pane commands

`agent wait` holds that SSH session open until the wait finishes. That is one long request, not a general event stream. The selector is a saved profile id or a unique case-sensitive label, not an arbitrary hostname. `--current` cannot see the caller's local pane. IDs and names on the far side belong to that server.

Under the CLI, `remote-api-bridge` forwards the remote socket over SSH stdio for the life of one herdr process (`src/remote.rs`). A custom client could speak `events.subscribe` through that bridge. That entry point is not the documented `--machine` surface, and it was not opened against a live machine. v1 should not depend on it. The hub, where the long-running profiles are, uses the local Unix socket and `events.subscribe`, and reconciles with `session.snapshot` after `events_lost`.

Collie already treats the event stream as a hint that makes polling faster. The snapshot is the source of truth. That is the right remote design too, because the stream is not available through the CLI drovr is supposed to call.

Consequence for the PWA: a live terminal mirror of a remote pane is not available from `herdr --machine`. v1 can stream `terminal session observe` for hub panes. Other machines get state from snapshots and text from `agent read` or, when drovr can read it, the transcript file over the same SSH access herdr already uses.

### 5. If a later agent takes the name, who gets the queued message?

Only the occupant the message was bound to.

A herdr name is a live alias. It is unique while held, and it is free the moment that agent exits. The plan's one-hour queue for a missing ordinary agent would then deliver to whoever is renamed to that string. That is a different agent. Profiles are safe only because drovr launches them itself and herdr refuses a second live owner of the name.

Bind each queued message to machine, name, public pane id, and session id when herdr has one. Deliver only if that same session is still the occupant, or if a profile drovr itself relaunched resumed that same session. If an ordinary agent exits, mark the message undeliverable then. Do not wait an hour for a new occupant. The hour timeout remains useful for a profile or named agent that is temporarily disconnected and comes back as the same session.

`@w1:p2` has the same rule. A pane id is a location. The message is for the agent that was in it, identified by session id when herdr has reported one.

### 6. Is an advisory allow list enough?

Yes, for this tool, if the product says so.

herdr injects `HERDR_SOCKET_PATH` into pane processes. Any agent that can run a shell can prompt another agent and skip drovr. The allow list gates `drovr msg` and the PWA. It does not sandbox herdr. Magnesium goal 34's per-tool allow, ask, and deny rules are a different product, and they are in the plan's Later list as "sandbox enforcement." v1 should not pretend the list is enforcement.

That matches a single-user fleet where every agent already has the owner's shell. The message log is the record of what went through drovr. It is not a record of what an agent typed into herdr itself.

## Other facts the design has to absorb

- Profile names have to match herdr's agent-name rule, because the profile name is the agent name. That is 1 to 32 characters, starting with a letter.
- herdr machine labels are free text and case-sensitive. `Build machine` is a legal label. `@laptop/fix-login` only works when the label is a single token. The address syntax needs its own alias, mapped to herdr's machine profile id.
- Cross-workspace `pane move` changes the public pane id. Subscribers get `pane.moved`. The old id remains an alias for `HERDR_PANE_ID`. drovr follows the move instead of treating it as a new agent.
- New panes inherit the herdr server's ordinary environment, including API keys. herdr strips known Claude, Codex, and OMP session markers so a new pane does not claim the session that started the server. drovr stores environment names, never values, and checks that the names are present in the service environment. It does not put secrets in profile files, argv, or the message log's metadata.
- `agent prompt` acknowledges the write, not the start of a turn, unless `--wait` is used. A timeout or `agent_prompt_stalled` does not prove the text was never sent. The router reads before it retries.
- On macOS, an oversized submission can be rejected before it is queued. A batch of waiting messages needs a size cap.
- Automatic restores are staggered, 100 ms apart by default (`startup_per_agent_delay_ms`). drovr should wait until the resumed agent is idle before it prompts.
- Antigravity and Grok can look idle while background work continues. They are outside v1. The same caution applies if a v1 harness is idle at the prompt while a subagent is still running. OpenCode's integration folds some child-session events back onto the root session. Claude's integration ignores subagent hook input. A parent that looks idle can still have a child running. Reply capture should prefer the parent's new assistant message over "the pane went idle."
- `notification.show` is a toast through the attached herdr client. It is not a phone push channel. The PWA is what the phone polls.

## Prior art

### Collie

Collie is a Bun and TypeScript bridge plus a Vite PWA, loopback only, published with `tailscale serve` or a reverse proxy. It polls `session.snapshot`. A herdr event stream only wakes the poll. Chat reads the harness log. OpenCode history required herdr's session id; without the integration, Collie correctly returned no session.

Its agent messaging ("walky talky") signs each message, delivers a one-line notice into the receiving terminal, and tells that agent to run an inbox command. The message is command output, not the owner's prompt. A skill is written into instruction files Collie finds, and refreshed on update.

drovr can take the loopback front door, the snapshot-plus-poll idea, and chat-from-the-log. It should not take Collie's multiplexer abstraction, crew protocol, or skill rewriter. The plan's `agent prompt` plus a sender header is the smaller fit for herdr's agent API. The skill has to teach the agent that the header is another agent and not the owner. Signing between machines is unnecessary while one person owns every machine and the allow list is advisory.

### Magnesium goal 34

Goal 34, verified 19 October 2026 in magnesium's own notes, is the profile format the plan points at. A profile is a folder: `AGENTS.md`, optional extra markdown, `skills/<name>/SKILL.md`, `mcp.json`, `hooks.json`, environment names, harness, sandbox, and launch arguments. The app edits it, versions it, and delivers it to the machines it names. Tool rules are enforced differently on Claude Code, Codex, and OpenCode. Secrets stay names. OpenCode gets its own config directory so it does not need a Claude or Codex login.

drovr v1 should take the folder, the single instructions document, skills, MCP, environment names, and the harness. It should leave sandboxes, `hooks.json`, per-tool allow/ask/deny, multi-machine delivery, version-history UI, and Brain access for later. Those are why the earlier app was large. Goal 34 also records that OpenCode 2.0.28 ignored a config `instructions` field and 2.0.32 honored it. The materializer has to target a known OpenCode 2, not "OpenCode" in general.

## Still unverified

These need one live pass during implementation. They do not block the design.

- A real herdr cold restart of a managed Claude, Codex, and OpenCode pane: name, public pane id, cwd, and session id.
- A real `herdr --machine api snapshot` and `agent prompt` against a saved machine, including a label that contains a space.
- Whether `remote-api-bridge` can hold `events.subscribe` for more than one event. Not required for v1.
- The Codex filename inside `~/.codex/sessions` that contains herdr's session id.
- OpenCode 2's on-disk transcript shape on the version that will actually run. `opencode session export` is the documented fallback.
- Whether Claude loads `AGENTS.md` from a run directory that is not a git checkout, or only `CLAUDE.md`.
- Whether a resumed Codex session rereads an edited `AGENTS.md`, or only recorded it on the first turn.
- Whether the first launch in a new run directory stops on a Codex trust prompt.
- Whether project `.mcp.json` and `.codex/config.toml` are visible to an already-resumed session without starting a new session. New launches are the case that has to work. Editing a profile under a live session can wait until the next launch.
- The 1.7× token figure for `claude -p`, and the cost of a headless runtime, are accepted as the reason for native TUIs. They were not remeasured.

## Sources

- herdr 0.9.5 docs: <https://herdr.dev/llms.txt>, <https://herdr.dev/docs/agents/>, <https://herdr.dev/docs/agent-automation/>, <https://herdr.dev/docs/socket-api/>, <https://herdr.dev/docs/cli-reference/>, <https://herdr.dev/docs/concepts/>, <https://herdr.dev/docs/session-state/>, <https://herdr.dev/docs/connecting-machines/>
- herdr 0.9.5 source, tag `v0.9.5`, commit `2ecf19a`: `src/agent_resume.rs`, `src/persist/restore.rs`, `src/persist/snapshot.rs`, `src/cli/target.rs`, `src/remote.rs`, `src/integration/assets/{claude,codex,opencode}/`, `src/integration/claude_settings.rs`
- herdr release v0.9.5: <https://github.com/herdrdev/herdr/releases/tag/v0.9.5>
- Claude Code: <https://code.claude.com/docs/en/claude-directory>, <https://code.claude.com/docs/en/cli-reference>, <https://code.claude.com/docs/en/sessions>
- Codex: <https://learn.chatgpt.com/docs/config-file/config-advanced>, <https://learn.chatgpt.com/docs/developer-commands>, <https://learn.chatgpt.com/docs/build-skills>, <https://learn.chatgpt.com/docs/reference/troubleshooting>, <https://learn.chatgpt.com/docs/config-file/environment-variables>
- OpenCode: <https://opencode.ai/docs/cli/>, <https://opencode.ai/v2/docs/config/>, <https://opencode.ai/v2/docs/instructions/>, <https://opencode.ai/v2/docs/mcp-servers>
- Collie: <https://github.com/AltanS/collie>, issue 61, `.adr/0073-a-live-session-is-a-bounded-window-on-the-existing-poll.md`, <https://colliepwa.dev/>
- magnesium goal 34: <https://github.com/iammrduncan/magnesium/blob/main/docs/magnesium/goals/_completed/34-profiles-in-the-app.goal>
