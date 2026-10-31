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

**Status:** in progress; native compatibility gates and owner checkpoint remain incomplete. **Depends on:** none.

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

- [x] Each of the three harness columns has observations for the required matrix; no blank cell is called a pass.
- [x] Profile and repository instructions, one skill, one MCP server, existing login, and both workspace types work on the stated layout, or the exact failing gate is recorded and resolved before dependent implementation.
- [x] Supported readiness/output observations, interrupt/dialog sequences, and cold-restore matching are written down for the installed versions.
- [x] The lost-acknowledgment case demonstrates why an automatic resend is forbidden, including when prompt text disappears from the visible screen.
- [x] The service/herdr environment assumption and resumed-instruction behavior have evidence, not inference from sharing a username.
- [x] Two distinct profiles have recorded instruction/tool sentinels, native home locations, inherited global behavior, and any native mutations of generated files. The report distinguishes shared login from configuration isolation.
- [x] No missing explicit reply is replaced with transcript extraction. A harness that cannot reliably follow the two-tool skill remains a release blocker.
- [ ] The required shared-contract compatibility blockers are settled before dependent implementation. The observed Codex Unix-socket permission failure currently leaves C1's planned CLI transport unproved; its proposed native command exception needs an owner decision and a passing real check.
- [ ] The final hands-on checkpoint has been tried by the owner and revised for feedback before this goal is marked complete.

## Handoff

Pass the concrete native templates/capabilities to [02](goal-02.md), [03](goal-03.md), and [04](goal-04.md). Production work begins only after the needed gates are resolved. Record results, not a claim that the whole application already works.

## Evidence and feedback — 30 October 2026

- [Installed-version report](../spike.md) records herdr 0.9.3, Claude Code 2.1.314, Codex 0.166.0, OpenCode 2.2.2, the OS, per-case observations, and remaining gates. [The replay driver and instructions](../../tools/spike/README.md) retain editable inputs, a tiny reply recorder, a stdio MCP sentinel, disposable worktrees, and explicit lost-acknowledgment experiments.
- Real native turns discovered instructions/skill/MCP and edited both workspace types. Calibrated reply checks, duplicates, omissions, quiet-only replies, terminal replies, draft collisions, interrupts, and native resets ran with harness-specific limits recorded. A discarded OpenCode prompt acknowledgment still produced an actual reply; after `/new` the prompt was absent from the screen. No automatic resend or transcript substitution was used.
- **Final calibrated native cases:** all three A profiles cold-restored their name, public pane, cwd, and native session id on the recorded setup. Codex uses a namespace-local native launcher/controlled Bash startup to preserve `--no-daemon`; actual post-cold tool attribution matched the intended pane/socket. All three manual-resume and fresh instruction-edit comparisons loaded the edited profile sentinel. Final B runs recorded all ten reply ids per harness, with OpenCode's extra call preserved rather than hidden. Native metadata, generated-file mutations, missing/invalid resume, client disconnection, and interrupt differences are in the report.
- **Remaining transport gate:** default Codex command-sandbox AF_UNIX access fails with `PermissionError`/errno 1. A documented narrow Unix-socket profile also failed in the actual installed TUI and was rolled back. The file-backed stub does not prove the planned socket CLI. A proposed, unapplied [read-only probe exception](../../tools/spike/examples/codex-socket-probe.rules) is prepared for an explicit owner policy decision; no general sandbox bypass or new transport was introduced.
- **Safety findings:** native readiness can remain idle behind overlays; C5 now explicitly requires the bounded dialog check before prompts. OpenCode can create a missing native id, so matching an id does not prove continued history. The unsafe shared-daemon test also overwrote the owner's saved pane session metadata; its correct current thread was verified through native metadata and restored through the installed hook, without stopping the process or modifying history. The repaired incident remains in the report; the intended fleet-isolation boundary was violated in that initial case.
- **Owner responses received:** approval for A/B Claude/Codex fixture trust and the sentinel MCP servers, OpenCode's one Git-status command, and all three native integration installs preserving existing settings. These ran. A sandbox-exception decision and actual hands-on trust/interruption/update feedback remain pending. Experiment permissions are not completed acceptance.

## Try it and give feedback

**You get:** the replayable spike script, disposable profile inputs, real native panes, and `docs/spike.md`. Deliver its exact invocation with the isolated namespace and harness version; the owner should not have to reconstruct commands from research notes.

The retained owner checkpoint uses OpenCode **2.2.2**, herdr **0.9.3**, namespace **`drovr-g01-3dcbd595c8`**, and config/worktrees/evidence at **`/tmp/drovr-g01-owner`**. From the repository root:

```bash
SPIKE_ROOT=/tmp/drovr-g01-owner
spike() { python3 tools/spike/spike.py --root "$SPIKE_ROOT" "$@"; }
spike observe
spike herdr agent read opencode-a --source visible --lines 40
spike herdr agent prompt opencode-a 'operation=send id=owner-check-1 from=owner. Use the drovr skill. Identify your profile and skill sentinels. Call the spike_sentinel MCP tool. Read api/AGENTS.md, report its sentinel, append "owner sample edit" to api/sample.txt, then run drovr reply owner-check-1 with those synthetic results.'
# Inspect after the native turn settles; a missing row is not a reply.
spike herdr agent get opencode-a
cat "$SPIKE_ROOT/runs/opencode-a/results.jsonl"
```

To open that real pane in a separate terminal:

```bash
env -u HERDR_SOCKET_PATH -u HERDR_PANE_ID -u HERDR_TAB_ID -u HERDR_WORKSPACE_ID herdr --session drovr-g01-3dcbd595c8
```

Expected: the native pane begins ready, displays OpenCode 2.2.2, and has one MCP server. The requested observations are `PROFILE_SENTINEL=opencode-a`, `SKILL_SENTINEL=opencode-a`, `MCP_SENTINEL=opencode-a`, repository sentinel `api-A`, the sample edit, and an actual recorder row. Compare the observations with [the report](../spike.md), including the earlier B-profile omitted reply. These are expected results to inspect, not a claim that this owner command has run.

Use a new id for an intentional changed-input repeat. If the call times out, inspect the pane and results without automatically repeating it. [The replay instructions](../../tools/spike/README.md) cover new isolated roots, the other harnesses, native exit before instruction edits, and explicit fresh/resume steps. The main evidence and six live A/B profiles remain at `/tmp/drovr-g01-live`; the A profiles have completed the calibrated cold-resume exercise, and later pane moves are recorded. Use the live agent list rather than old printed pane ids. Do not repeat initial Launch requests.

1. Run the supplied spike command for one harness and open the pane it prints.
2. Ask the agent to identify the instruction sentinel, skill, and MCP server, then make the sample workspace edit.
3. Change the sentinel in the sample instructions and repeat with the documented fresh/resumed-session procedure. Observe whether the new value loads.
4. Try the recorded interrupt key and inspect the report's expected-versus-observed result. Repeat the relevant check on the other supported harnesses.

**Expected:** inspectable native behavior and a reproducible pass/failure, with no change to the owner's active fleet. A failing compatibility gate stays visible; a report does not turn it into a pass.

**Feedback:** Are the trust, interruption, and instruction-update behaviors acceptable for the way you use agents? Which setup step or observed limitation needs changing? Pause for feedback and repeat the affected experiment before moving on.
