# Profile lessons from Magnesium, Magnesium v2, Fuse, and dBrain

Reviewed the local source and plans on 2026-10-29. All four working trees were clean: Magnesium `bc17c394a0`, Magnesium v2 `a07f6ae13a`, Fuse `76c7dcf4`, and dBrain `7b27e02`. This is a source review, not a new runtime verification of those projects. Recommendations below inform the [drovr profile design](../plan/profiles.md); they add no implementation goal.

## What exists, and what is planned

| Repository | Implemented mechanisms | Planned or unverified boundary |
| --- | --- | --- |
| Magnesium | Editable profile folders, validation, whole-profile history, native harness homes, launch variants, fleet distribution, profile editing | Central provider-account delivery is a separate, not-started goal. The tracker marking profile goals verified is historical evidence, not a fresh test here. |
| Magnesium v2 | Profile scaffold/check commands, validation, Claude/Codex home generation, periodic sync, distribution | Its profile goal remains blocked on Brain indexing verification. The dedicated profile page and profile-learning workflow are still planned. |
| Fuse | Launcher recipes, source ownership, host-local additions, launch receipts, session presentation | Profiles are to be delegated to dBrain. Generating launchers from dBrain and proxying its service remain integration plans. |
| dBrain | Portable profile folders, template creation, native launch preparation, persistent harness state, REST/MCP runtime operations | Explicit Apply, profile editing through that API, and durable launch reservation are absent. Long-session continuation is designed rather than complete. Its recorded launch verification does not establish drovr's native-TUI/herdr compatibility. |

The useful source boundaries are Magnesium's [profile store](../../../magnesium/magnesium/server/src/profiles/ProfileStore.ts#L417), v2's [goal status](../../../magnesium-v2/docs/magnesium/goals/03-profiles-and-sandboxes.goal#L75), Fuse's [fork plan](../../../fuse/FORK.md#L41), and dBrain's [API](../../../dbrain/agents/cli/src/api.ts#L12) and [verification notes](../../../dbrain/agents/cli/README.md#L57).

## 1. Separate a reusable definition from a running agent

Magnesium and v2 treat a profile as reusable identity/content. A launch instance adds a harness and sandbox, producing names such as `mg-codex-fenced-research`. dBrain similarly gives a definition a default harness but permits a different harness at launch. None of this requires profile inheritance or a component registry. See Magnesium's [instance contract](../../../magnesium/magnesium/contracts/src/profiles.ts#L57), v2's [variant planning](../../../magnesium-v2/magnesium/server/src/profiles/homes.ts#L107), and dBrain's [profile schema](../../../dbrain/agents/cli/src/profile.ts#L45).

Drovr currently combines those concepts: `@reviewer` means one named profile, one chosen harness, and at most one live runtime. That is a reasonable MVP routing rule, but it is a product choice, not an inherent property of profiles.

**Recommendation:** retain the simple routing identity for MVP. If the owner wants the same role on several harnesses, distinguish reusable role content from separately addressed instances before changing the schema. Do not let two independent Claude/Codex conversations silently share one mailbox address. Copying instructions into another named profile is the current small substitute; reusable templates are not required now.

Fuse adds a related boundary: its planned Everything running view includes sessions it did not start, with profiles as labels; its Agents screen focuses on dBrain profiles. Seeing a pane does not establish ownership of it. Drovr should continue showing ordinary herdr panes while launching and messaging only managed profiles. [Fuse plan](../../../fuse/FORK.md#L55).

## 2. Keep one editable folder and a small creation path

All three profile implementations use a human-editable folder with `profile.yaml` and `AGENTS.md`, plus optional skills/MCP and other companion files. V2 creates the scaffold with `magnesium-agents new`; dBrain copies a template. Their formats are useful examples, not reasons for drovr to replace its small JSON manifest. [V2 scaffold](../../../magnesium-v2/magnesium/server/src/agents/cli.ts#L221), [dBrain creation](../../../dbrain/agents/cli/src/cli.ts#L100).

Magnesium's app edits those same files after validating a temporary candidate. It also records whole-folder history. That supports drovr's file-backed editor and validation, while its history/restore/delete machinery exceeds this MVP. Its sequential live writes and lack of an expected-base token should not be mistaken for transactional editing. [Candidate save](../../../magnesium/magnesium/server/src/profiles/ProfileStore.ts#L417).

**Recommendation:** keep Name + Harness creation, one definition folder, shared validators, and stale-edit rejection. Do not add a second profile body in SQLite. Treat a skill as its entire payload: scripts, executable bits, binary reference assets, and text. Magnesium's [bundle writer](../../../magnesium/magnesium/server/src/profiles/HubProfilePusher.ts#L95) explicitly retains executable metadata; copying only `SKILL.md` is insufficient.

## 3. Choose cwd, configuration home, session home, and credentials separately

This is the largest architectural lesson. Reusing a native login does not require sharing every native setting or session directory.

| Approach | Working directory and generated files | Native home/login behavior |
| --- | --- | --- |
| Magnesium / v2 | Generated per-profile, per-harness homes; launch variants select them | Claude/Codex homes are redirected; credential files link to the machine's normal login. Magnesium's OpenCode adapter instead overlays configuration while retaining ordinary auth. |
| dBrain | Claude starts in the actual project and receives generated instructions/MCP/settings through native flags | Claude keeps its hub home. Codex gets a persistent per-agent home, seeded with hub config and linked auth. |
| Drovr draft | A stable run cwd contains native project files and child worktrees | Normal hub auth, global config, and session storage remain in place. |

Evidence: Magnesium [homes and OpenCode overlay](../../../magnesium/magnesium/server/src/profiles/homes.ts#L148), [credential links](../../../magnesium/magnesium/server/src/profiles/homes.ts#L543), v2 [wrapper environment](../../../magnesium-v2/magnesium/deploy/bin/magnesium-wrapper#L24), and dBrain [Claude launch](../../../dbrain/agents/cli/src/harness.ts#L72) / [Codex preparation](../../../dbrain/agents/cli/src/harness.ts#L149).

dBrain's project-cwd approach is worth considering because project instructions remain naturally discoverable without placing the project below a synthetic cwd. It depends on native launch flags, though. Drovr must prove an equivalent path through herdr before adopting it; a direct CLI launcher is not evidence that `herdr agent start` accepts those arguments. The current run-cwd proposal also accommodates several workspaces and remains subject to goal 01's repository-guidance test.

**Recommendation:** keep the current mounting proposal as the MVP candidate, but make the four locations and inherited configuration explicit in the spike. Private native homes are an alternative, not an automatic consequence of profile creation. Credential links also remain shared authentication; they are not separate accounts.

## 4. Ambient configuration can defeat the intended profile

dBrain records a concrete failure: shared Claude `SessionStart` hooks loaded the machine's memory into profile sessions. Its proposed profile-aware hook fix is planned. It also disables native memory by default to avoid mixing profiles in the same project. [Recorded gap](../../../dbrain/gaps.md#L9), [native-memory setting](../../../dbrain/agents/cli/src/profile.ts#L58).

**Recommendation:** test two profiles with distinct instruction/tool sentinels using the existing hub login. Record inherited global instructions, hooks, skills, MCP, and relevant memory settings. Show generated output as drovr's contribution rather than an exhaustive effective configuration. If an inherited setting prevents the profile contract from working, settle the mounting decision before implementation. Do not quietly modify the owner's global configuration.

This evidence strengthens the existing distinction between profile configuration and security/account isolation. Drovr's project-level files do not promise either an empty global tool set or isolation from the owner's other sessions.

## 5. Preserve Save, Apply, and loaded context as separate facts

Magnesium and v2 periodically regenerate native homes; skill links point into editable definitions. A source edit can therefore affect files visible to an existing session without an explicit deployment boundary. [Magnesium sync](../../../magnesium/magnesium/server/src/profiles/ProfileSync.ts#L19), [skill links](../../../magnesium/magnesium/server/src/profiles/homes.ts#L524).

dBrain rebuilds its generated run directory on launch, including preparation for `--dry-run`. Its own gap report describes T3 and terminal launches sharing that directory, allowing one launch to rewrite files referenced by another running thread. [Preparation](../../../dbrain/agents/cli/src/harness.ts#L55), [dry-run path](../../../dbrain/agents/cli/src/cli.ts#L169), [shared-output collision](../../../dbrain/gaps.md#L45).

V2 provides another caution: the receiver writes the desired fleet revision even when an individual profile was refused and kept its last good files. The sender then skips an unchanged desired revision. That marker does not prove per-profile acceptance, native materialization, or loaded session context. [Sender comparison](../../../magnesium-v2/magnesium/server/src/profiles/HubProfilePusher.ts#L99), [receiver outcome](../../../magnesium-v2/magnesium/server/src/profiles/receive.ts#L114).

**Recommendation:** retain pure Preview, exited-only Apply, copied skills, one captured candidate, interrupted-apply recovery, and explicit fresh/resume semantics. Report saved definition, applied files, actual runtime harness, and fresh/resumed context separately. Do not add a revision-history service: a source Git label is provenance, and a current applied record is bookkeeping; neither is proof of model loading.

Capture also needs a defined concurrent-edit outcome. Coordinate drovr saves with Apply, and reject a candidate if its source inventory/content changes during capture. After a completed capture, commit those exact bytes; later saves remain pending.

## 6. Own narrow paths, and make failed translations visible

Magnesium preserves native-written Codex trust configuration around a managed MCP block. Fuse's hook installer modifies owned entries while preserving neighboring hooks and handling symlinks explicitly. These are useful examples of ownership below the level of an entire native home. [Managed TOML block](../../../magnesium/magnesium/server/src/profiles/homes.ts#L489), [Fuse hook installer](../../../fuse/cli/hooks.ts#L25).

V2's translator can warn that configuration was omitted, but its sync caller ignores warnings on an otherwise successful result. dBrain similarly has a specific collision policy: global Codex MCP names win over profile entries, with warnings. [V2 warnings](../../../magnesium-v2/magnesium/server/src/profiles/homes.ts#L402), [sync caller](../../../magnesium-v2/magnesium/server/src/profiles/ProfileSync.ts#L81), [dBrain Codex config](../../../dbrain/agents/cli/src/harness.ts#L149).

**Recommendation:** every required common field must render or fail with a path-specific explanation. Do not report successful Apply while dropping a requested server or permission. Keep whole-file replacement limited to drovr-owned generated project files; record any native mutation of those files in the compatibility spike. Do not import a generic merge system or begin overwriting native home settings. Overrides still copy last, visibly replacing the entire generated file.

## 7. Keep durable launch intent stronger than a name check

dBrain checks the current named agents, launches, then records the pane. Concurrent calls can race; status also uses the configured harness default even when launch accepted an override. Fuse's request receipts join in-flight starts and replay successful outcomes, but are not a full crash-recovery journal. [dBrain launch/status](../../../dbrain/agents/cli/src/agents.ts#L51), [Fuse receipts](../../../fuse/bridge/launch-receipts.ts#L7).

**Recommendation:** retain drovr's per-profile serialization, durable launching state, actual harness/cwd/session mapping, and conservative lost-response reconciliation. Definition existence, a default harness, and a successful request receipt are different facts from a uniquely identified live runtime.

## What changes in drovr's plan

Keep the ten goals. The comparison tightens their existing work rather than adding fleet delivery, accounts, history, learning, containers, or a second profile service:

- **Goal 01:** record cwd/config/session/auth boundaries, inherited global behavior, and native writes to generated files. Validate distinct profiles against actual native TUIs and herdr; none of these repos substitutes for that evidence.
- **Goal 03:** explicitly preserve skill bytes/executable bits, define source-link behavior, reject unstable captures, and surface translation failures. Preview remains pure.
- **Goal 04:** keep saved/applied/actual-runtime matching and the explicit fresh-session choice. Do not copy name-check launch idempotency or automatic hot-sync.

The two product alternatives remain visible for feedback: reusable role content across separately addressed harness instances, and private native config/session homes linked to existing login. They are not silently added to MVP.

## Validate and iterate

At goal 01, try two sentinel profiles under the hub login and inspect the real inherited behavior, project guidance, tools, and first-launch interactions. At goal 03, inspect the generated trees; change an instruction, executable skill helper, and binary reference; verify Preview writes nothing, running files stay unchanged, and an invalid/unstable candidate preserves the last applied bundle. At goal 04, end the native TUI, apply/fresh-launch, and ask which sentinel and tools actually loaded.

The feedback questions are: Is one addressed instance per harness the identity you want? Does inherited global configuration make profiles too loose? Is the stable run cwd comfortable for real project work? Is the explicit update workflow understandable? Resolve those through the existing goal checkpoints before adding a reusable-persona or native-home feature.
