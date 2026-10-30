# 03 — Profile files and materialization

Status: planned.

Depends on [01 — Spike](goal-01.md) and [02 — Service](goal-02.md).

## Outcome

A valid profile folder produces the native files for one tested harness in a stable run directory. Repeating materialization preserves the owner's worktrees and produces the same managed files. This goal prepares files; [04](goal-04.md) launches the agent.

Build from the final plan's [Files](../plan-final.md#files), [Workspaces](../plan-final.md#workspaces), and [Materialization](../plan-final.md#materialization), using the shared [contracts](contracts.md).

## Bounded work

- Validate the fixed manifest: profile name, one of three harnesses, `ask` or `workspace`, environment names, and the two documented workspace shapes. Validate optional MCP, skills, overrides, and trigger files. A bad profile has its own error; it does not invalidate the other profiles.
- Write three fixed native adapters for the versions recorded by the spike. Each writes instructions, MCP, skills, the same bundled drovr skill, permission settings, and extra-directory settings. Keep adapters as ordinary functions; use no discovery or registration system.
- Append the workspace instruction pointers described by the final plan. Record the native limits proved by the spike; permission labels do not imply identical command behavior in every harness.
- Create or reuse Git worktrees under `runs/<name>/`. Reuse only a path whose repository and branch match. Resolve a known local default-branch ref before creating a missing branch; if that cannot be established, fail with the action the owner must take. Do not fetch or guess the current feature branch.
- Preserve every file inside the worktree. A checked-out branch elsewhere, unexpected existing directory, or mismatched worktree is an error. No reset, clean, force, branch switch, worktree deletion, or branch deletion.
- Materialize only while the profile is stopped. Use temporary files and replacements for managed files, with a fixed list of files owned by each adapter. Never replace the run-directory tree containing workspaces. A failed partial update blocks launch until materialization succeeds.
- Copy the selected raw native overrides last, as the final plan requires. Reject paths outside the managed run root. Check the resulting supported native config for parse errors; do not add a generic config merge language.
- Keep a plain applied copy of `triggers.json` in the managed run directory. Edits in `~/.config/drovr` do not change a running profile's files or checks. Apply them at the next explicit restart/launch.
- Keep secrets as environment names. Do not expand secret values into config, logs, or command arguments. Display the configuration Git commit or newest file modification time; add no version counter or revision store.
- Provide one development-only materialize-fixture script calling this real materializer, with a documented npm invocation. It creates disposable config/state/workspace inputs and prints generated paths and changes. Do not add a new public agent command or a parallel rendering path just for the demonstration.

## Scope cuts

No profile designer, schema-generated forms, profile import/export, rename workflow, revision digests, immutable snapshots, plugin API, permission DSL, hook system, or remote files. Raw overrides stay raw. No live reload that rewrites a running profile's instructions.

## Done when

- [ ] Fixture profiles for Claude Code, Codex, and the selected OpenCode 2 version produce their expected native paths, one instruction document, one MCP server, and the bundled skill.
- [ ] Invalid names, malformed supported config, out-of-root paths, and bad overrides report the affected profile and leave another valid profile usable. Errors never print an environment value.
- [ ] Two consecutive materializations produce equivalent managed files. Removing a managed skill from config removes its old managed copy without touching workspace files or unrelated owner files.
- [ ] A disposable Git test proves creation from a known local default ref, reuse of the same worktree, refusal of a conflicting branch/path, and preservation of dirty tracked and untracked work.
- [ ] A non-Git extra directory is written to the tested native configuration for each adapter. The spike's discovery and permission evidence is linked rather than assumed.
- [ ] Changing config, instructions, or triggers while a profile is running leaves its applied files unchanged. A stopped-profile apply updates all applicable managed files, including the trigger copy.
- [ ] An interrupted materialization cannot be mistaken for a completed deployment or launchable profile.
- [ ] The final hands-on checkpoint has been tried by the owner and revised for feedback before this goal is marked complete.

Use focused file and disposable-repository tests. Actual harness discovery is already a spike gate and is exercised through launch in the next goal; do not build a second compatibility harness here.

## Handoff

[04](goal-04.md) gets one profile loader, one materialization path, and explicit errors. The later Profiles UI calls the same validator when saving raw files; the trigger engine reads the applied trigger copy. Keep file validation and rendering in this module instead of recreating them in HTTP or the scheduler.

## Try it and give feedback

**You get:** the materialize-fixture command, editable sample profiles, and actual native files in disposable run directories. Supply the exact invocation and printed paths; launching a harness is not required at this checkpoint.

1. Run the fixture command for the three supported harnesses and inspect their generated instructions, MCP configuration, and bundled skill.
2. Change a sample instruction and add a sample skill; rerun and inspect the resulting file changes.
3. Put tracked and untracked edits in the disposable worktree, rerun materialization, and confirm those edits remain.
4. Introduce a malformed override or a conflicting workspace path and inspect the profile-specific validation error; restore the input and rerun.

**Expected:** understandable profile inputs and predictable native output, with visible updates/errors and preserved code. No launcher or later PWA is needed to inspect and iterate on it.

**Feedback:** Are these files comfortable to edit and are the generated instructions what you intended? Which validation message or native override is confusing? Pause for feedback and adjust the materializer or sample files before continuing.
