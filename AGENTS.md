# Repository instructions

Read [CONVENTIONS.md](CONVENTIONS.md) before changing plans or code. It applies throughout this repository; check for more specific instructions in directories you touch. `CLAUDE.md` delegates here.

## Start with the actual state

Drovr is currently a design-only repository. There is no service, PWA, `package.json`, application test suite, or CI workflow yet. Diagrams, component/function sketches, and npm commands in the plans describe future deliverables. Do not report them as existing behavior or passing checks. Update this paragraph and the working commands when implementation changes those facts.

Read only the material needed for the task, in this order:

1. [Implementation index](docs/plan/README.md) and the active `docs/plan/goal-01.md` through `goal-10.md` file.
2. [Shared contracts](docs/plan/contracts.md), retaining its C1–C8 references; [profile design](docs/plan/profiles.md) for profile work.
3. [Final product plan](docs/research/plan-final.md), the baseline those documents implement and clarify.

Other research and earlier proposals are context, not cumulative requirements. Surface a genuine unresolved conflict instead of silently choosing a new product policy. Preserve unrelated changes, existing instruction scopes, and owner decisions.

## Engineering approach

- Understand the problem and trace the affected flow and callers before choosing a fix. Say what evidence is missing when you cannot establish a fact.
- Follow the [ladder in CONVENTIONS.md](CONVENTIONS.md#the-ladder): question the need, reuse existing code, standard/platform facilities, and installed dependencies before writing the minimum adequate code.
- Fight change amplification, cognitive load, and hidden coupling. Prefer deep modules with small interfaces, readable code, and behavior near its owner. A little duplication is preferable to a premature framework.
- For a significant new design, compare two small approaches. Keep refactors incremental and working; do not turn a bounded task into an architecture rewrite.
- Fix the shared cause, not just the reported caller. Preserve validation, data-loss protection, security, accessibility, and explicitly requested behavior when simplifying.

## Preserve the product boundaries

- Target one Node 24/TypeScript package and hub process, one SQLite database, and five feature modules: `herdr`, `profiles`, `router`, `triggers`, `http`. Keep CLI and HTTP on shared operations; no second router or workflow engine.
- Herdr owns panes, native launch/restore, observations, and terminal operations. Drovr adds profiles, durable messaging, triggers, and a small private PWA. All three native interactive TUIs—Claude Code, Codex, OpenCode 2—are release scope.
- Only configured profiles are managed agent addresses. Ordinary hub panes remain observable. Keep the two nonblocking agent tools, `send` and `reply`; do not add transcript routing, headless/SDK agent loops, remote profiles, or other [hard cuts](docs/plan/README.md#hard-cuts).
- Persist intent before external side effects. Ambiguous prompt writes and lost launch responses require conservative reconciliation; never automatically replay uncertain work or claim exactly-once model execution.
- Keep saved definitions, applied files, and live context distinct. Save does not rewrite live files. Apply requires native TUI exit; Stop is an automation pause, and Resume does not reload configuration. Preserve worktrees, unrelated files, native credentials, and conversation history.
- A required compatibility claim needs goal 01 evidence from the installed versions. Do not invent native capabilities, assume identical permissions/environment inheritance, or silently drop a failing harness.

## Work and handoff

- Keep the ten numbered goal files under `docs/plan/`. Respect the active goal's dependencies, scope, and stop rules; do not hide an extra milestone inside a subtask.
- Preserve each goal's top Show-me explanation and final **Try it and give feedback** section. Keep diagrams, pseudocode, examples, and prose consistent; clearly label planned behavior.
- Deliver a slice the owner can run, inspect, change, and repeat without implementing the next goal. Supply exact commands or the private URL, isolated paths/sample inputs, expected observations, and focused feedback questions.
- Record evidence and owner feedback in the goal file. Pause at the goal checkpoint, address the feedback, and mark complete only after the owner validates the slice. Passing backend tests or a diagram alone is not that handoff.
- Explain outcomes and tradeoffs in plain language. Report checks actually run, their limits, and remaining uncertainty. Do not give development-time estimates.

## Working checks

From the repository root, `git diff --check` currently checks whitespace in tracked changes. Inspect new files and verify their local links/imports separately; untracked files are not covered by that diff.

Application install/check/test/build/start commands are goal 02 deliverables, not available commands today. Once code exists, read the actual manifest/scripts and document their working directories and coverage here. Ordinary tests use disposable state and a controllable herdr boundary; live compatibility checks use an isolated namespace and must not launch paid sessions or stop the owner's fleet as part of normal tests.
