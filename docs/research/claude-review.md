# Claude review of the drovr plans and reviews

This is a second review of everything in `docs/`: the [original plan](plan-original.md), the [review](plan-review.md), the [proposed design](plan-proposed.md), and the three reviews of CopilotKit projects ([OpenDuet](openduet-review.md), [OpenBot](openbot-review.md), [OpenDots](opendots-review.md)) with the [OpenDuet notes](plan-duet-takeaways.md). My own design is in [claude-proposed.md](claude-proposed.md).

Checked on 29 October 2026. I re-read herdr's source at tag `v0.9.5` (commit `2ecf19a`, the same commit the first review used) and checked the harness behaviors the design depends on against current Claude Code, Codex, and OpenCode docs. Nothing was run against a live herdr server or a live harness session.

## Verdict

The first review's herdr analysis is sound. I re-checked its load-bearing source claims, and each one holds. The decisions built directly on them are right and should stay. A profile is files in the pane's cwd and not launch flags. Native resume is herdr's job. A queued message belongs to one occupant. Remote machines are polled. The allow list is drovr's own door and not a sandbox.

Two commitments in the proposed design are weaker than the rest, and I would change both:

1. **Replies are inferred from transcripts and relayed automatically.** That puts the least stable thing in the system, three harnesses' private transcript formats, on the routing path. It also turns one message into a ping-pong of up to five turns between two agents with full contexts. Agents should answer through drovr's CLI on purpose, and drovr should read transcripts only for display.
2. **The OpenDuet pass more than doubled v1.** One evening added schedules, webhooks, watchers, standing goals, tasks, a brief, approval cards, `drovr propose`, and choice buttons. The original plan had three tables and three MVP steps. The proposal has twelve tables, four stages, and four separate state sets. The owner's notes do ask for proactive profiles, so the requirement is real. The first version of it can be one trigger primitive, not four.

There are also concrete defects. Some are internal contradictions: the git goal input hashes a directory drovr generated, and GitHub webhooks are pointed at a listener the public internet cannot reach. Some are behaviors the design gets wrong: the Stop key, the first-launch dialogs, typing over the owner's draft, and session ids that change under `/clear`. They are listed below with line references and fixes.

## What I re-checked in herdr 0.9.5

| Claim in plan-review.md | Where | Result |
| --- | --- | --- |
| Cold resume runs only `claude --resume <id>`, `codex resume <id>`, `opencode --session <id>` | `src/agent_resume.rs`, `plan()` | Holds |
| `resume_argv` rejects apostrophes, control characters, paths, and oversize argv | `src/agent_resume.rs`, `validate_resume_argv` | Holds |
| Cold restore passes no extra environment | `src/persist/restore.rs:574`, `PaneLaunchEnv::from_extra(Vec::new())` | Holds |
| A name comes back only with a managed kind and a resume plan | `src/persist/restore.rs:587-607`, test `cold_restore_with_gapped_public_tab_numbers_drops_unmanaged_agent_name` | Holds |
| Claude's integration handles `SessionStart` only | `src/integration/assets/claude/herdr-agent-state.sh` (version 11, `case session`) | Holds |
| `--machine` forwards a fixed list without event streams or terminal observe | `src/cli/target.rs`, `validate_machine_command` | Holds. `api snapshot` is the only `api` subcommand |
| `agent prompt` refuses a blocked agent before writing | `src/app/api/agents.rs`, `validate_agent_prompt` | Holds. It also refuses an unknown agent (`agent_not_ready`) and a pending managed launch |
| `--wait` does not track turns | `src/cli/spec.rs:368` | Holds |

## Facts from the source that the design has not absorbed

1. **`agent prompt` appends to whatever is already in the input box.** `submit_agent_prompt` writes the encoded text, waits `AGENT_PROMPT_SUBMIT_DELAY`, then sends Enter. Nothing clears the composer first. If the owner is attached to the pane on a desktop and has half a sentence typed, a router delivery submits the owner's draft and the agent message together, as one prompt. The design never mentions this. A router that types into a TUI the owner also types into has to treat it as the main way it can do harm.

2. **`completion_seq` is transient. `state_change_seq` is not.** In `src/app/actions.rs` (around line 1759), every state change sets `last_agent_completion_seq` to the new global sequence number when the transition is a completion, and to `None` when it is not. It is also cleared when the session reference changes (`completion_reset`). `AgentInfo` carries `state_change_seq: u64` on every agent (`src/api/schema/agents.rs`). The design compares `completion_seq` values (`plan-proposed.md:129`, `:131`). That works on the hub, where every event arrives. On a polled machine, an agent can finish and start a new turn between two polls, and the completion is gone. "`state_change_seq` advanced past the value at send time, and the agent is idle or done now" is the comparison that survives polling.

3. **A session id changes inside one occupant.** `normalize_session_start_source` accepts `startup`, `resume`, `clear`, `compact`, `branch`, `new`, `fork`, and `select`. herdr records the new session reference when the harness reports one. `/clear` in Claude Code reports a new session with source `clear`. The occupant is the same process with the same herdr name, and it has a different session id. See defect D3.

4. **herdr has `agent focus`.** It is `src/cli/agent.rs` (`"focus" => agent_focus`), and `pane.focus` is in the socket API. Focus is one piece of server state, the active workspace and its active tab (`src/app/creation.rs`, `src/server/client_shell.rs`). It is not kept per viewer. A PWA that focuses a pane to clear `done` moves focus in the owner's desktop client too. See D9.

5. **`send-keys` names Escape `esc`.** `src/cli/spec.rs:343` calls `esc` the canonical name. herdr has no `agent interrupt` command. The interrupt key is the harness's own (D6).

6. **`AgentInfo` reports more than the design uses:** `focused`, `interactive_ready`, `launch_pending`, `cwd`, `foreground_cwd`, and `revision`. `interactive_ready` is what launch should wait for, not a timer. `cwd` lets reconcile confirm that a profile pane is still in its run directory.

7. **Check the hub's herdr version first.** The behaviors cited are 0.9.5's. One machine checked for this review was on an earlier release, and 0.9.5 is the release that removed herdr's Codex turn hooks. The hub needs 0.9.5 or later before any stage acceptance test means anything.

## Harness claims, re-checked

Checked against the current docs, and against source where the docs were silent: Claude Code 2.1 docs, Codex at tag `rust-v0.163.0`, and OpenCode at `v1.19.4` and `v2.2.1`.

| Claim | Result |
| --- | --- |
| Claude loads `CLAUDE.md`, or `AGENTS.md` in place of it (`plan-review.md:64`) | Holds. `AGENTS.md` is read natively, but only when no `CLAUDE.md` exists in the cwd or any parent. Writing `CLAUDE.md` (`plan-proposed.md:164`) is the safe choice |
| Claude transcript path and the 200-character hash rule (`plan-review.md:97`) | Holds. Every non-alphanumeric character in the cwd becomes `-` |
| Claude hooks receive `transcript_path` | Holds. The Stop hook also receives `last_assistant_message`. The docs warn that the transcript may not hold the final message yet when Stop runs, so read that field and not the file. Stop does not fire when the user interrupts |
| Codex's transcript filename is still to be checked (`plan-review.md:98`) | `~/.codex/sessions/YYYY/MM/DD/rollout-<local time>-<uuid>.jsonl`. The uuid is the id that `codex resume` takes. The file is not written until the session first persists, which in practice is the first prompt. Compressing old rollouts and moving history into SQLite are both in the source, behind flags |
| Codex ignores project `.codex/` until the directory is trusted (`plan-review.md:69`) | Holds. Trust is `[projects."<path>"] trust_level = "trusted"` in `~/.codex/config.toml`. A trusted project config may set `mcp_servers`, `sandbox_mode`, `approval_policy`, and `sandbox_workspace_write.writable_roots`. The 0.163 denylist is provider, URL, profile, notify, and telemetry keys |
| `opencode session export` is the OpenCode fallback (`plan-review.md:99`) | Only in OpenCode 2. OpenCode 1 has a top-level `opencode export` |
| The materializer targets OpenCode 2 (`plan-review.md:189`) | Right, and more urgent than it reads. 2.2.1 shipped on 29 October 2026. It replaces the `permission` map with an ordered `permissions` array, renames `bash` to `shell`, and allows external directories by default |
| A message typed while Claude works waits | Partly. A queued message is handed to Claude as soon as its current tool calls finish, inside the same turn. The router's rule of never prompting a working pane is therefore required, not a nicety |

Two things in the harness docs contradict plan-proposed.md outright: the Stop key (D6) and the first-launch dialogs (D7).

## Defects in plan-proposed.md

Ordered by consequence.

### D1. Automatic relay is a ping-pong (`:13`, `:132`, `:433`)

Step 9 relays every non-empty reply while `hop < 4`, and difference 3 makes a relayed turn eligible for relay, because drovr started it. Follow one message. builder asks reviewer (hop 0). reviewer's answer goes to builder (hop 1). builder's next final text, which is often "Thanks, I'll apply that" or a status line meant for the owner, goes back to reviewer (hop 2), then back to builder (hop 3), then to reviewer (hop 4), and then it stops. One `drovr msg` buys up to five turns, each in a session that may hold a large context. The native-TUI rule exists to save tokens. This spends them on politeness.

There is a second cost. The final text of a coding agent's turn is usually written for the owner. Relaying it to a peer as a prompt makes the peer respond to text that was never addressed to it.

Fix: separate asking from telling, and make the answer an explicit act (see [claude-proposed.md](claude-proposed.md), "Messages"). OpenDuet's `message_bot` had an `expecting` field for exactly this reason. The OpenDuet review rejected the typed envelope as a whole, and this part of it should have been kept.

### D2. The hop count does not follow messages an agent sends itself (`:132`)

The counter increases only on relay. If builder is in a turn that drovr started with a hop-3 relay and it runs `drovr msg @reviewer` itself, nothing says that new message is hop 4. As written it is hop 0, and the loop guard is gone. A CLI message should inherit `hop + 1` from the batch that is currently delivered and unsettled on the sender's pane. drovr knows which batch that is. Only the owner resets the count.

### D3. Binding to the session id breaks on `/clear` (`:15`, `:116`, `:372`)

"Same name, different session, queued message → `undeliverable`, occupant changed." Claude Code's `/clear` (aliases `/reset` and `/new`) starts a new session with a new id in the same process. So do Codex's `/new` and `/clear`. Compaction keeps the Claude session id. After any of those, the name, the process, and the pane are all unchanged, and the session id is new. A message queued for a profile while the owner cleared its context would be dropped as if a stranger had taken the name. herdr's own model treats the name as the occupant marker: it is cleared when the agent exits, is released, or is replaced. Bind a profile message to the profile. Bind an ordinary-agent message to `terminal_id` plus "the name has not been cleared since the message was bound", which drovr sees from events or successive snapshots. Keep the session id only to re-match a pane after a cold restart.

### D4. The run directory is not where the code is (`:93`, `:208`, `:256`, `:450`, `:453`)

The pane's cwd is `~/.local/share/drovr/runs/<name>/`, which holds only generated files. A coding profile works on a checkout somewhere else, named in `profile.json` as an extra workspace path. Each harness draws its own project boundary at the cwd: Claude Code's file permissions and project `CLAUDE.md` discovery, Codex's `workspace-write` sandbox, and OpenCode's project root. So the profile's real work lives outside the boundary its harness enforces, and inside a boundary drovr only asks agents to respect through `drovr propose`. Codex in `workspace-write` cannot write the checkout at all without `writable_roots`. The checkout's own `CLAUDE.md` or `AGENTS.md` is not loaded from a sibling directory.

The design then contradicts itself. The standing-goal input is "HEAD and porcelain status of the run directory" (`:256`), and the stage 4 test makes "a new commit in the run directory" (`:450`). The run directory is not a git checkout, and drovr rewrites it on every launch.

Fix: put the checkout inside the run directory as a git worktree that drovr creates. The harness boundary then covers the code. Each profile gets its own branch and index, so two agents do not edit the same working tree. The git input hashes a real checkout. See "Workspaces" in the proposal.

### D5. GitHub webhooks cannot reach a tailnet-only listener (`:234`, `:332`, `:339`)

The API binds loopback behind `tailscale serve`, which is reachable only from the tailnet, and "the service never enables a public funnel." GitHub delivers webhooks from the public internet. As specified, no GitHub delivery ever arrives, and all the OpenBot-derived signature, repository, and event-type rules guard a door that is shut. `tailscale funnel --set-path` can expose just `/hooks/`, which the design forbids. The same events are available without ingress: a command check that runs `gh` on the hub and hashes the result. That needs no public endpoint, no secret, and no signature code. See "Triggers" in the proposal.

### D6. Stop sends Ctrl+C (`:144`, `:389`)

Ctrl+C is not the interrupt key in any of the three harnesses, and in two of them it can quit the TUI:

| Harness | Interrupt | Ctrl+C |
| --- | --- | --- |
| Claude Code | Esc | Interrupts a running operation. When idle, the first press clears the input and the second exits |
| Codex | Esc (`chat.interrupt_turn`) | With a draft in the composer, clears the draft and does not interrupt. Idle with an empty composer, quits at once, because the double-press guard is off in source |
| OpenCode 1 and 2 | Esc twice within 5 seconds | Clears a non-empty prompt. With an empty prompt, exits the app |

The failure row reads "`ctrl+c` if a turn is in progress", but drovr knows "in progress" only from a snapshot. If the turn ends between the snapshot and the keystroke, Codex quits. While OpenCode works, its prompt is usually empty, so Ctrl+C exits the app. Either way the profile's process is gone, which is the opposite of Stop. Fix: a per-harness interrupt sequence (`esc` for Claude Code and Codex, `esc esc` for OpenCode), sent with `send-keys`, and never Ctrl+C.

### D7. First-launch dialogs are covered for Codex only (`:179`, `:369`, `:423`)

Claude Code shows a workspace trust dialog in any folder it has not trusted, and a fresh run directory is such a folder. Acceptance is stored in `~/.claude.json`, keyed by the git root, or by the start directory outside a repository. Until the folder is trusted, Claude ignores project settings that pre-approve `.mcp.json` servers (`enableAllProjectMcpServers`, `enabledMcpjsonServers`), with the explicit reason that "a cloned repository can't approve its own servers". Project `permissions` and `additionalDirectories` also wait for trust. So a Claude profile's first launch stops on the trust dialog, and then possibly on an MCP approval as well. Stage 2's first check, "produces that sentence in a new session" (`:418`), blocks on it. The failure table and stage 2 name only the Codex trust prompt.

OpenCode has no trust gate. Its project `opencode.json` applies at once.

Fix: treat every first-launch dialog the same way. It is a Needs-you card with the harness's keys, answered once by the owner, and drovr presses nothing. drovr writes the MCP approval key into the run directory's settings anyway. Claude ignores it until the owner trusts the folder and honors it after that, so later launches do not ask again. Stage 0 checks whether the MCP prompt still appears in the same first session, right after trust is accepted.

### D8. Delivery can type over the owner (new)

See fact 1. The router's wait rule is about the agent's state, and the composer is invisible to it. Proposed rule: a delivery to a pane that herdr reports as `focused` waits briefly, and the PWA shows "N waiting". This cannot be complete, because herdr does not expose a draft. Stage 0 should measure what each harness does when text is pasted into a non-empty composer.

### D9. Opening a card moves the owner's focus (`:300`)

"herdr's focus is what clears `done` into idle; drovr then shows the card as Resolved." The PWA is not a herdr client. To clear `done` it would have to call `agent focus`, and that moves focus in whatever desktop client is attached. Resolved should be a drovr-side marker keyed on `(pane, state_change_seq)`. herdr's `done` is left for herdr clients to clear.

### D10. `@` anywhere in the composer reroutes the message (`:349`)

"The composer posts through the router when the body contains an `@` target." "Tell @reviewer it's fine" written to builder would go to reviewer. So would `@types/node` or `@Override` pasted into a prompt. The target should be a chip chosen in the UI, or a leading `@name` at the very start of the text, never a mention parsed out of free text.

### D11. "The new assistant text is the reply" is underspecified (`:131`)

One turn of a coding agent writes many assistant records, with tool calls between them. Every assistant text after the offset is the whole running commentary. The last text block after the final tool result is the answer. The design should say which one, and Claude's documented warning that the JSONL format is internal applies to both.

The transcripts are also moving. Claude's docs say the final message may not be in the file yet when a turn ends. Codex writes no rollout until the first prompt, and its source already has flags for compressing old rollouts and for moving history to SQLite. OpenCode's export command moved between versions 1 and 2. Three formats, each changing, are a poor thing to route on. The proposal sidesteps all of this by not taking replies from transcripts. If drovr ever needs Claude's final text, the documented route is the Stop hook's `last_assistant_message` field, not the JSONL.

### D12. Data has two sources of truth (`:99-112`)

- `profiles` mirrors `profile.json` (harness, env names, version). The files are the profile. A table copy drifts.
- `occupants` is a persisted snapshot that is "replaced on each reconcile". It is a cache, and it belongs in memory.
- `wakes` duplicates `messages`, while the text says "a schedule or an event is a message" (`:278`).
- `tasks.status` is stored and is defined entirely by herdr state plus message state (`:293-298`). OpenDuet's `task-store.ts`, which the OpenDuet review cites, derives status on read for exactly that reason. The design borrowed the four labels and stored the field.

### D13. `drovr propose` is a gate the agent opens for itself (`:312-316`)

It runs only when the agent chooses to call it. A harness that edits a file outside the workspace with its own Edit tool never meets it, as the design says. Meanwhile each harness already has a permission system that the harness enforces. Claude Code has `permissions` in project settings, applied once the folder is trusted. Codex has `sandbox_mode`, `approval_policy`, and `writable_roots` in a trusted project's `.codex/config.toml`. OpenCode has `permission` in version 1 and `permissions` in version 2, with no trust gate. When one of those asks, herdr reports `blocked`, which the design already turns into Needs input. drovr can write those settings from the profile and draw the blocked pane's question as a card with the harness's own answer keys. The harness then does the enforcing, and drovr does not need `drovr propose`, the `approval_rules` table, or a path, command, and post pattern language.

### D14. Smaller inaccuracies

- The materializer's OpenCode target (`:172`) is `opencode.json` `mcp.servers`, which is fine. But in OpenCode 2, a `workspace` boundary needs explicit `permissions` rules, because external directories are allowed by default. Nothing in the design writes OpenCode permissions at all.
- Stage 1 sorts "`blocked` above `done`, and `done` above idle and working" (`:405`). Working should sort above idle. A pane that is running is more interesting than one that is waiting for nothing.
- Batch step 6 (`:129`) says "its `completion_seq` is the one observed before this batch". After a non-completion transition the value is `None` (fact 2). The condition should be stated on `state_change_seq`.
- "One automatic retry only if the transcript shows the prompt never arrived" (`:367`) needs a transcript reader for every harness and every machine. `state_change_seq` not advancing, plus an `agent read` that does not show the text, is the cheaper check.
- `profile.json` holds "extra workspace paths", and the PWA lists them. Nothing materializes them into the harness's own allowed directories, so the harness does not know about them (D4).

## Scope

| | plan-original.md | plan-proposed.md |
| --- | --- | --- |
| MVP steps | 3 | 4 stages, the last larger than the first three |
| Tables | 3 | 12 |
| State sets | message states | messages (7), wakes (5), tasks (4), approvals (4) |
| Text conventions the agent must print | none | `drovr: quiet`, `drovr: choices:` |
| Agent commands | `drovr msg` | `drovr msg`, `drovr propose` |
| Inbound network surface | PWA API | PWA API plus webhooks with secrets and signatures |
| Wake sources | none (Later) | schedules, webhooks, path watchers, command watchers, standing goals, brief |

The first review was a careful reduction. It took the plan, closed four open questions with source, and changed only what the evidence forced. The OpenDuet pass, written 22 minutes later according to the commit times, went the other way. Every borrowed idea is individually reasonable, and the README now lists proactive wakes as a reason drovr exists. But schedules, watchers, and goals are one mechanism: on a cadence, optionally check something cheap, and if it changed, prompt the profile. They are specified as three features with separate floors, cursors, coalescing rules, and failure rows. Webhooks are a fourth, and D5 shows they cannot arrive. The proposal collapses these into one trigger with an optional check.

## The reviews of OpenDuet, OpenBot, and OpenDots

The verdicts are right, and they follow from the README in one sentence each. All three run agents as headless turns (AG-UI, the Claude Agent SDK, TanStack AI), and the README rules out headless runtimes. The reviews are careful and well sourced. About 530 lines went to three "do not build on it" conclusions that the constraints already decided. What actually moved into the design fits in a short list:

- A 15-minute floor for scheduled prompts, and missed ticks skipped rather than replayed (OpenBot routines).
- Four attention labels: Working, Needs input, Ready for review, Resolved (OpenDuet Tasks).
- Allow once, Always allow, Refuse (OpenDuet and OpenBot approvals).
- For GitHub events: check the signature over the raw body, lock the repository, filter event types, and key deliveries on the body hash (OpenBot responsibilities).

Two things worth taking were left behind:

- **Derived task status** (`task-store.ts`). See D12.
- **`expecting` on a handoff** (`handoff.ts`). See D1. The reason OpenBot gives for a typed envelope, that free text makes the receiver guess the intent, is the reason drovr needs ask and tell to be different verbs.

`plan-duet-takeaways.md` says OpenDuet has "no agent-to-agent messaging", and the OpenDuet review corrects that. The notes file should be marked as superseded, or the correction should be repeated there. Someone who reads the notes alone gets the wrong fact.

The OpenDots review could be a paragraph. It changed nothing, and it says so.

## The original open questions, answered again

| Question | plan-review.md | This review |
| --- | --- | --- |
| 1. Which flags carry a profile | None; use files in the cwd | Agree. Add the harness's permission settings and the first-launch trust state to the materialized files (D4, D7, D13) |
| 2. What captures every reply | herdr settle plus a transcript read | Partly disagree. Settle, yes. The reply should come from the agent's explicit `drovr reply`. Transcripts are for display and an optional fallback |
| 3. What survives a restart | Session id and managed names, with resume on | Agree. Re-match by session id after a cold restart only. Do not use the session id as occupant identity at other times (D3) |
| 4. Events through `--machine` | No; poll | Agree. Compare `state_change_seq` across polls, not `completion_seq` (fact 2) |
| 5. Queued message when the name moves | Only the bound occupant | Agree, with the binding in D3 |
| 6. Advisory allow list | Enough, and say so | Agree. The proposal keeps the approval card for off-list messages and drops `drovr propose` |

## What to do next

Before any service code, spend a day on a spike against a real herdr 0.9.5 hub with each harness. Write a throwaway script and record the results in `docs/spike.md`. The checks, all cheap:

1. Cold restart of a managed Claude, Codex, and OpenCode pane. Record the name, public pane id, cwd, and session id.
2. First launch in a fresh run directory. Record every dialog each harness shows before it accepts a prompt, and which pre-written settings suppress it.
3. `agent prompt` into a pane whose composer already holds text.
4. `/clear` or `/new` in a profile pane. Record what herdr reports.
5. The interrupt key for each harness, mid-turn and idle.
6. A skill that tells the agent to answer with `drovr reply <id> "…"` (a stub script that writes a file). Record whether each harness calls it reliably, over ten messages.
7. `herdr --machine <alias> api snapshot` against one saved machine, and how `state_change_seq` moves between polls.
8. A git worktree inside the run directory. Record whether each harness treats it as inside the project: Claude without a permission prompt, Codex under `workspace-write`, OpenCode.

Items 2, 3, 6, and 8 decide the parts of the proposal that differ most from the current design.
