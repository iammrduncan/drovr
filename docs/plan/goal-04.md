# 04 — Launch and recover one runtime per profile

Status: planned.

Depends on [02 — Service](goal-02.md) and [03 — Profile files](goal-03.md).

## Outcome

The owner can launch a configured profile once, see its current state or actionable error, and recover its mapping after drovr or herdr restarts. Existing harness authentication stays in place.

Build from [Materialization and launch](../plan-final.md#materialization) and the [shared contracts](contracts.md). Delivery, Stop, Resume, and retry remain in [06](goal-06.md).

## Bounded work

- Add owner `launch` and the launch/failure portion of `pending`. Expose the same service operations for the later HTTP layer. Reject these owner operations when invoked as a profile sender.
- Serialize launch/reconcile for each profile. Check the existing mapping before doing work. Persist `launch_state = launching` before pane creation, including enough expected cwd/harness information to find the pending launch after a lost response.
- Refuse name collisions, invalid profile files, conflicting worktrees, missing required environment names, and unavailable herdr before starting a harness. Reuse [03](goal-03.md) for file preparation; do not duplicate it in the launch command.
- Verify required environment presence using the launch-context arrangement recorded by the spike. The drovr service and herdr server may have different inherited environments even under one OS user. If the spike cannot establish the assumed shared environment, report setup failure; do not silently pass secrets through `--env`.
- Create the pane with the run directory and `--no-focus`, then call `herdr agent start` with the profile name and selected harness. No profile arguments, relocated config homes, or edits to user-level harness configuration.
- Observe `interactive_ready` or a blocked/error outcome. Use a bounded launch deadline to surface a stalled launch, not a sleep followed by Enter. First-launch trust and MCP dialogs are owner work; no automatic answer keys.
- Record terminal, public pane, and reported session ids. Follow pane moves through the adapter. A reported `/clear` or `/new` updates the resume reference without changing the profile identity or cancelling messages.
- On reconnect, let herdr perform native restore first. Match a profile only when harness kind, saved session reference, expected run cwd, and a unique runtime agree. Reapply its name only after matching. Ambiguous matches, failed resume, or missing session evidence become recovery errors.
- Resume in a confirmed shell only after restore has finished and the recorded session can be used. Use the spike-verified native resume form. A lost split/start response triggers reconciliation, never a second speculative pane or harness launch.

## Scope cuts

No general process supervisor, harness retry loop, remote launch, profile rename/delete, auth manager, version-history UI, or restart-on-save. The owner edits files on disk; apply happens while stopped. If a harness needs a fresh conversation to load changed instructions, say so instead of claiming that resume applied them. Dialog key controls arrive in [07](goal-07.md).

## Done when

- [ ] For each of the three spike-tested harness versions, `launch` uses the existing login and the resulting profile can identify its instruction sentinel, MCP server, and bundled skill.
- [ ] The harness can edit the configured worktree under the tested permission settings. A trust/MCP question appears in `pending` and remains unanswered until the owner acts.
- [ ] Missing environment presence, a name collision, invalid files, and a worktree conflict produce one useful error, no leaked values, and no extra running harness.
- [ ] Concurrent launch requests for one profile produce at most one launch intent and one managed runtime. An already-running profile is returned rather than launched again.
- [ ] Faults after pane creation and after harness start, before the response is recorded, reconcile the existing runtime or show recovery. Neither path blindly creates another pane.
- [ ] An isolated herdr cold restart preserves the expected native session, cwd, and managed name when supported by the spike; a drovr-only restart does not interrupt the agent.
- [ ] Duplicate session candidates, a wrong cwd/harness, a failed resume, and herdr-down state remain visible failures instead of a guessed binding or silent fresh session.
- [ ] An observed session reset and pane move preserve the profile mapping. A saved instruction edit does not restart the live process or rewrite its applied files.
- [ ] The final hands-on checkpoint has been tried by the owner and revised for feedback before this goal is marked complete.

Use the shared fake adapter for deterministic launch/recovery faults and the isolated namespace from the spike for live checks. Do not require ordinary-agent or remote-machine identity machinery.

## Handoff

[05](goal-05.md) resolves senders and targets through this profile mapping. [06](goal-06.md) uses the same serialized lifecycle path when delivery needs a stopped profile launched. The HTTP and PWA goals project these launch errors; they do not own another launch/recovery implementation.

## Try it and give feedback

**You get:** a sample reviewer profile that `drovr launch reviewer` starts in a real native TUI, plus `drovr pending` and the status diagnostic. Supply the exact setup and pane-opening commands for the isolated namespace.

1. Launch reviewer, open its native pane, and answer any trust/MCP question yourself. Ask it to name its instruction sentinel and make the small sample workspace edit.
2. Run launch again and verify that you return to the same runtime rather than getting another pane.
3. Restart drovr and inspect the profile mapping. Then follow the isolated cold-restore recipe and check the session/cwd/name or the explicit recovery error.
4. Change a profile instruction and follow the documented end-native-harness/apply/launch procedure. Check which instructions the new or resumed session actually sees.

**Expected:** a profile you can use for real native work, with understandable launch/trust/recovery behavior. No message dispatcher or web app is needed for this exercise.

**Feedback:** Does launching and returning to the profile feel dependable? Is applying an instruction change clear enough, including when a fresh conversation is needed? Pause for feedback and repeat any affected launch/recovery step before moving on.
