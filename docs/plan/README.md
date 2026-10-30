# MVP implementation plan

Build [plan-final.md](../plan-final.md), with the ten bounded goals below. The repository currently contains design documents only. Every goal is **planned**, and none of the implementation or live acceptance checks below has run.

This directory translates the final design into work. Earlier proposals are historical references, not additional requirements. [Shared contracts](contracts.md) resolve a few contradictions that would otherwise create different implementations of the same feature. They retain profiles-only addressing, two nonblocking agent tools, and one trigger mechanism.

## Ship this

One hub process with one SQLite file, profile folders, and a small private PWA. Claude Code, Codex, and OpenCode 2 run as native interactive TUIs in herdr. Profiles exchange durable `send` and `reply` messages. The owner handles approvals and uncertain delivery, stops/resumes profiles, edits files, and reads Attention. Scheduled/check-driven wakes use that same router.

All three harnesses are release scope. One may be implemented first, but a working Claude-only demo is not completion of this plan. Herdr owns terminals, agent state, native restore, and machine access; drovr must not rebuild them.

## Ten goals, in order

| Goal | Bounded result | Depends on |
| --- | --- | --- |
| [01 — Compatibility spike](goal-01.md) | Replayable native-pane experiments and a report for the exact hub/harness versions | None |
| [02 — Service foundation](goal-02.md) | Runnable service with a live status CLI, database/migration, and reconnect behavior | 01 |
| [03 — Profile files](goal-03.md) | Editable sample profiles and inspectable generated native files/workspaces | 02 |
| [04 — Profile runtime](goal-04.md) | Serialized launch and conservative native-resume reconciliation | 03 |
| [05 — Messages](goal-05.md) | Inspectable CLI mailbox with durable admission, `send`/`reply`, and allow decisions | 04 |
| [06 — Dispatcher](goal-06.md) | Journaled delivery, uncertain recovery, Stop/Resume/Retry/Cancel | 05 |
| [07 — Private API](goal-07.md) | Paired owner access to the same commands and reads; authenticated pane observation | 06 |
| [08 — PWA](goal-08.md) | Five small views, owner actions, raw file editing, phone/desktop/offline behavior | 07 |
| [09 — Triggers](goal-09.md) | One scheduler with the three specified checks, quiet replies, choices, and a brief | 06, 08 |
| [10 — Release proof](goal-10.md) | Build/run/backup instructions and a recorded full MVP rehearsal | 09 |

These are the entire backlog for MVP. Substeps inside a goal are acceptance work, not an invitation to add another milestone or an extensibility project. A goal ends with a working slice the owner can try and give feedback on, as well as its acceptance checks. Goal 10 completes the final plan's stages 0–3; it is not a new feature stage.

## User checkpoint at every goal

Every numbered goal ends with **Try it and give feedback**. A passing automated suite or a report alone is not the handoff. Deliver the live CLI, inspectable generated files, API recipe, or browser workflow specified there, usable without implementing the next goal.

At delivery, put literal copy-paste commands or the exact private URL in that section, together with sample profiles, concrete isolated config/state paths, and expected output. The commands described here are implementation deliverables; they do not exist yet. Retain the sample state long enough for the owner to inspect it, change an input, and repeat the exercise. Reuse the real operations and earlier fixtures; add no demonstration framework, fake success path, or public fault-injection endpoint.

End the implementation turn with that runnable handoff and the focused feedback prompts. Pause for the owner's feedback instead of rolling straight into the next goal. Fix correctness failures and agreed usability changes within the current goal, rerun the affected exercise, and record the feedback and result briefly in that goal file. Keep unrelated feature requests outside MVP. Mark the goal complete after the working checkpoint has been validated and its feedback addressed; do not substitute backend tests for a usable checkpoint.

## Complexity budget

- **One npm package.** Node 24, TypeScript, `better-sqlite3`; CLI and service share code. Static UI under `web/`, built with Vite and ordinary TypeScript/HTML/CSS. No package workspace, SSR app, separate frontend backend, state framework, or dependency-injection container.
- **Five feature modules.** Keep `herdr`, `profiles`, `router`, `triggers`, and `http`. Entrypoints and small database/config helpers are support files, not additional services. Add a helper when two real call sites need it; do not design generic repositories, buses, plugin registries, workflow engines, or harness strategy frameworks.
- **One command path.** CLI and HTTP decode and authorize their transport, then invoke the same operations. PWA sends, agent sends, replies, and triggers reach the same admission/dispatch rules. Do not duplicate rules in route handlers, CLI commands, or timers.
- **One queue and one journal.** Use messages and attempts. Attention is a query/projection, not a task table. Triggers produce messages, not another job system. SQLite owns durable facts; the snapshot cache owns observed runtime state.
- **One item per delivery.** No batching, automatic retry, inferred answer, blocking wait, or third agent verb. A missed explicit reply remains missed.
- **Three fixed adapters.** Pin the tested versions, templates, dialog keys, and interrupt sequences. Native overrides copy last as the final plan specifies. No cross-harness policy language or immutable profile revision store.
- **Small UI.** Native controls, one shared request helper, one polling/refresh path, a terminal renderer, and a raw text editor for supported config files. No dashboard builder, code editor framework, live collaborative editing, or schema-generated designer.
- **Tests target loss and side effects.** Use a real temporary SQLite database, a controllable herdr boundary, and a small browser smoke suite. Real TUIs prove compatibility. Avoid snapshots of implementation details and a second simulated implementation of the router.

## Hard cuts

| Leave out | MVP substitute |
| --- | --- |
| Remote calls, aliases, profile deployment, and the optional remote spike | Hub only; show ordinary hub panes without making them addresses |
| Every transcript reader, including Claude | Durable drovr thread, bounded visible screen read, hub terminal observer |
| `ask`, `tell`, `report`, `finish`, inbox/wait protocols, ownership modes | The final plan's `send` and `reply`; five-second output debounce with its documented draft limitation |
| Webhooks and private event ingress | Owner-authored scheduled `git`, `paths`, or `command` checks, including `gh` |
| Content-hash Git monitoring | Specified HEAD-plus-porcelain check; document its dirty-file blind spot |
| Push, voice, rooms, secret scanning, additional harnesses | None required |
| Profile rename/delete/import/export, Git history UI, worktree lifecycle UI | Existing profile names, file edits, launch, Stop/Resume; owner prunes Git manually |
| Custom skill/MCP/trigger designers | One allowlisted raw file editor and clear validation errors |
| Separate Interrupt button, installer, launch daemon generator, telemetry | Stop; documented foreground/service-manager command; ordinary diagnostic logs |

These cuts do not defer profiles, messaging, the PWA, triggers, or any of the three harnesses. Those are the MVP. The small additional owner-only **Cancel** operation in [contracts.md](contracts.md#c4-attempt-selection-retry-and-cancellation) releases unresolved work without forcing a potentially duplicate Retry; it is not a third agent messaging tool.

## Evidence and stop rules

Goal 01 records the installed-version results in `docs/spike.md` during implementation. A failed compatibility gate blocks the affected implementation; it does not justify building a transcript fallback, dropping a harness silently, or changing the product into a headless runtime. Record the exact failure and settle the smallest necessary contract before continuing dependent work.

Starting in goal 02, provide stable root commands: `npm ci`, `npm run check`, `npm test`, `npm run build`, and `npm start`, plus the small owner CLI diagnostics needed for hands-on use. Later goals add meaningful tests to that same suite. Live tests run separately and explicitly against an isolated herdr namespace; normal tests must not launch paid model sessions or stop the owner's server.

Use [contracts.md](contracts.md) as the shared acceptance reference. Each goal names additional observable checks; do not copy the full final design into each file. Record live evidence once, rerun only the cases affected by subsequent changes, and reuse the resulting test tools at release.

Before marking MVP complete, goal 10 maps every final-plan acceptance item to passing evidence. Missing spike results, unresolved uncertainty behavior, a UI-only demo, and unchecked boxes are incomplete work.
