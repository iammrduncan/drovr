# Engineering conventions

These conventions apply to repository work through [AGENTS.md](AGENTS.md). They adapt the owner's [Good Engineering](.agents/skills/engineering/reference/GOOD_ENGINEERING_H.md) principles and [ladder](.agents/skills/engineering/reference/ladder.md) to drovr's accepted plan. They are review discipline and planned acceptance obligations, not claims of configured lint, tests, or CI.

## Work from evidence

Understand the request, current behavior, affected callers, data ownership, and side effects before judging an approach. Read enough surrounding code or design to explain why the existing boundary exists. Preserve that reason when changing it; an unfamiliar piece of code is not automatically cleanup work.

Separate observed facts, intended behavior, and hypotheses. State what you cannot establish and what observation would settle it. A native API mentioned in a proposal, a simulated diagram, or another project's implementation is not compatibility evidence for this hub.

The [implementation index](docs/plan/README.md) bounds execution of the [final plan](docs/research/plan-final.md). [Contracts C1–C8](docs/plan/contracts.md) resolve the identified ambiguities; [profiles.md](docs/plan/profiles.md) defines the saved/applied/live lifecycle. Read the active goal for its acceptance and handoff. Earlier research is historical context. If these sources still disagree on a material behavior, identify the exact conflict and continue independent work without inventing a policy.

The repository currently has design documents and local skills, with no application manifest, implementation, test runner configuration, or CI workflow. Keep planned architecture separate from current enforcement. When implementation arrives, revise factual instructions from the actual scripts and code.

## The ladder

After tracing the problem, stop at the first option that adequately solves it:

1. **Avoid unnecessary work.** Is the behavior needed for this request or current goal? Do not remove explicitly requested behavior under the name of YAGNI.
2. **Reuse the repository.** Find the existing operation, helper, or pattern. Fix its shared cause and inspect every affected caller rather than adding a workaround to one path.
3. **Use the standard library.** Prefer an adequate built-in facility over custom machinery.
4. **Use the native platform.** Let herdr, the filesystem, SQLite, Git, and the native harness own the capabilities already assigned to them. Verify the exact required behavior.
5. **Use an installed dependency.** Check its actual API and constraints before introducing an equivalent or another package.
6. **Try a direct expression.** A short, obvious operation is better than a helper that hides nothing. Use named intermediates when they make the result easier to read or debug.
7. **Write the minimum adequate code.** Add only the missing behavior, with explicit failure handling and evidence that it works.

Small means less unnecessary machinery, not a weaker algorithm. Never save lines by dropping boundary validation, data-loss handling, security, accessibility, platform calibration/compatibility, or requested behavior. For equally small approaches, choose the one correct at the edges.

For a deliberate shortcut with a known ceiling, use the ladder's `ponytail:` comment marker near the decision. Name the limitation, why it is adequate now, and the condition/upgrade path that would justify replacing it. A comment is not permission to weaken a stated contract. Do not rename an established marker or scatter speculative TODOs.

## Reduce complexity at its owner

- **Design it twice when the decision matters.** Sketch two plausible, bounded approaches to a significant new design. Compare dependency cost, cognitive load, failure behavior, and where complexity is hidden. Record the choice briefly in the relevant goal/design; do not reopen settled architecture for routine edits.
- **Build deep modules.** A small public operation should hide the tricky policy/transaction work it owns. Avoid interfaces that require every caller to know ordering, storage details, or the same recovery rule. A forwarding layer that adds no different level of meaning usually adds maintenance cost.
- **Keep one source of a decision.** CLI and HTTP decode/authorize their transport, then call shared operations. Preview and Apply share rendering. Trigger admission uses the same router as other sends. Do not copy those rules into buttons, timers, or route handlers.
- **Keep behavior local.** Put related logic, validation, and tests near the module that owns them. Split by responsibility or a real information-hiding boundary, not by a mechanical file size or a desire for more directories.
- **Let abstractions earn their place.** Prefer straightforward duplication to a framework for imagined callers. Extract a helper when real call sites expose a coherent shared concept. Avoid generic repositories, buses, plugin registries, dependency injection, and extensibility scaffolding outside the accepted plan.
- **Keep code readable.** Use domain names, direct control flow, named intermediates, and explicit returns/errors. Use types and generics where they clarify a real contract; do not add a generic type hierarchy for hypothetical reuse. A difficult name or explanation is a signal to inspect the boundary.
- **Refactor in safe steps.** Keep the behavior working after each step. Separate unrelated cleanup from a fix; preserve the owner's concurrent changes. Do not turn a local problem into a large rewrite.
- **Optimize from measurements.** Record resource-cost hypotheses while designing, then measure the actual bottleneck before optimizing. Do not introduce caches, batching, concurrency, or extra services because they might be faster.

The planned structure remains one Node 24/TypeScript package/process with `better-sqlite3`, ordinary TypeScript/HTML/CSS and Vite for the small PWA, and these five feature owners:

| Module | Owns | Keeps out of callers |
| --- | --- | --- |
| `herdr` | Verified native operations and observed snapshot | Transport/version details and observation freshness |
| `profiles` | Definition validation, native rendering/application, runtime mapping | Harness-specific paths and lifecycle reconciliation |
| `router` | Admission, authorization, lineage, attempts, dispatch, recovery | Transaction ordering and delivery uncertainty |
| `triggers` | Applied schedules/checks and ordinary wake admission | Cursor, baseline, coalescing, and timing bookkeeping |
| `http` | Owner authentication, transport, constrained files/panes, PWA reads/actions | Device access and HTTP-specific checks; domain rules stay shared |

Entrypoints and small database/config helpers support those modules; they are not additional services. This is the accepted target, not an existing source tree or a request to create empty scaffolding now.

## State invariants before mechanisms

For nontrivial logic, identify the invariant, authoritative state, legal transitions, side effect, and recovery outcome before writing the code. Put the check beside the operation it protects. Assert programmer errors; handle invalid input, missing resources, native failures, and timeouts as explicit external outcomes. A failed invariant must not become a successful-looking default.

Use narrow transactions for related durable decisions and a per-profile serialization boundary for lifecycle/dispatch races. Do not hold a database transaction open while waiting for a native process or model response. Do not introduce distributed coordination for this one-process hub.

| Boundary | Invariant to preserve | Required failure reasoning |
| --- | --- | --- |
| Admission, C1–C3 | One transaction owns deduplication, canonical-input comparison, decisions, limits, insertion, and eligible reply-wake reservation. `send`/`reply` return after admission. | Identical retries reuse the result; changed input conflicts. No model wait or second admission path. |
| Dispatch/recovery, C4–C6 | Claim the active message and commit its prepared attempt before an external prompt write; one active attempt per profile. | Ambiguous writes stay unknown. Reconcile lost starts; no speculative second pane, automatic resend, or exactly-once execution claim. |
| Observation, C5 | Only comparable observations on the matched runtime can close a submitted scheduling slot. | Closed does not mean answered or successful. A continuity gap is recovery work; a missing ordinary reply stays missing. |
| Stop/Resume, C6 | Persist pause/generation before interrupt. Preserve in-flight evidence; Resume reconciles and schedules from now. | Old-generation checks cannot enqueue. Unknown delivery still needs a decision; skipped ticks are not replayed. |
| Profile files, C7 | Saved source, applied files, and loaded context are distinct. Apply requires native exit and one stable captured candidate. | Reject stale saves, unstable captures, unsupported translations, collisions, and invalid paths. Journal owned paths; repair incomplete Apply before Launch. |
| UI/owner actions, C8 | CLI/API share operations; Attention is a projection; action retries reuse their key. | Revalidate stale cards/dialogs; no offline mutation queue. Quiet hides results, never operational errors. |

Keep exact payload/queue/depth/rate/time limits and override semantics in the linked contracts and goal acceptance criteria. Do not create a second constants table here. Preserve their units, overflow/refusal behavior, and stable accounting when implementing them.

Saved profile bodies remain files, not duplicate SQLite rows. SQLite owns durable facts; the in-memory snapshot owns observed runtime state. A source Git label is provenance, not proof that a model loaded instructions. Copy raw overrides last as whole-file replacements; do not invent a deep-merge language or revision store.

Worktrees and unrelated owner files are not generated output. Never replace a run root containing code, reset/clean/switch/delete a provisioned worktree, or relocate/copy native credentials as an incidental implementation detail. Keep existing harness auth/config/history ownership. Permission labels, a shared OS user, and a common login do not prove equivalent settings, environment presence, or security isolation.

## Validation, resources, and failure visibility

Validate external input at the boundary that uses it: CLI/API payloads, profile/config files, paths, native responses, and owner action tokens/cards. Encode output at its rendering boundary. Same-account attribution is the documented trust model, not protection from another process with that user's authority.

Prefer APIs that make redundant/invalid states unrepresentable and safely absorb ordinary repetition. Do not erase useful distinctions such as refused, held, unknown, invalid, or recovery-needed just to simplify a return type. Idempotent does not mean silently ignoring changed input or uncertain side effects.

Name resource bounds before adding queues, retry behavior, payloads, polling, command output, or work per request. Define what happens at the limit, who initializes and cleans up the resource, and what persists across restart. Use the current plan's bounds; new budgets or architecture changes need an explicit design decision, not an arbitrary style rule.

Use platform cryptographic primitives or well-vetted libraries for security work; do not invent crypto. Start access closed and open it deliberately. Preserve private owner authentication, origin checks, constrained filesystem/pane access, and redaction. A profile permission setting or advisory allow list is not an OS sandbox.

Logs should explain important decisions, side-effect attempts/outcomes, and recovery transitions using message/attempt/profile/request identifiers. Do not log every branch mechanically, message bodies, credentials, expanded environment values, or secret-bearing config. Errors should name the affected field/path/operation and the next useful action without leaking contents. Runtime log-control machinery is not required by this MVP.

Keep initialization, shutdown, subscriptions, timers, buffers, and process cleanup explicit. A failed native connection must produce stale/unavailable observations and bounded recovery, not tight loops or invented fresh state. Observe through the verified goal 01 surface; the proposed output subscription and service/herdr environment equivalence remain unproven until measured.

## Test strategically

Choose the smallest check that would fail if the intended behavior broke. Test observable behavior and state invariants rather than mirroring implementation details. Use a regression check for a behavior bug; a trivial or documentation-only edit does not require a manufactured test suite.

- Prefer integration checks at real cut-points and critical user paths. Use a real temporary SQLite database and disposable worktrees; a controllable herdr boundary supplies deterministic native failures. Mock external boundaries rather than rebuilding the router in a fake.
- Use focused unit checks for pure rendering, canonicalization, and other logic when they give better failure evidence. There is no blanket unit-test ban or integration-only mandate.
- Exercise empty, maximum, over-limit, malformed, duplicate, changed-key, stale, and interrupted inputs where relevant. Test both the transition and what must remain unchanged after rejection.
- Put faults around the durable/external boundary: after intent/prepare commit, before/after native writes, during capture/Apply, on lost acknowledgments, reconnect, cold restore, Stop races, and Retry/Cancel. Preserve attempt history and user code.
- Ordinary tests use temporary paths and the controllable boundary. They must not launch paid model sessions, write the owner's credentials/config, or stop the owner's running server.
- Real compatibility evidence uses the isolated namespace, installed native TUIs, pinned versions, and retained sample inputs from goal 01. A passing fake or another project's harness adapter does not prove discovery, permissions, reload, dialogs, or restore here.
- Run checks appropriate to the change. Once they pass, broaden/repeat only for new changes, a failure, or a concrete unresolved concern. Do not add a testing framework, snapshots, or fault-injection product surface to demonstrate a small change.

Current root check: `git diff --check` verifies whitespace in tracked changes. For new Markdown, inspect the new files and verify local paths/imports and fenced examples. This is not application validation.

Goal 02 must later establish `npm ci`, `npm run check`, `npm test`, `npm run build`, and `npm start` from the repository root. They do not exist today. When available, inspect the real scripts, scope, and configuration before documenting them as working commands or gates. Record what ran, passed, failed, and was not run; never turn a planned check into evidence.

## Documents, goals, and owner feedback

Keep MVP work in the existing `docs/plan/goal-01.md` through `goal-10.md` files. Do not create an unnumbered implementation goal or an eleventh hidden milestone. Keep product changes separate from the current bounded goal.

Each goal and the profile design start with a useful Show-me explanation. Use complementary views of structure, ownership, execution, interactions, state changes, and concrete examples as relevant. Use shallow trees, call trees, pseudocode, Mermaid, and before/after diffs in Markdown. Label proposed components/functions and planned behavior. Do not substitute one generic pipeline for an explanation or create HTML/Sites design artifacts unless requested.

Maintain the agreement between diagrams, examples, contracts, and detailed text. Use current local links; preserve historical research and owner file moves. Do not invent a native API, production path, user-facing command, or passing observation to make a sketch look complete.

Every goal ends with **Try it and give feedback**. At implementation handoff:

1. Supply a working slice usable without the next goal, with literal commands/private URL, sample inputs, isolated config/state/workspace paths, and expected observations.
2. Let the owner inspect it, change an input, and repeat it. Retain the sample state and evidence rather than delivering only a report or backend test output.
3. Pause for the owner's feedback before the next goal. Address correctness failures and agreed usability changes within the current goal; rerun the affected exercise and record the result there.
4. Mark complete after acceptance evidence and the owner checkpoint are validated and feedback is addressed. Keep remaining failures explicit.

Use plain language, explain outcomes and the relevant tradeoffs, and keep implementation details out of product flows unless useful to the owner. Do not give development-time estimates.

## Sources and deliberate adaptations

| Source | Applied here | Adaptation / enforcement |
| --- | --- | --- |
| [Good Engineering](.agents/skills/engineering/reference/GOOD_ENGINEERING_H.md) | Complexity reduction, deep modules, locality, readable code, small refactors, alternative designs, measurement, honesty | Review discipline. No unconfigured formatter, lint rule, file/function cap, or blanket generic-type restriction is presented as enforced. Review large files for cohesion; split for responsibility, not a line quota. |
| [The ladder](.agents/skills/engineering/reference/ladder.md) | Understand first, reuse before adding machinery, fix shared causes, protect required behavior, record deliberate ceilings with `ponytail:` | Review discipline. Readability wins over forced one-liners. Retain the accepted SQLite/worktree fixtures and boundary tests rather than applying a blanket no-fixtures rule. |
| Good Engineering: testing, logging, security, resources | Useful regression evidence, bounded work, explicit failure transitions, identifiers and safe defaults | Adapt broad logging/testing advice to the documented redaction, minimal runtime, and real cut-points. No every-branch logging mandate or new log-control service. |
| [MVP index](docs/plan/README.md) and [goals](docs/plan/README.md#ten-goals-in-order) | Package/module budget, hard cuts, ten usable slices and owner checkpoints | Accepted project scope; implementation/compatibility gates remain planned until evidenced. |
| [Contracts](docs/plan/contracts.md) and [profile design](docs/plan/profiles.md) | Durable state, native side effects, file ownership, owner action semantics | Canonical behavior for implementation and acceptance tests; preserve C1–C8 identifiers and avoid duplicate policy definitions. |

No additional external style guide was fetched or adopted. TigerStyle-derived resource/invariant ideas already included in the bundled principles do not import Zig syntax, static-allocation bans, assertion quotas, or unrelated platform architecture. Update these adaptations from project evidence rather than turning borrowed examples into new product requirements.
