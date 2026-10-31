# Codex review of the drovr plans and reviews

Reviewed on 29 October 2026. The companion design is [codex-proposed.md](codex-proposed.md).

The architecture is worth pursuing: persistent profiles and a durable message router in front of herdr, with native interactive harnesses and a small phone interface. I would use the Claude proposal as the starting point, retain its explicit replies and unified triggers, and strengthen the delivery and recovery contracts before implementation. Neither existing proposal is ready to implement literally.

The main unresolved problem is that drovr writes into another program's interactive input. SQLite can remember an intention to send. herdr can report pane state and write keystrokes. Neither provides a transaction that proves a particular message was consumed by a particular agent. That limitation affects retries, replies, identity, human takeover, and scheduled work. A smaller feature list alone does not resolve it.

## Scope and evidence

I read the current README and all nine existing documents, including the untracked Claude review and proposal. This repository contains no service, web app, build manifest, tests, or spike results. The existing documents are evidence of design intent, not evidence that their acceptance tests passed.

I independently inspected these upstream files through GitHub at herdr tag `v0.9.5`, resolved to commit `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`, the baseline used by both earlier reviews:

- [`src/api/schema/agents.rs`](https://github.com/herdrdev/herdr/blob/v0.9.5/src/api/schema/agents.rs): prompt parameters and agent identity/state fields.
- [`src/app/api/agents.rs`](https://github.com/herdrdev/herdr/blob/v0.9.5/src/app/api/agents.rs): validation, submission, write acknowledgment, and screen reads.
- [`src/api/schema/events.rs`](https://github.com/herdrdev/herdr/blob/v0.9.5/src/api/schema/events.rs): subscriptions, event matches, and output events.
- [`src/app/actions.rs`](https://github.com/herdrdev/herdr/blob/v0.9.5/src/app/actions.rs): state and completion sequence updates.
- [`src/persist/restore.rs`](https://github.com/herdrdev/herdr/blob/v0.9.5/src/persist/restore.rs): native restore, new terminal allocation, managed names, and empty extra environment.
- [`src/agent_resume.rs`](https://github.com/herdrdev/herdr/blob/v0.9.5/src/agent_resume.rs): native resume commands and reported session sources.
- [`src/cli/target.rs`](https://github.com/herdrdev/herdr/blob/v0.9.5/src/cli/target.rs): remote command allowlist and ambiguous SSH failures.

I also checked current official Codex configuration and instruction docs, Claude permission docs, OpenCode 2 permission docs, Git docs, and GitHub webhook validation docs. I spot-checked the three CopilotKit READMEs at the exact commits named in their reviews. I did not independently reproduce every upstream source claim, historical activity count, or license statement in those reviews.

Two small experiments ran in a disposable local Git repository: repeated edits with a HEAD-plus-status fingerprint, and the location of a linked worktree's Git metadata. No herdr server was stopped, no harness session was launched, no remote machine was contacted, and no token-use benchmark was run. Conclusions below distinguish source facts, local experiments, and design deductions.

## What to keep

The original plan got the ownership split right. herdr owns panes, agent detection, launch, native resume, and machine access. drovr owns profile definitions, admission and scheduling of its own deliveries, message history, and the browser API. Keeping that split avoids the maintenance problem described in the README.

Keep these decisions from the later documents:

- Stable profile files, with the owner's existing harness login. Cold restore does not generally replay profile flags or extra pane environment.
- Hub-only profile launches and proactive wakes. Other machines contribute existing agents through a deliberately smaller adapter.
- An explicit distinction between a persistent profile, a live agent, a terminal, and a harness conversation.
- Explicit `ask`, `tell`, `reply`, and `report` operations. Transcript readers support display; they should not decide message semantics.
- A single trigger primitive with optional deterministic checks, bounded pending work, and missed-tick policy.
- Attention derived from runtime observations and durable drovr facts. Reading a card should not move herdr's focus.
- An advisory routing allow list, with an honest account of same-user shell access.

The original proposal's automatic relay should be dropped. An answer is a terminal event for the request, and any later request should be an explicit new act. The Claude review correctly identifies both the unnecessary response chain and the problem of forwarding owner-facing final prose to another agent.

## Findings that affect both proposals

Severity means implementation priority: P1 changes the delivery or recovery design; P2 is required for a reliable first release. These are design defects, not reports of running-code bugs.

### R1 — P1: A missing screen echo cannot justify an automatic retry

**Locations:** [plan-proposed.md, Router and Failure modes](plan-proposed.md#router); [claude-proposed.md, Router steps 6–9](claude-proposed.md#router); [claude-review.md, D14](claude-review.md#d14-smaller-inaccuracies).

Both proposals allow a retry after looking for prompt text. The Claude version expressly retries if the text is absent from the screen. A TUI can consume text, redraw it out of view, collapse it, or begin work before drovr sees the echo. Absence is inconclusive. The earlier transcript variant has a similar gap while the log is delayed or inaccessible.

There is also an unavoidable crash window:

1. drovr records a queued row.
2. herdr accepts the prompt and the agent acts.
3. drovr dies before recording the acknowledgment.
4. after restart, the same queued row is submitted again.

The pinned `AgentPromptParams` has no message id or idempotency key. The handler acknowledges completion of the PTY submission, not model consumption. A local database transaction cannot include that external write. Remote forwarding explicitly avoids replaying requests after ambiguous SSH failures in `target.rs`.

**Change:** persist an attempt before writing and retain `delivery_unknown` when a write may have happened. Retry automatically only after a failure proven to occur before submission, such as a validation refusal. Use message/delivery ids to deduplicate drovr API calls and explicit results. An owner retry creates a visible new attempt. State the limit: drovr cannot promise exactly-once agent execution.

### R2 — P1: Silence does not establish ownership of the composer

**Locations:** [claude-proposed.md, change 11 and Router step 4](claude-proposed.md#router); [claude-review.md, D8](claude-review.md#d8-delivery-can-type-over-the-owner-new).

The source confirms the review's central concern: submission encodes the text and queues it with Enter; it does not establish that the harness composer is empty. Five seconds without output leaves a half-written draft intact. It also leaves a race in which a person starts typing after drovr's check.

There is a concrete API mismatch as well. In `src/api/schema/events.rs`, `pane.output_changed` exists as an event kind and as an `EventMatch`. It is absent from the `Subscription` enum. The proposal's per-pane `events.subscribe` request for it cannot be constructed against that pinned schema. A wait facility or polling could observe output revision, but would still not prove an empty composer.

**Change:** introduce explicit automatic versus shared pane operation. Automatic delivery requires the owner to hand the pane to the router; taking it back pauses queued work. Shared ordinary panes receive queued messages that the owner submits deliberately. Document this as cooperative ownership, since direct herdr input can bypass it. Pursue an upstream conditional-submit/input-ownership API if simultaneous automatic and human use is required. Never clear someone else's draft as a workaround.

### R3 — P1: State sequences indicate changes, not completion of a particular delivery

**Locations:** [plan-review.md, question 2](plan-review.md#2-does-done-plus-the-transcript-capture-every-reply); [claude-review.md, source fact 2](claude-review.md#facts-from-the-source-that-the-design-has-not-absorbed); [claude-proposed.md, Router steps 7–8](claude-proposed.md#router).

The Claude review correctly finds that `completion_seq` is cleared on non-completion transitions and session changes. Its replacement is too strong: `state_change_seq > sent_seq && ready` does not prove that this batch finished. A session change, an unrelated owner turn, or an approval transition can also advance the observation. Two histories can produce the same final snapshot. A poll cannot reconstruct the missing history.

The counter is useful for freshness within an observed server lifetime. It is not a delivery id, a durable turn id, or proof of continuity across cold restore. The restore path creates a new `TerminalState` with a newly allocated terminal id. Outstanding work cannot simply compare its old observation baseline against that new runtime.

**Change:** distinguish `pane_ready`, `submission_acknowledged`, and `explicit_result_recorded`. Use explicit results to close semantic requests. A ready pane with no reply means “no reply recorded,” until an explicit close or deadline establishes the request outcome. Reset observation baselines on discontinuity. Missing observations must produce uncertainty instead of a fabricated completion.

### R4 — P1: Ordinary-agent identity remains ambiguous after a gap

**Locations:** [plan-proposed.md, Bind](plan-proposed.md#router); [claude-proposed.md, Resolve and bind](claude-proposed.md#router).

Binding only to a harness session is too strict during an observed `/clear`, as the Claude review explains. Binding only to terminal id plus current name is too weak across lost events or polling. An agent can exit and another agent of the same harness can take the same name in the same terminal between observations. The two snapshots can look equivalent. `terminal_id` identifies the terminal, not a cryptographically or durably identified agent incarnation.

The reverse path matters too. An answer to an ordinary agent must not wake a different agent that later inherits the asker's name. Both target and return address need a binding. Threads keyed only by display names can also join unrelated occupants' histories.

**Change:** assign drovr actor ids and observation generations, scoped by machine profile id and herdr server namespace. Keep profile identity stable through observed conversation resets. Across a continuity gap, hold ordinary-agent deliveries for revalidation or explicit resend; do not infer continuity from equal names. Use actor ids for history, and record names as historical display values. A durable upstream agent-incarnation id would improve this substantially.

### R5 — P1: The reply protocol still needs retry and wait semantics

**Locations:** [claude-proposed.md, Messages](claude-proposed.md#messages).

Explicit replies are a major improvement, but three remaining rules are unsafe:

- Converting a second reply into a `tell` turns a retried CLI/API request into a new wake. A lost response followed by a retry should return the original result; a conflicting second answer should be rejected or amended explicitly.
- “Still waiting on stdout, otherwise prompt” has an acknowledgment race. The server can write to a CLI connection just before it dies. The reply must remain durably retrievable even if the process did not consume that write. A connection is not a receipt.
- The two-agent wait check does not specify longer cycles or an ask to oneself. A → B → C → A also stalls when each pane is working while its shell command waits. Approval waits and command timeouts make the 90-second default less attractive.

**Change:** default asks to a durable receipt, with optional bounded waiting. Store a single accepted answer under a unique request id. Treat stdout as an optimization over a durable inbox, with an explicit claim/ack if suppressing a later notification. If blocking waits ship, check the full wait graph and self-edges. None of these paths should require replaying the original question.

### R6 — P2: Hop limits do not bound total work

**Locations:** [plan-proposed.md, Relay](plan-proposed.md#router); [claude-proposed.md, Hop](claude-proposed.md#messages).

Inheriting the highest hop of an unsettled batch is better than incrementing only automatic relays. It still leaves undefined what happens after settle, after a delayed reply, after a service restart, and when several causal roots share one batch. Depth four can also permit a large fan-out at each level. A limit on depth does not limit breadth or frequency.

**Change:** persist a root id and parent id for causal messages, preserve that context on asynchronous answers, and bound accepted sends per root as well as depth. Add a per-profile wake rate and pending-work cap across all sources. Explain that causal attribution from an agent's arbitrary same-user shell is cooperative; rate budgets remain useful when attribution is incomplete.

### R7 — P2: A HEAD-plus-status fingerprint misses actual file changes

**Locations:** [plan-proposed.md, Standing goals](plan-proposed.md#standing-goals); [claude-proposed.md, Check](claude-proposed.md#triggers).

This defect survives the worktree correction. In a disposable repository, I committed `sample.txt`, changed it once, captured `HEAD + git status --porcelain`, and changed its contents again without committing. Both captures were identical (`M sample.txt`), while content hashes differed. The check would suppress the second change. An untracked file has the same problem. Git's [status format](https://git-scm.com/docs/git-status#_short_format) describes status and paths, not a complete content fingerprint.

Size plus modification time is also a heuristic, and hashing all of a run directory can let agent outputs trigger the next wake indefinitely. A local worktree's HEAD does not change merely because a remote repository has new commits. The desired input must say which state it observes.

**Change:** offer explicitly named check policies: committed revision only; bounded content snapshots including dirty and untracked inputs; or a canonical command result. Define include/exclude paths, deletion handling, initial baseline, and fetch responsibility. Hash full bounded check data before truncating the display payload. Store the observed fingerprint separately from the fingerprint actually delivered.

### R8 — P1: Stop is temporary unless autonomous wakes are paused

**Locations:** Stop and trigger rules in [plan-proposed.md](plan-proposed.md#queue-and-busy-state) and [claude-proposed.md](claude-proposed.md#router).

Both cancel the current queue. Neither gives Stop a durable rule for the next trigger tick. A scheduled job can wake the pane again shortly after the owner stopped it, including after a service restart. A queued launch or in-progress check can also race cancellation.

**Change:** separate Interrupt from Pause automation. Provide a prominent Stop action that pauses new automatic deliveries before cancelling pending work and interrupting the current turn. Persist the pause. Resume is explicit, and it does not replay the accumulated missed ticks. Tag attempts with a cancellation generation so old check results cannot re-enqueue after Stop.

### R9 — P2: Moving files and permissions into profiles needs a deployment contract

**Locations:** [claude-proposed.md, Files, Workspaces, and Materialization](claude-proposed.md#files); [plan-proposed.md, Profile materialization](plan-proposed.md#profile-materialization).

Worktrees solve concurrent working-copy edits, but do not automatically solve instruction discovery or isolation. Git [documents](https://git-scm.com/docs/git-worktree#_details) a linked worktree's private Git directory under the main repository. The local experiment confirmed that a worktree nested in `runs/reviewer/api` still points into the external source repository's `.git/worktrees/api`. Editing a source file and committing it exercise different paths.

The [Codex instruction docs](https://learn.chatgpt.com/docs/agent-configuration/agents-md) define discovery from project root to cwd, with cwd-only discovery outside a detected project. Starting in a generated parent does not automatically load a child worktree's repository guidance. The Claude proposal acknowledges this, but its instruction to read a file manually is a cooperative workaround, not equivalent config discovery. The [Codex security docs](https://learn.chatgpt.com/docs/agent-approvals-security#protected-paths-in-writable-roots) also protect Git metadata in writable roots, including resolved worktree Git directories. Test edit, test, stage, and commit separately.

`ask` and `workspace` are misleading as equivalent cross-harness permission modes. Codex's workspace sandbox permits many commands without prompting; it does not ask for every command. Claude's [permission docs](https://code.claude.com/docs/en/permissions#permission-modes) describe mode-specific edit and filesystem-command behavior. OpenCode's [permission docs](https://opencode.ai/v2/docs/permissions/) explicitly state that shell access carries the host user's authority and directory inference is best effort. Native permission systems help, but they provide different boundaries.

A Git commit or one file's mtime also fails to identify the effective profile: uncommitted skills, instruction changes, native overrides, and materializer behavior can change independently. “Copied last” overrides can silently replace generated MCP or permission settings. Rewriting a live directory in place can expose a mixture of old and new files.

**Change:** pin and test a workspace layout per adapter; version effective profile content with a digest; track desired and applied revisions separately; define file ownership and override conflicts; stage updates while the profile is stopped. Show the exact native permission settings and their limits, rather than promising identical `workspace` behavior. Keep worktree creation optional and require an explicit base ref; never choose or update a working branch silently.

### R10 — P2: Configuration and sender identity are advisory under the same OS user

**Locations:** sender attribution in both routers; [claude-proposed.md, owner-only triggers](claude-proposed.md#triggers); environment checks in both materializers.

`HERDR_PANE_ID` is useful attribution data, but a process can set an environment variable. A machine-wide token identifies a machine, not the specific pane supplied in the request. Checking that the claimed pane exists does not establish who sent the request. Similarly, omitting a scheduling CLI does not prevent a shell-capable agent from editing writable trigger files. Mode `0600` does not distinguish two processes running as the same user.

These limits fit the README's trusted single-user model, provided drovr does not present them as enforcement. Server-side lineage, duplicate prevention, and accidental cross-pane attribution still deserve checks.

There is a separate environment mismatch: checking the drovr service's environment does not prove the independently started herdr server has the same values. Profiles inherit from the latter. A successful launch check can therefore be followed by missing credentials in the pane.

**Change:** separate owner device/administrative operations from pane messaging, scope remote tokens to their intended role, verify claims as far as the adapter permits, and state the same-user trust boundary. Activate reviewed config revisions explicitly, particularly executable checks. Verify required environment *presence* in the actual launch context without returning values. Do not silently inject every secret known to the service.

## Additional corrections to the existing documents

### R11 — P1: Hash-only GitHub webhook secrets cannot verify GitHub HMACs

**Location:** [plan-proposed.md, Events](plan-proposed.md#events) and [Security and pairing](plan-proposed.md#security-and-pairing).

The design stores the webhook secret only as a hash and requires `X-Hub-Signature-256`. GitHub's [validation procedure](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) requires computing HMAC-SHA256 with the shared secret over the received body. A one-way digest of that secret is not the HMAC key GitHub used.

Bearer/device tokens can be verified by storing their hashes. An HMAC secret must remain retrievable from a credential store or suitably protected local secret source. The existing GitHub signature, repository, event filter, and replay rules are useful, but the secret-storage contract must change if inbound GitHub hooks ship.

The Claude review also correctly identifies the ingress problem: a public GitHub delivery needs a reachable ingress path. Polling from the hub is a reasonable first-release alternative. State its latency and missed-intermediate-event tradeoff rather than treating it as equivalent delivery.

### R12 — P2: Several earlier review conclusions are narrower than their wording

The first review labels reply capture “resolved” while its own unknowns include transcript location/schema, file flush timing, and resumed instructions. Those are implementation dependencies for the proposed routing path. The Claude proposal correctly removes that path, but its optional transcript/Stop-hook fallback reintroduces ambiguous correlation when multiple asks share a batch. Any fallback needs its own matching and duplicate policy; it cannot be added merely because ten happy-path replies were unreliable.

The Claude review's claim that every harness permission question becomes a blocked card also needs qualification. The first review already documents missed dialog classification. herdr state is an observation, and unrecognized dialogs remain a compatibility risk. Likewise, the [documented alternate-screen history path](https://herdr.dev/docs/agent-automation/#alternate-screen-history-reads) can reject an explicit history read while blocked, working, or unknown. Passive `visible` reads remain available; `agent read` must not be treated as a universal transcript API. Use a bounded visible screen read for a blocked dialog and retain a terminal fallback.

The claim that hub events always arrive is too strong in a system that has `events_lost`. A version requirement of “0.9.5 or later” also does not establish compatibility with every later release. Ship a tested version matrix and capability failures.

## Assessment of every existing document

| Document | Assessment | How it should inform the next design |
| --- | --- | --- |
| [README](../README.md) | Best statement of the present product constraints, including proactive work in v1 | Preserve profiles, core routing, native TUIs, hub wakes, ordinary agents, own web app, and one-user scope |
| [Original plan](plan-original.md) | Clear boundary and useful unresolved questions; reply inference and identity need revision | Preserve as historical requirements, not an implementation spec |
| [First review](plan-review.md) | Strong source-based work on restore, remote limitations, and auth locations; reply guarantees overstate the evidence | Reuse the pinned herdr findings and turn live unknowns into gates |
| [First proposal](plan-proposed.md) | Broadest product specification; automatic relays and duplicated state make it brittle | Preserve required product behavior; replace its transport, result, stop, and webhook-secret contracts |
| [OpenDuet notes](plan-duet-takeaways.md) | Useful product ideas; the no-agent-messaging claim is contradicted by the longer review | Mark as historical working notes if later edited; do not treat them as current upstream facts |
| [OpenDuet review](openduet-review.md) | Runtime mismatch is persuasive; derived tasks and explicit handoff intent are valuable | Borrow the intent/result distinction and attention model, with no platform adoption |
| [OpenBot review](openbot-review.md) | Runtime mismatch and webhook filtering are useful; it does not settle drovr's own secret storage or ingress | Retain narrow filtering and bounded wakes; independently specify receipt persistence and HMAC secrets |
| [OpenDots review](opendots-review.md) | No runtime fit; one useful principle was dismissed too quickly | Keep its documented “interrupted/ambiguous side effect requires explicit retry” lesson for drovr's PTY boundary |
| [Claude review](claude-review.md) | Correct major criticism of automatic relay, generated workspaces, focus, and Ctrl+C | Retain those corrections; qualify sequence, retry, permission, and identity claims as above |
| [Claude proposal](claude-proposed.md) | Stronger starting point, especially explicit results and unified triggers | Add attempt persistence, uncertainty, pane ownership, durable pause, revisioned materialization, and stronger wake checks |

The three platform verdicts remain consistent with the pinned READMEs: [OpenDuet](https://github.com/CopilotKit/OpenDuet/blob/677e0fcd148d80b99dd788c6d6f9c1c9f40a72db/README.md), [OpenBot](https://github.com/CopilotKit/OpenBot/blob/aafe043c7bac95b838351e5006c0ecd868efb634/README.md), and [OpenDots](https://github.com/CopilotKit/OpenDots/blob/8091324942b86789ed0da7facbee855145d933b0/README.md) describe agent runtimes and conversation infrastructure that drovr does not need. No adoption decision depends on their star counts or historical release counts. Collie's referenced boundary between browser, bridge, and harness logs remains useful prior art; this review does not claim a new audit of Collie's code or magnesium goal 34.

## Recommended decision

Proceed with the native-TUI product and explicit results. Put a durable mailbox and attempt journal at its center. Make uncertainty visible, distinguish shared from automatic panes, and make Pause survive restart. Preserve proactive hub profiles in the release goal, with schedules, event checks, and standing-goal checks sharing one admission path.

Before building the full PWA, prove the transport and profile assumptions with real harnesses. The next artifact should be recorded compatibility results, including induced failures, rather than another upstream feature comparison. [codex-proposed.md](codex-proposed.md) specifies the contracts, rollout, and acceptance evidence I would use.
