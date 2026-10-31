# 10 — Prove and document the MVP

**Show me — planned slice**

This goal makes the existing MVP reproducible and proves its contracts. The views below describe the release rehearsal; they are not recorded passes or additional product features.

**What the owner receives.** The packaged build, editable samples, operating instructions, and acceptance evidence must stand on their own outside the implementer's workspace.

```text
Release handoff
├── Packaged hub service + static PWA     one supported build
├── Sample profile definitions           isolated config/state/workspace paths
├── README.md                            exact install/build/run + private URL setup
├── Operating instructions               trust, env, Stop/Resume, Retry/Cancel
├── Backup/restore instructions           consistent SQLite + profile/applied files
│   └── Native credentials excluded       retain the harness's normal login
└── docs/mvp-validation.md                versions, dates, commands, pass/fail evidence
    └── Coverage map                     final stages 0–3 + shared contracts
```

**What runs in the release rehearsal.** This is a call-tree sketch of verification responsibilities, not a new release framework or public command.

```text
release rehearsal
  clean checkout → npm ci → check → test → build
  start packaged service against disposable state
    pair browser; inspect phone/desktop/offline behavior
    launch real profiles on all three pinned harness versions
    reuse earlier message, approval, trigger, and failure exercises
  quiesce definition/applied-file and database writers; capture one coherent backup
  restore into a separate disposable namespace
    reconcile actual runtimes before dispatch
    retain pause and hold uncertain attempts
  record evidence and unresolved failures
  owner follows instructions and gives feedback
    fix contract/usability failures → rerun affected exercise
```

**One real task crosses the whole system.** Agent tools return after admission; later native prompts carry the work and reply. The PWA reads the durable thread.

```mermaid
sequenceDiagram
  participant Owner
  participant Hub as Drovr / PWA
  participant Builder as Builder native TUI
  participant Reviewer as Reviewer native TUI
  Owner->>Hub: Send builder a small worktree edit
  Hub->>Builder: Dispatch ordinary message when ready
  Builder->>Hub: send reviewer a review request
  Hub-->>Builder: Durable message id; return immediately
  Hub->>Reviewer: Dispatch review request when ready
  Reviewer->>Hub: reply with review
  Hub->>Builder: Deliver first eligible reply later
  Builder->>Hub: reply to owner's task
  Owner->>Hub: Inspect worktree, thread, and result
```

**What restore must preserve.** This is an expected state example, not a claim of exactly-once model execution. The restored process reconciles before enabling dispatch.

```text
Before backup                     After disposable restore
profile paused = true             paused remains true
message and attempt history       same durable history
latest attempt = delivery_unknown still held; no automatic prompt replay
native runtime mapping            validate against herdr; ambiguity → recovery
saved + applied profile files     corresponding backup files; pending edits stay pending
owner chooses Retry or Cancel     explicit decision; history remains
```

**When the release can be called complete.** One failing harness or missing owner checkpoint keeps the MVP incomplete.

```text
on release review
  if required gate failed or evidence missing
    keep MVP incomplete; record concrete failure
  if owner cannot reproduce setup or complete the real task
    fix instructions/behavior; repeat the affected checkpoint
  if all gates pass and owner feedback is addressed
    mark the ten goals complete with their evidence
  leave unrelated features outside this release
```

**Status:** planned. **Depends on:** [09](goal-09.md).

## Outcome

A clean checkout produces one deployable hub service/PWA build with concise operating instructions and recorded proof of every final-plan MVP capability. This goal closes the existing acceptance checks; it is not a miscellaneous feature or refactor bucket.

## Bounded work

- Document one supported hub setup: pinned versions from the spike, build/start command, config/state paths, private HTTPS front, owner pairing/revocation, profile files, and the two agent tools. Provide a service-manager command example, not an installer generator.
- Document first-launch trust, environment provisioning, applied-vs-edited config, native permission limits, and the known quiet-composer/fingerprint/resume limitations. Stop pauses a still-running TUI, Resume does not apply files, and Launch returns an existing runtime. Document ending the harness through native herdr before launch/materialization, with a fresh session if the spike requires one. Add no restart API. A shared OS account remains trusted; the allow list is not a sandbox.
- Document Stop/Resume, Retry versus Cancel, herdr-down/recovery, invalid/missing profiles, lost launch response, and unknown delivery. Make clear that retry can repeat external work and cancel does not undo it.
- Document a quiesced backup boundary covering direct profile edits, Save/Apply/lifecycle writes, and the database before capturing corresponding profile/config/applied files plus consistent SQLite state. A cold operating recipe is sufficient: stop drovr, keep profile editing and managed-file writers quiescent, and handle SQLite/WAL consistently; end managed native TUIs if needed to stop their writes. Automation pause alone is not a write freeze. Restore into disposable state, reconcile, and hold uncertain attempts before enabling dispatch. Do not add a backup service, archive credentials, or claim exactly-once prompt execution.
- Run existing check/test/build commands and one packaged-build smoke. Run the real end-to-end release rehearsal on the supported three harness versions in the isolated namespace, reusing earlier tools. Retest changed integration cases rather than re-running unrelated expensive experiments.
- Write `docs/mvp-validation.md` with versions, commands, dates, pass/fail evidence, and a coverage table matching the final plan's stages 0–3 to these goals. Keep unresolved failures visible. Update the root README with actual run instructions and links to this plan and validation.

## Out of scope

No remote rollout, cross-platform expansion, model token benchmark project, cloud hosting, containers per profile, GUI installer, auto-update, metrics backend, upstream feature comparison, or speculative optimization. Do not add features to justify the last milestone. Fix only failures of the stated contract; anything else goes beyond MVP.

## Done when

- [ ] A clean checkout can `npm ci`, check, test, build, and run the packaged service/PWA with the documented paths. A second instance cannot take the state directory.
- [ ] Each of Claude Code, Codex, and OpenCode 2 launches a real profile with instructions/skill/MCP, retained login, workspace edit, and observed native trust/approval handling. Failing any required harness gate leaves MVP incomplete.
- [ ] The packaged system demonstrates send/reply, profile-only targets, idempotency/conflict, later replies without a second wake, lineage/budget enforcement, and off-list once/always/refuse/revocation.
- [ ] Crash/acknowledgment loss and cold restore preserve the journal. Unknown writes are not replayed; Stop remains paused; Retry and Cancel preserve history and release scheduling correctly.
- [ ] A paired phone-width and desktop-width browser can use all five views, raw file editing, target selection, dialog validation, screen/terminal observation, and owner recovery. The goal 08 keyboard/label/focus checks, revocation, offline controls, and herdr-down behavior pass.
- [ ] Schedule plus git/paths/command checks, baseline/coalescing/floors, pause/missed ticks, quiet/choices, no-reply reporting, and a daily brief pass through the same normal message path.
- [ ] Backup/restore captures coherent database and profile/applied files on disposable state. Rehearse a saved-but-unapplied edit plus an unknown attempt: both survive with the applied bundle and fresh/resume intent consistent. No recovery silently starts a second profile or replays uncertain model work.
- [ ] `docs/mvp-validation.md` names evidence for every acceptance item in [final stages](../research/plan-final.md#stages) and every clarification in [contracts.md](contracts.md). There are no required unchecked gates or invented passes.
- [ ] The final hands-on checkpoint has been tried by the owner and revised for feedback before this goal is marked complete.

## Handoff

Mark these ten goals complete only with their evidence. Leave the [hard cuts](README.md#hard-cuts) out of the shipped scope. A follow-on feature gets a separate decision after MVP; it must not become an eleventh hidden goal here.

## Try it and give feedback

**You get:** a built release you can run from a clean checkout, the real private URL, sample profiles, operating/backup instructions, and `docs/mvp-validation.md`. Deliver exact commands and paths, not a claim that the developer's running workspace is the release.

1. Follow the clean-checkout instructions yourself, start the packaged service against disposable state, pair a browser, and launch a sample profile without relying on undocumented setup.
2. Give builder one small real edit in the disposable worktree and ask it to send reviewer a review request. Use the PWA to follow the work, answer any native question, inspect the review, and decide whether the result is useful.
3. Stop the profile, restart the service, and verify pause plus thread history survived. Resume deliberately and complete a normal message without replaying old work.
4. Leave a saved-but-unapplied sample edit, then follow the quiesced backup recipe and restore into a separate disposable state directory/namespace. Verify the saved/applied distinction, config/history, and conservative recovery before enabling dispatch; the supplied controlled uncertainty case must remain held. Do not overwrite your working fleet to try this.

**Expected:** the documented build is usable outside the implementer's session, one real task completes through the native fleet, and recovery requires no database editing or guesswork. The validation record covers all three supported harnesses even if this hands-on task uses one pair.

**Feedback:** Would you use this for your normal hub workflow? Which failure, missing instruction, or awkward action prevents that? Return those concrete findings and iterate on the existing MVP before calling the release complete.
