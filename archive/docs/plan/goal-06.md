# 06 — Deliver once, recover honestly

**Show me — planned slice**

**Durable facts and external effects have different owners**

```text
SQLite
  admitted messages + attempt history + active message + durable pause
one serialized dispatcher per profile
  selection, validation, atomic claim, and submission classification
herdr boundary
  one external prompt write + verified runtime/readiness observations
native harness
  executes work; explicitly calls reply when it chooses to answer
owner recovery
  Stop / Resume / Retry / Cancel through the same operation guards
```

**Commit the journal before crossing the prompt boundary**

```mermaid
sequenceDiagram
  participant D as Dispatcher
  participant DB as SQLite
  participant H as herdr
  D->>D: Recheck binding, approval, readiness, pause, debounce, and limits
  D->>DB: Atomically claim active message and insert prepared attempt
  DB-->>D: Commit completes
  D->>H: Submit one prompt for this attempt
  alt Conclusive acknowledgment
    H-->>D: Submission acknowledged
    D->>DB: submitted; retain stable submission time and baseline
  else Ambiguous write or lost acknowledgment
    D->>DB: delivery_unknown; hold automatic scheduling
    Note over D,H: No automatic replay after crash/reconnect
  end
```

**Readiness releases a slot; it does not certify an answer**

```text
select: eligible replies → owner sends → profile sends → triggers
  oldest numeric id within class; ordinary selection excludes all attempted rows
hold if busy / blocked / unknown / launching / paused, or debounce not met
recovered prepared attempt without conclusive acknowledgment → delivery_unknown
submitted + comparable later ready observation on the matched runtime
  → close attempt and release the active scheduling slot
  → do not label the task successful or invent a semantic reply
missing ordinary reply → remains missing; no automatic follow-up notice/prompt
exact-id reply → record message-specific reception evidence
  after retries, it cannot identify which copy ran or settle a newer unknown write
lost runtime continuity → recovery, never compare unrelated sequence numbers
```

**Owner actions preserve uncertainty rather than hiding it**

```text
Stop
  commit pause + new generation → cancel eligible queued work → interrupt
  retain in-flight evidence; incoming work is held; late old-generation checks drop
Resume
  reconcile first → schedule allowed work from now; no paused-tick catch-up
  unknown delivery still needs recovery; Resume does not reload profile config
Retry(message id, action key)
  wait until no write is still issued; retire old scheduling claim, keep history
  same message id + one new attempt; repeated action key adds no extra attempt
Cancel(message id)
  prevent future submission; clear active slot once no write is in flight
  keep old effects uncertain and late replies as history without another wake
```

**Observable recovery example and owner checkpoint**

```diff
 # Cancel m42 after an unknown delivery and after its write has finished:
 attempt 1: delivery_unknown             # retained historical evidence
-active message: m42
-future submission: held for recovery
+active message: none
+future submission: cancelled
 # Cancellation does not prove the native harness did nothing.
```

At handoff, exchange a real builder/reviewer question and explicit reply; repeat its request key, Stop/restart/Resume reviewer, and inspect a controlled lost-acknowledgment case with Retry versus Cancel. The thread, attempt history, `pending`, and both panes must agree. Use feedback to clarify queued/submitted/unknown before adding HTTP.

**Status:** planned. **Depends on:** [05](goal-05.md).

## Outcome

Two hub profiles exchange a message and its explicit answer through their native TUIs. One profile has one active attempt. A crash or ambiguous write is retained and shown, never automatically replayed. Stop persists a pause.

## Bounded work

- Implement one serialized dispatcher per profile, using shared admission and the profile launch/reconcile operation. Select replies, then owner sends, profile sends, triggers; use oldest numeric id within each class. Eligible ordinary selection excludes every previously attempted message.
- Apply current config/binding/approval, readiness, paused/unknown/launching, queue, and output-debounce checks through the existing adapter/cache. Keep the five-second debounce; document its draft limitation. Do not add ownership modes or another observation service.
- After validation, atomically set the active message and insert `prepared`, commit, then call prompt. Acknowledgment yields `submitted`; ambiguous outcome yields `delivery_unknown`. Store the payload hash, target/baseline, attempt number, and stable submission time. Follow [C4–C6](contracts.md#c4-attempt-selection-retry-and-cancellation).
- Close a submitted attempt only from a comparable later ready observation. Closing releases scheduling, not a semantic success certificate. Exact-id replies can establish reception; unrelated sends cannot. Changed/uncertain runtime continuity holds recovery.
- Implement owner `stop`, `resume`, `retry`, and the small `cancel` recovery action through shared commands. Retry uses the same message id and a new attempt; its request key prevents double-clicked or retried owner requests creating multiple attempts. Preserve old unknown history without letting it block forever after supersession/cancel.
- Stop commits pause/generation before interrupt, cancels only eligible queued work, and retains in-flight evidence. Resume reconciles first. Check completions from an older generation cannot enqueue. Unknown or dialog states never become automatic approval.
- Extend `pending` with held messages, unknown delivery, launch/recovery failures, and reasons. No UI is required to recover the local CLI slice.

## Out of scope

No exactly-once execution claim, text-presence retry heuristic, transcript reader, extra agent command, task table, general workflow engine, command sandbox, batching, retry daemon, or native terminal ownership lease. No automated response to a harness question.

## Done when

- [ ] Real builder sends to real reviewer; reviewer replies; builder receives one later prompt when ready. No automatic prompt returns to reviewer. A different second reply remains visible without another wake.
- [ ] A busy/blocked/unknown/paused profile receives no input. One waiting message is submitted after a valid ready/debounce observation, and is never selected again after close.
- [ ] Deterministic faults before preparation, after commit/before call, during write, and after remote acknowledgment/before local update exercise the documented queued/submitted/unknown outcomes. Crash/reopen never resubmits an uncertain attempt.
- [ ] An unrelated send cannot release unknown delivery; an exact-id reply can supply reception evidence without claiming which retry copy ran. A restored terminal's unrelated sequence cannot close the old baseline.
- [ ] Retry/cancel release the intended active slot, preserve attempt history, and cannot issue a second concurrent write. Cancelled work's late reply does not start a new wake.
- [ ] Stop survives both service and herdr restarts; Resume does not resurrect cancelled work or replay paused ticks. Installed interrupt keys do not quit an idle TUI or accept a dialog.
- [ ] Limits recheck at dispatch and survive restart; prepared/unknown trigger work reserves hourly capacity even after cancellation/supersession. Old closed messages neither remain eligible nor consume pending capacity merely because admission still says queued.
- [ ] The final hands-on checkpoint has been tried by the owner and revised for feedback before this goal is marked complete.

## Handoff

This is the first end-to-end CLI messaging slice. [07](goal-07.md) exposes it without a second implementation. Keep the fault-injection tools for [10](goal-10.md), rather than recreating failure tests at release.

## Try it and give feedback

**You get:** a running CLI-only fleet with disposable `builder` and `reviewer` sample profiles, plus the exact build/start/launch and owner allow-rule setup commands for the isolated namespace. Supply these commands with the implementation; the application does not exist yet.

1. Launch both samples. In builder's native TUI, ask it to run `drovr send @reviewer "Does the sample change need a test?" --request-id goal06-question`. Watch reviewer answer through `drovr reply` and builder receive the later prompt.
2. Repeat that request with the same key and payload. Read the thread with the supplied owner read command; verify the id and recipient delivery did not multiply.
3. From the owner shell, run `drovr stop reviewer`, send reviewer another message, and restart only the drovr service with the supplied command. Run `drovr pending`: reviewer must remain paused and the new message held.
4. Run `drovr resume reviewer`. Watch the held message arrive once, and verify no automatic conversation keeps going after its answer. Optionally use the existing controlled lost-acknowledgment exercise to try Retry versus Cancel; add no production fault endpoint.

**Expected:** both real panes, message ids, and the pending/thread output tell the same story. Stop survives restart; a retry is explicit; a reply does not create a reply loop.

**Feedback:** Is the difference between queued, submitted, and uncertain delivery clear enough to act on? Does Stop/Resume behave as you expected? Return the confusing output or failed step, then iterate on this CLI slice before moving on.
