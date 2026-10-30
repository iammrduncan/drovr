# 01 — Prove the native integration

**Show me — planned slice**

**What the spike hands over.**

```text
Replayable native experiment
├── supplied script + editable sample profile inputs
├── isolated herdr namespace + disposable worktrees
├── real Claude Code, Codex, and OpenCode 2 panes
└── docs/spike.md
    └── exact versions, commands, observations, limits, blockers
```

**One experiment, from setup to evidence.**

```mermaid
sequenceDiagram
    participant Owner
    participant Spike as Replayable spike script
    participant Herdr as Isolated herdr
    participant TUI as Selected native harness
    Owner->>Spike: Run the delivered experiment recipe
    Spike->>Spike: Prepare disposable workspace
    Spike->>Herdr: Create isolated native pane
    Herdr->>TUI: Start with existing hub login
    Spike->>Herdr: Exercise discovery, prompting, interrupt, and restore
    Herdr-->>Spike: Observed state, bounded screen, and session evidence
    Spike-->>Owner: Pane path + report with expected versus observed
    Owner-->>Spike: Feedback; repeat the affected experiment
```

**The compatibility gate is evidence, not an assumption.**

```text
for each of Claude Code, Codex, OpenCode 2
  verify profile/repository instructions, skill, MCP, and workspace access
  try ten reply-stub messages, duplicate, omitted, and quiet-only replies
  record readiness, environment, dialogs, interrupt, reset, and cold restore
  compare fresh launch with native resume after instruction edits
  if a required case fails or has no observation
    record the exact blocker; stop dependent implementation
  never infer reply text from a transcript or automatically resend ambiguity
```

**A small input change exposes stale loaded context.**

```diff
 # Disposable profile instruction sentinel
-Report PROFILE_SENTINEL=reviewer-A when asked.
+Report PROFILE_SENTINEL=reviewer-B when asked.
```

```text
Fresh launch → observe which sentinel actually loads.
Native resume → record A, B, or failure; do not assume the edit reloaded.
Two profiles → compare intended sentinels and inherited global behavior.
```

**What you can validate before goal 02.**

```text
Run supplied recipe → open the printed native pane
Ask for sentinel + skill + MCP → make the sample workspace edit
Change sentinel → repeat fresh/resumed launch
Try recorded interrupt key → compare the report with what you saw
Give feedback on setup, trust, interruption, and update behavior
Repeat affected case → retain the report and inspectable sample state
```

**Status:** planned. **Depends on:** none.

## Outcome

`docs/spike.md` records enough real evidence to implement the final plan on one hub OS and one installed version of each of Claude Code, Codex, OpenCode 2, and herdr. The experiment uses an isolated herdr namespace and disposable worktrees. It does not touch the owner's active fleet.

## Bounded work

- Run [final stage 0](../research/plan-final.md#stage-0-spike), excluding its explicitly optional remote-machine check. Capture versions, OS, commands, redacted observations, and pass/fail per case. No cross-platform or historical-version matrix.
- Use a tiny `drovr reply` stub that writes ids/results to a file. Test ten messages per harness, a duplicate call, an omitted reply, and a quiet-only reply. This is disposable compatibility work, not a second service implementation.
- Record fresh launch/trust/MCP dialogs, instruction and repository-guidance sentinels, skill/MCP discovery, native permission behavior, worktree/extra-directory access, and actual launch-environment presence. Verify edits and Git metadata operations separately; do not promise identical native policies.
- Record cwd, native config/session homes, credential source, inherited global hooks/memory/settings, and any native writes to generated config. Try two distinct profile sentinels under the existing login. Shared authentication does not prove configuration isolation; do not change global settings to make the check pass.
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
- [ ] Two distinct profiles have recorded instruction/tool sentinels, native home locations, inherited global behavior, and any native mutations of generated files. The report distinguishes shared login from configuration isolation.
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
