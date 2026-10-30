# 10 — Prove and document the MVP

**Status:** planned. **Depends on:** [09](goal-09.md).

## Outcome

A clean checkout produces one deployable hub service/PWA build with concise operating instructions and recorded proof of every final-plan MVP capability. This goal closes the existing acceptance checks; it is not a miscellaneous feature or refactor bucket.

## Bounded work

- Document one supported hub setup: pinned versions from the spike, build/start command, config/state paths, private HTTPS front, owner pairing/revocation, profile files, and the two agent tools. Provide a service-manager command example, not an installer generator.
- Document first-launch trust, environment provisioning, applied-vs-edited config, native permission limits, and the known quiet-composer/fingerprint/resume limitations. Stop pauses a still-running TUI, Resume does not apply files, and Launch returns an existing runtime. Document ending the harness through native herdr before launch/materialization, with a fresh session if the spike requires one. Add no restart API. A shared OS account remains trusted; the allow list is not a sandbox.
- Document Stop/Resume, Retry versus Cancel, herdr-down/recovery, invalid/missing profiles, lost launch response, and unknown delivery. Make clear that retry can repeat external work and cancel does not undo it.
- Add a consistent SQLite backup operation/instruction and a disposable restore rehearsal including profile/config/applied files. On restored state, reconcile and hold uncertain attempts before enabling dispatch. Do not archive credentials or pretend backups make prompt execution exactly once.
- Run existing check/test/build commands and one packaged-build smoke. Run the real end-to-end release rehearsal on the supported three harness versions in the isolated namespace, reusing earlier tools. Retest changed integration cases rather than re-running unrelated expensive experiments.
- Write `docs/mvp-validation.md` with versions, commands, dates, pass/fail evidence, and a coverage table matching the final plan's stages 0–3 to these goals. Keep unresolved failures visible. Update the root README with actual run instructions and links to this plan and validation.

## Out of scope

No remote rollout, cross-platform expansion, model token benchmark project, cloud hosting, containers per profile, GUI installer, auto-update, metrics backend, upstream feature comparison, or speculative optimization. Do not add features to justify the last milestone. Fix only failures of the stated contract; anything else goes beyond MVP.

## Done when

- [ ] A clean checkout can `npm ci`, check, test, build, and run the packaged service/PWA with the documented paths. A second instance cannot take the state directory.
- [ ] Each of Claude Code, Codex, and OpenCode 2 launches a real profile with instructions/skill/MCP, retained login, workspace edit, and observed native trust/approval handling. Failing any required harness gate leaves MVP incomplete.
- [ ] The packaged system demonstrates send/reply, profile-only targets, idempotency/conflict, later replies without a second wake, lineage/budget enforcement, and off-list once/always/refuse/revocation.
- [ ] Crash/acknowledgment loss and cold restore preserve the journal. Unknown writes are not replayed; Stop remains paused; Retry and Cancel preserve history and release scheduling correctly.
- [ ] A paired phone-width and desktop-width browser can use all five views, raw file editing, target selection, dialog validation, screen/terminal observation, and owner recovery. Revocation, offline controls, and herdr-down behavior pass.
- [ ] Schedule plus git/paths/command checks, baseline/coalescing/floors, pause/missed ticks, quiet/choices, no-reply reporting, and a daily brief pass through the same normal message path.
- [ ] Backup/restore works on disposable state; no recovery silently starts a second profile or replays uncertain model work.
- [ ] `docs/mvp-validation.md` names evidence for every acceptance item in [final stages](../plan-final.md#stages) and every clarification in [contracts.md](contracts.md). There are no required unchecked gates or invented passes.
- [ ] The final hands-on checkpoint has been tried by the owner and revised for feedback before this goal is marked complete.

## Handoff

Mark these ten goals complete only with their evidence. Leave the [hard cuts](README.md#hard-cuts) out of the shipped scope. A follow-on feature gets a separate decision after MVP; it must not become an eleventh hidden goal here.

## Try it and give feedback

**You get:** a built release you can run from a clean checkout, the real private URL, sample profiles, operating/backup instructions, and `docs/mvp-validation.md`. Deliver exact commands and paths, not a claim that the developer's running workspace is the release.

1. Follow the clean-checkout instructions yourself, start the packaged service against disposable state, pair a browser, and launch a sample profile without relying on undocumented setup.
2. Give builder one small real edit in the disposable worktree and ask it to send reviewer a review request. Use the PWA to follow the work, answer any native question, inspect the review, and decide whether the result is useful.
3. Stop the profile, restart the service, and verify pause plus thread history survived. Resume deliberately and complete a normal message without replaying old work.
4. Follow the backup instructions, restore into a separate disposable state directory/namespace, and verify config/history and conservative recovery before enabling dispatch. Do not overwrite your working fleet to try this.

**Expected:** the documented build is usable outside the implementer's session, one real task completes through the native fleet, and recovery requires no database editing or guesswork. The validation record covers all three supported harnesses even if this hands-on task uses one pair.

**Feedback:** Would you use this for your normal hub workflow? Which failure, missing instruction, or awkward action prevents that? Return those concrete findings and iterate on the existing MVP before calling the release complete.
