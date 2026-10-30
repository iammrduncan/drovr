# 01 — Prove the native integration

**Status:** planned. **Depends on:** none.

## Outcome

`docs/spike.md` records enough real evidence to implement the final plan on one hub OS and one installed version of each of Claude Code, Codex, OpenCode 2, and herdr. The experiment uses an isolated herdr namespace and disposable worktrees. It does not touch the owner's active fleet.

## Bounded work

- Run [final stage 0](../plan-final.md#stage-0-spike), excluding its explicitly optional remote-machine check. Capture versions, OS, commands, redacted observations, and pass/fail per case. No cross-platform or historical-version matrix.
- Use a tiny `drovr reply` stub that writes ids/results to a file. Test ten messages per harness, a duplicate call, an omitted reply, and a quiet-only reply. This is disposable compatibility work, not a second service implementation.
- Record fresh launch/trust/MCP dialogs, instruction and repository-guidance sentinels, skill/MCP discovery, native permission behavior, worktree/extra-directory access, and actual launch-environment presence. Verify edits and Git metadata operations separately; do not promise identical native policies.
- Exercise `/clear` or `/new`, pane move, detach, cold restore, missing/invalid resume, readiness, interrupt keys in working/idle/draft/dialog states, and lost launch responses. Native resume is herdr's job.
- Measure prompt submission into a nonempty composer and an interrupted acknowledgment. Record the limitation instead of writing a draft-clearing workaround. Verify which event/polling primitive can actually observe output activity and runtime continuity.
- Record whether profile edits are reloaded on resume. If not, document the fresh-session requirement and the owner action needed; do not claim restart updates model instructions by itself.
- Confirm [shared contracts](contracts.md), including the quiet exception, terminal reply rule, and recovery semantics. Record exact blockers and the smallest correction, rather than continuing into a fallback parser or new protocol.
- Retain one small replayable spike script and its example inputs for the owner checkpoint. It drives the real experiments and prints the pane/report paths; it is not a production demo framework.

## Out of scope

Service scaffolding, production profile APIs, PWA work, remote machines, token benchmarks, broad upstream research, transcript parsing, and adding a new harness. Timebox exploration to the listed matrix; an unresolved integration failure is a recorded blocker, not a reason to expand the spike indefinitely.

## Done when

- [ ] Each of the three harness columns has observations for the required matrix; no blank cell is called a pass.
- [ ] Profile and repository instructions, one skill, one MCP server, existing login, and both workspace types work on the stated layout, or the exact failing gate is recorded and resolved before dependent implementation.
- [ ] Supported readiness/output observations, interrupt/dialog sequences, and cold-restore matching are written down for the installed versions.
- [ ] The lost-acknowledgment case demonstrates why an automatic resend is forbidden, including when prompt text disappears from the visible screen.
- [ ] The service/herdr environment assumption and resumed-instruction behavior have evidence, not inference from sharing a username.
- [ ] No missing explicit reply is replaced with transcript extraction. A harness that cannot reliably follow the two-tool skill remains a release blocker.
- [ ] The final hands-on checkpoint has been tried by the owner and revised for feedback before this goal is marked complete.

## Handoff

Pass the concrete native templates/capabilities to [02](goal-02.md), [03](goal-03.md), and [04](goal-04.md). Production work begins only after the needed gates are resolved. Record results, not a claim that the whole application already works.

## Try it and give feedback

**You get:** the replayable spike script, disposable profile inputs, real native panes, and `docs/spike.md`. Deliver its exact invocation with the isolated namespace and harness version; the owner should not have to reconstruct commands from research notes.

1. Run the supplied spike command for one harness and open the pane it prints.
2. Ask the agent to identify the instruction sentinel, skill, and MCP server, then make the sample workspace edit.
3. Change the sentinel in the sample instructions and repeat with the documented fresh/resumed-session procedure. Observe whether the new value loads.
4. Try the recorded interrupt key and inspect the report's expected-versus-observed result. Repeat the relevant check on the other supported harnesses.

**Expected:** inspectable native behavior and a reproducible pass/failure, with no change to the owner's active fleet. A failing compatibility gate stays visible; a report does not turn it into a pass.

**Feedback:** Are the trust, interruption, and instruction-update behaviors acceptable for the way you use agents? Which setup step or observed limitation needs changing? Pause for feedback and repeat the affected experiment before moving on.
