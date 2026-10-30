# Shared implementation contracts

These are narrow implementation clarifications to [plan-final.md](../research/plan-final.md), not a replacement design. Goal numbers link from the [implementation index](README.md). Keep these decisions in one place and test them through the same command handlers.

## C1. CLI payloads and identity

Keep only `send` and `reply` as agent tools; both return after durable admission. Use the final plan's request-key behavior and exit codes. Exactly one body source is accepted: positional text, `--text-file`, or piped stdin. Empty text is exit 4, **except** `reply <id> --quiet`, which may omit the body. This makes the final plan's quiet example executable. Quiet and choices are reply-only and mutually exclusive; choices require 2–4 distinct nonempty labels, each at most 80 UTF-8 bytes. The rendered 16 KiB limit includes headers, data wrapper, and choices; reject rather than truncate an instruction.

Preserve profile identity from the resolved `HERDR_PANE_ID`, and owner identity for a hub shell without that variable. A pane that is not a profile cannot message. This is the final plan's trusted-account attribution, not protection from a same-user process that changes its environment. Owner commands, including `pending`, remain unavailable from profile panes. A later refusal is visible in the thread; do not promise an agent-only `pending` read.

The CLI retains its generated request key across its own transport retries. A new CLI invocation without `--request-id` is a new operation. Browser retries likewise reuse their original action key. Compare the full canonical input before re-running authorization, counters, or mutations for a duplicate key.

## C2. A reply must not create another automatic reply chain

Add one message discriminator: `operation = send | reply`. Trigger wakes are `send`. `in_reply_to` is a display/thread link and does **not** define operation: a choice tap is an owner `send` with a new root and a link to the offered reply.

A profile replies only to a message previously attempted for that profile. The exact active `prepared`/unknown message is eligible too, so an early reply can beat the acknowledgment. This permission does not extend to every row merely addressed to it. The owner may reply to any message as specified in the final plan.

Only the first reply to an original **send** can acquire the right to wake its profile sender. Reserve that right transactionally at insertion (`wakes = 1`), even if delivery is held or later cancelled. Retrying the same request key returns the same row; a later different reply is `recorded`. **Replies to reply rows are always recorded-only.** Otherwise replies could bypass every depth/fan-out bound. The reply header never invites another reply; an intentional follow-up is a new `send` through admission.

Replies to owner/trigger sends target the owner and never enter the dispatcher. Quiet suppresses only that result card, not operational errors. Apply the final plan's active-message lineage rule to new sends, and retain depth/root on replies. Ordinary missing replies create no automatic notice or prompt. Read threads by root plus transitive reply/choice links; return each row once and order by numeric row id, not the `m…` display string.

## C3. One durable admission path

Deduplication, target validation, rule selection, lineage, budget checks, and insertion use one transaction. Calls from the CLI, owner API, and triggers use it. Validate static misuse before insertion; a well-formed send to a nonexistent profile is a persisted refusal, not a waiting address.

Add nullable `messages.admitted_rule_id` to identify the actual rule that admitted a profile send. One-time owner approval remains distinguishable without an approvals subsystem. Revocation holds not-yet-attempted messages admitted by that rule in the same operation that removes/disables it; submitted prompts remain history. Re-check the current target/config and permission decision at dispatch. A duplicate request never consumes another budget or produces another decision.

The known profile set comes from config. Do not add ordinary-agent actor ids, mutable aliases, profile renames, or name recycling workflows. Missing/invalid config blocks new launch/dispatch for that profile without deleting its runtime or history.

## C4. Attempt selection, retry, and cancellation

Ordinary selection requires `wakes = 1`, queued admission, and **no previous attempt**. A closed attempt does not make its message eligible again. Explicit owner Retry is the only way to prepare another attempt for the same message id.

Use one shared pending predicate for queue capacity, dispatch, and pending reads: unattempted queued/held/awaiting-approval items, plus messages with a current open attempt. A closed, cancelled, or retired historical attempt does not keep its message in the pending count merely because an old admission value is still `queued`.

After pre-write validation, atomically claim `active_message_id` and insert the `prepared` attempt. Do not claim first and leave a phantom active item if validation fails. Hold the profile's in-process dispatch guard through submission classification; Stop and other owner operations use that same serialization boundary where needed.

Only the latest attempt for the active message blocks or settles the profile. Retry retires the earlier attempt from scheduling without erasing its unknown history. A lost retry response cannot create attempt `n + 2`: owner actions carry idempotency keys too. An in-progress transport call must finish or time out before a retry is dispatched.

Add owner-only `drovr cancel <message-id>` and the matching card/API action. It cancels future submission, clears the active slot once no write is still being issued, and retains every attempt and any late reply. It explicitly does not undo or prove the absence of earlier effects. Replies recorded after cancellation stay in history and do not start a new wake. This is the smallest escape from unknown delivery when the owner wants no duplicate; Stop alone deliberately preserves unknown attempts.

`prepared` recovered without a conclusive acknowledgment becomes `delivery_unknown`. Screen/transcript absence never authorizes retry. An unrelated outgoing `send` does **not** prove an incoming prompt arrived. Only a reply referencing the exact active message provides message-specific reception evidence. With one attempt this can resolve its reception uncertainty; after retries it cannot identify which copy ran. Record that evidence without attributing an old reply to a newer attempt: an unresolved latest transport outcome stays unresolved until owner recovery. Do not invent exactly-once execution.

## C5. Runtime observations are scheduling facts

Verify the actual output-observation API in goal 01. The final plan assumes a subscribable `pane.output_changed`; the earlier source audit reports that this is absent from the pinned subscription schema. Use the verified event if available; otherwise sample the supported output revision/visible snapshot through the **same** refresh loop while a delivery waits. No second watcher service or invented subscription.

Preserve the five-second output debounce. It is an activity heuristic, not proof of an empty composer. Record the draft collision result and the limitation; do not add ownership modes, automatic draft clearing, or auto-answer keys.

Close a submitted attempt only against a comparable baseline on its matched runtime, using the final plan's later ready-state observation. `closed` means the delivery slot became ready again, not that an answer was written or a task succeeded. A session reset alone is not completion. Across a cold restore or an observation gap that prevents continuity validation, hold recovery rather than comparing unrelated sequence numbers, silently closing, or resending. Persist the smallest baseline/continuity marker needed, not a runtime event log.

Use a bounded visible screen read for dialogs. A specialized key action revalidates the target and current dialog; stale/unknown cards open the pane without sending an answer. Installed-version native permission and interrupt behavior is verified, not inferred from a common permission label.

## C6. Limits, Stop, and recovery stay durable

Keep the final defaults: depth 4, 16 child sends per root, 64 pending items per profile, 4 trigger deliveries/profile/rolling hour, and 4 agent-initiated roots/sender/rolling hour. Reply rows are not child sends, but wakeable replies still occupy queue capacity. Refused duplicate calls do not multiply counters. Owner approval cannot bypass the physical one-active-attempt rule.

Add `attempts.submitted_at` and retain it after close. Rolling counts cannot use the current state or mutable `updated_at`. Count distinct trigger messages with a submission in the interval, not replies or every retry of the same message. A prepared/unknown attempt also conservatively charges its message to the hour of that attempt; acknowledgment loss cannot buy free model calls. That charge survives cancellation, close, or supersession for the original hour even though the attempt no longer blocks scheduling. Deduplicate charges by message id within the window. If a queued trigger cannot yet fit, leave that one pending wake for the next eligible dispatch instead of issuing it. Count-and-claim happens under the single writer/dispatch guard; no separate rate-limit service or counter tables.

Stop commits `paused` and a new cancellation generation before queue cancellation/interrupt. Keep prepared/submitted/unknown history; an external write already underway can finish. Incoming work is held while paused. Check results carry their starting generation and cannot enqueue after Stop. Resume reconciles and schedules from now, never catches up skipped occurrences. Operator overrides of budgets are explicit command inputs recorded with the operation, not automatic behavior of approvals.

## C7. Files and triggers have one applied source

Use the [profile design](profiles.md) for the concrete saved-definition/applied-files/live-session lifecycle, scaffold creation, generated preview, and explicit fresh-session Launch choice. Stop pauses automation; it does not make a still-running TUI safe to rematerialize.

Follow the final plan's files, displayed git/mtime version, and raw native overrides copied last. Do not import the earlier revision-digest system. Validate the resulting native files before launch; a bad override fails clearly. Never rewrite a live session's applied files when config is saved. Copy `triggers.json` only after confirmed native TUI exit, and execute that applied copy until the owner applies changes at launch. Do not read newly edited live checks ahead of the running profile. Persist Launch's fresh/resume choice before applying changed files; interrupted application cannot make an old conversation eligible by leaving desired and applied files equal.

Use the specified HEAD-plus-porcelain `git` check and size/mtime `paths` check. They are heuristics with known gaps, not content-change guarantees; do not replace them with file-content hashing. `command` hashes full stdout before the 4 KiB display cap; give it a 1 MiB stdout limit, discard stderr, terminate/reap a timed-out/oversized process group, and retain the last good hash on failure. Report safe error outcomes rather than forwarding raw subprocess output to logs/errors.

Run checks outside SQLite transactions. Each completed due occurrence revalidates its applied trigger, starting generation, and expected cursor, then advances the cursor and records baseline/error state in one transaction, even for baseline-only, unchanged, or failed checks that admit no message. Reject stale/duplicate completions without overwriting newer state. When a wake is warranted, insert/coalesce it in that same transaction through shared admission. Coalescing is a narrowly scoped internal update of an unprepared trigger message, not another public admission call using the old key with a changed payload; that public call must still conflict. Keep the original request key on the coalesced message. A prepared payload is immutable. First successful check is baseline-only; missed ticks over five minutes and paused ticks are skipped without leaving the same occurrence eligible, and Resume schedules from now. Use one standard timezone-aware cron parser; persist UTC due times and fix repeated/nonexistent local-time behavior in its tests, without implementing a calendar engine.

Profile provisioning resolves an existing local default-branch ref or refuses with a clear error; it never fetches or guesses the current feature branch. The service and herdr environments may differ despite running under one user. Goal 01 must prove launch-context presence checks or name the minimal supported setup; do not record secrets or claim presence from a different process's environment.

## C8. Attention and owner actions are projections

Keep one read model from SQLite plus the current snapshot. Dismissal is the only stored Attention UI state. Store a choice's action key/result reference using the existing message/dismissal records so retries of one tap produce one owner send; two explicit new submissions are two actions. Treat stale choices, approval cards, and keys as stale inputs, not queued offline work.

Quiet hides a result only. Unknown delivery, launch/check errors, and harness questions remain visible. A trigger's no-reply card comes from its closed attempt without a recorded reply; a later reply updates that projection. Browsing never calls herdr focus. Ordinary hub panes remain visible/readable and are never selected as message addresses.

Retain the final plan's small table set. The additive fields above (operation, admitting rule, stable submission time, and the minimum recovery/action metadata) repair concrete contracts; they are not permission to introduce tasks, outcomes, jobs, actor registries, or an audit platform.
