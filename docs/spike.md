# Native compatibility spike — 30 October 2026

**Status: in progress.** The replayable native experiments are retained, including a passing three-harness cold restore on the calibrated setup. Codex command-sandbox Unix-socket access remains a compatibility gate. Native readiness also needs the visible-dialog guard described below. Owner hands-on acceptance is pending; no dependent goal has started.

## Run and inspect

The [replay instructions](../tools/spike/README.md) use the [Python driver](../tools/spike/spike.py), [two-verb call recorder](../tools/spike/stub/drovr), [stdio MCP sentinel](../tools/spike/stub/mcp.py), and [editable inputs](../tools/spike/examples/AGENTS.md). These are disposable compatibility tools, not the service, router, or PWA.

Current owner checkpoint: `/tmp/drovr-g01-owner`, namespace `drovr-g01-3dcbd595c8`, with a ready native OpenCode 2.2.2 pane. [Goal 01's final section](plan/goal-01.md#try-it-and-give-feedback) gives the literal exercise. Its `handoff-smoke` recorder row contains all four expected sentinels. The owner exercise itself has not been reported back.

The main evidence namespace is `drovr-g01-3d2adcb686`, root `/tmp/drovr-g01-live`:

```bash
SPIKE_ROOT=/tmp/drovr-g01-live
spike() { python3 tools/spike/spike.py --root "$SPIKE_ROOT" "$@"; }
spike observe
spike herdr agent list
spike herdr agent read claude-b --source visible --lines 40
cat "$SPIKE_ROOT/runs/claude-b/results.jsonl"
```

For a fresh repeat, prepare a **new** root using the README. Existing initial Launch requests are not replayed. Private roots contain disposable seed repositories, six worktrees at `runs/<profile>/api`, extra directories at `extra/<profile>`, native files, and command evidence. Raw screens/logs are private and **not automatically redacted**. No credential values belong in this report.

A shell-only recipe and a Python standard-library driver were compared. Python was chosen for namespace selection, returned ids, recorded intent, bounded native calls, and deliberate acknowledgment loss. There is no adapter framework, second router, transcript reader, or model loop here.

## Tested versions and supported launch setup

| Item | Observed |
| --- | --- |
| Hub | Debian GNU/Linux 13.7; Linux `6.12.107+deb13-cloud-amd64`; x86_64; Bash |
| herdr client / test server | 0.9.3 / 0.9.3; protocol 22; compatible |
| Claude Code | 2.1.314; `/root/.local/bin/claude` |
| Codex | 0.166.0; pinned native binary under `/root/.codex/packages/standalone/releases/` |
| OpenCode 2 | 2.2.2; `/root/.opencode/bin/opencode`, initially outside PATH |
| Native integrations | Owner-approved installs: Claude v10, Codex v8, OpenCode v13 |
| Node / application | Node not on PATH. No service, package manifest, application tests, build, or PWA exists. |

The driver starts only a named test server. The verified Debian/Bash setup includes:

- Native executable directories in the test server's PATH.
- A namespace-local `bin/codex` that execs the pinned native binary with `--no-daemon` for fresh **and native-resume** commands.
- Task-owned `herdr.toml`, `bin/spike-shell`, and `shell.rc`. The shell sources the existing user `.bashrc`, then prepends the namespace bin directory. The user's `.bashrc` otherwise moved the real Codex executable ahead of the launcher on cold restore.
- The normal native homes, credentials, settings, and conversation history. No credential copy or relocation.

Always use `spike start-server` for this setup. The script refuses to silently reuse a running legacy namespace lacking the setup files. The older owner checkpoint is an OpenCode-only exercise; use a newly prepared root for the calibrated three-harness recipe.

The owner explicitly approved both A/B folder trust decisions and the sentinel MCP servers, and separately approved all three native integration installs while preserving existing settings. The native installers returned 0; comparisons preserved pre-existing configuration values. Native-created hook/TUI config paths were recorded. This authorization does not constitute acceptance of the completed spike.

### Existing login, native homes, and inherited behavior

- Claude's native auth status reported logged in through `claude.ai`, first-party provider, Max subscription. Existing `/root/.claude/.credentials.json`, `.claude.json`, and `.claude/settings.json` remained in place. Sessions remain under the native `.claude` project storage.
- Codex's native login status reported ChatGPT login. Existing `/root/.codex/auth.json`, config, and native session storage remained in place. Native thread **metadata**, not conversation bodies, was used only for the owner-metadata repair described below.
- OpenCode's native paths command reported config `/root/.config/opencode`, data `/root/.local/share/opencode`, and database `opencode.db`. `auth.json` was absent. Native auth listing succeeded; read-only schema/count inspection found one `credential` row and zero account rows. No credential values, exports, messages, or transcripts were queried. The TUI used its existing OpenCode Go provider without a login flow.
- User-level Claude/Codex/OpenCode guidance files checked were absent. Initial Claude/Codex config had no top-level global hook/MCP entries. After the approved installs, user hooks participated in both profiles' native session reporting. Other native settings, plugins, memory, and service state were preserved, rather than suppressed to force isolation.

Two different profiles under each harness loaded distinct profile/MCP sentinels. Corrected B skills also loaded distinct skill sentinels. Original A skills had the earlier `drovr-A` skill sentinel; the current generator renders a distinct skill value per profile. Shared authentication and global configuration remain shared; these tests do not claim a sandbox between profiles.

## Required matrix

Every entry is an observation or an explicit limit. A failed/unknown case is not a pass.

| Case | Claude Code | Codex | OpenCode 2 |
| --- | --- | --- | --- |
| Fresh startup | Folder trust, separate MCP consent, optional renderer choice | Folder trust; separate hook review and MCP approval | No initial folder/MCP dialog observed; server visible |
| Instructions / repository / skill / MCP | A/B actual sentinels and MCP calls | A/B actual sentinels and MCP calls | A/B actual sentinels and MCP calls |
| Worktree + non-Git extra edit | Both native edits succeeded | Both native edits succeeded | Both native edits succeeded |
| Git metadata | Staging requested approval; canceled | Staging failed on read-only Git metadata, then asked escalation; canceled | Staging requested approval; canceled |
| Final B ten explicit ids | b1–b10, exactly one call each | b1–b10, exactly one call each, correct pane | b1–b10 all called; b6 called twice, correct pane |
| Earlier A ten ids | m1 needed explicit continuation after canceled Git; m2–m10 each one | Original m1 failed PATH; calibrated r1–r10 each one, but old shared-daemon attribution was wrong | r1–r10 all called; r7 called twice |
| Duplicate / omitted / quiet / terminal reply | 2 calls / 0 / 1 empty quiet row / 0 | 2 calls / 0 / 1 empty quiet row / 0 | 2 calls / 0 / 1 empty quiet row / 0 |
| Actual B tool environment | Correct pane/socket; server marker present; workspace-only markers absent | Correct pane/socket; server marker present; workspace-only markers absent | Correct pane/socket; server marker present; workspace-only markers absent |
| Chosen interrupt, working / idle / draft / dialog | Esc interrupted generation, preserved idle/draft, declined dialog | Esc interrupted generation, preserved idle/draft, declined dialogs | Two **separate** Esc calls ~200 ms apart interrupted generation, preserved idle/draft, declined dialog |
| Ctrl+C negative case | One idle press warns another will exit | One idle press disconnects native TUI | One working press exits native TUI |
| Prompt into nonempty composer | Appended and submitted existing draft | Appended and submitted existing draft | Appended and submitted existing draft |
| Native reset | `/clear`; name/pane/cwd retained, session fields depend on hooks | `/new`; session id available with approved/trusted hook | `/new`; visible reset despite `agent_prompt_stalled` on one wait |
| Pane move | w1:p1 → w8:p1; same native binding; actual caller lookup resolves new id | w2:p1 → wA:p1; same binding; caller lookup denied in command sandbox | w3:p1 → w5:p1 → w9:p1; same binding; actual caller lookup resolves new id |
| Client disconnect / reattach | Same native binding after test-client termination/reattach | Same | Same |
| Final native cold restore | Same name/public pane/cwd/native session; new terminal | Same, including actual post-restore pane/socket check | Same; observed existing-session resume command |
| Missing / invalid resume | Missing UUID exits with native error; invalid string opens no-match picker despite ready | Both invalid string and missing UUID fail; no fresh fallback | Invalid prefix fails; valid missing `ses_…` creates new conversation under requested id |
| Instruction edit, manual resume / fresh | Both loaded edited profile sentinel; actual recorder rows | Both loaded edited profile sentinel; actual recorder rows | Both loaded edited profile sentinel; actual recorder rows |
| Lost launch response | B request discarded; one blocked named candidate found | Same | One ready named B candidate found |
| Lost prompt acknowledgment | Discarded request reached exact recorder, after native recorder approval | Standalone discarded request produced exact `lost-ack-cdx-final` recorder row | Discarded request reached exact recorder; later `/new` removed text from viewport |
| Native command wait | Native default not remeasured | 35-second command completed through one background-terminal wait | 35-second shell call completed synchronously |

The optional remote-machine check is excluded. Upper native command-timeout limits were not established. The measured 35-second cases are lower bounds, not invented maximums; the messaging stub returns immediately and does not wait for a model. The service's future 30-second check-process limit is a separate goal 09 responsibility.

### Reply compliance and native file mutations

Recorder rows, not model prose, prove calls. The stub intentionally does not route, authorize, deduplicate, implement a mailbox, or wake another profile. Duplicate calls remain separate evidence rows. Missing calls stay missing; quiet-only produced actual empty `quiet=true` rows; incoming reply rows produced no automatic reply chain.

The initial OpenCode B sentinel turn claimed it would reply but recorded nothing. The shared skill was clarified to require an actual successful CLI call before finishing. On the affected rerun, all ten B ids received actual calls; one had an extra call. Earlier failures and extras remain in the evidence. This is not exactly-once model execution.

The fixture now names an absolute recorder executable. When native shells filter custom variables, a bounded cwd-only `.drovr-spike.json` marker points only to that cwd's `results.jsonl`. It never searches parents or supplies a fabricated `HERDR_PANE_ID`.

B-profile before/after hashes found existing generated files unchanged. Claude additionally created `.claude/settings.local.json` with native MCP enablement state. Codex had no new/changed generated paths; OpenCode's known generated files stayed unchanged. The owner smoke also left its four baseline instruction/config/skill/fixture files unchanged. Preserve native-generated local state and unrelated files in later Apply work.

## Native observation, keys, and recovery limits

| Native UI | Observed sequence / limit |
| --- | --- |
| Claude folder trust | From default No: Down, Enter; explicitly owner-approved |
| Claude project MCP | Select **Use this MCP server**, not all future servers; owner-approved |
| Claude renderer choice | Select Not now; this modal appeared while herdr reported idle/ready |
| Claude Bash approval | Enter permits the selected exact command once; Esc declines. One fresh approval modal remained visibly open while `agent get` said idle/ready. |
| Codex folder trust | Enter on Trust and continue, after owner approval |
| Codex hook review | Review SessionStart command, trust that installed hook, then leave review UI. Initial hook-review screen was unknown; start timed out and lost its pending name. |
| Codex MCP / escalation | Enter on reviewed Allow once; Esc cancels. No persistent rule was added. |
| Codex conversation lock | Native screen offers retry/fork/exit. The locked shared-daemon test thread was left untouched; no automatic fork, release, or new session substituted for it. |
| OpenCode permission | Enter on reviewed Allow once; spaced double-Esc declines and interrupts. Echoed command text is not execution evidence. |
| OpenCode working interrupt | First Esc arms “esc again to interrupt”; two separate calls ~200 ms apart stopped real generation without quitting. |

The supported `pane.read` request uses a fixed line bound and `source=visible`. Installed subscriptions exclude `pane.output_changed`. Twelve one-second visible polls changed screen hashes while `read.revision` stayed 0; agent revision also stayed fixed through many turns while `state_change_seq` advanced. Use bounded visible comparison as the C5 activity fallback, not a transcript reader or output-sequence assumption.

Idle/readiness do not prove an empty composer or the absence of every modal. The five-second debounce cannot prevent the recorded draft collision. Native reset alone need not advance the state sequence. Across a cold restore, terminal identity and counters change; C5 requires recovery rather than comparing unrelated baselines or silently closing an attempt.

**Required handoff guard:** C5 now explicitly requires pre-write validation to hold on a known overlay or an unclassified ready view, using the existing bounded dialog surface. This report does not claim that `agent.prompt` can safely rely on readiness alone. Implementing that guard belongs to the later adapter/dispatch goals; no production screen parser or prompt workaround was built in the spike.

### Cold restore and launcher calibration

Before integrations, the first cold run restored shells rather than native agents. Approved integrations supplied real native session ids after their startup requirements. A subsequent default native Codex resume dropped its initial `--no-daemon`, reused the shared daemon's wrong context, and lost its managed name.

A namespace-local executable wrapper was tried. The normal user Bash startup reordered PATH ahead of it, so a test-owned Bash rcfile now restores the intended launcher precedence after sourcing the existing rcfile. No global shell file changed. This is a deliberate Debian/Bash-only spike setup, not a cross-platform abstraction.

The final comparison in `before-cold-final.json` / `after-cold-final.json` retained all three names, public pane ids, cwds, and native session ids, with new terminal ids. Codex's actual process was the pinned binary with `--no-daemon resume <same-id>`. A fresh actual tool check after that cold run matched both its pane and the isolated socket's device/inode. Claude/OpenCode native process arguments resumed their same ids. Later pane moves were separate experiments.

### Acknowledgment loss

`launch <profile> --lose-ack` retains intent, creates one pane, sends one native start request, and closes without reading the response. Observation found the existing named candidate; it did not create a speculative second pane. Later explicit starts occurred only after those test processes had authoritatively exited.

`lost-prompt ...` sends once and discards the response. OpenCode's exact `lost-ack` recorder row arrived anyway. After `/new`, the bounded viewport no longer showed its prompt/result. Claude's separately discarded request also produced its exact row after a native approval. Screen absence and missing caller acknowledgment do not authorize replay. C4's unknown-delivery journal and owner decision remain necessary.

### Side effect discovered and repaired

The unsafe shared-daemon experiment, after hooks were enabled, sent the test session id to the **owner's** inherited socket/pane. A later read-only audit found that test id in the owner's saved pane metadata. This violated the intended isolation boundary; the initial experiment was not fleet-neutral.

The owner process was left running. Its correct current tool-thread id was verified against native thread metadata, project cwd, CLI version, and session-path existence; no conversation body was read. Re-reporting its genuine SessionStart metadata through the installed native hook restored the correct owner session id, then the snapshot was verified. No history or credentials were modified. `owner-metadata-audit.json` and `owner-metadata-repair.json` retain the failure and repair outcomes. The calibrated standalone launcher prevents that tested context-reuse path; do not repeat the shared-daemon baseline with global hooks enabled.

## Remaining compatibility gates and owner checkpoint

1. **Codex command-sandbox Unix sockets.** A real native Python AF_UNIX ping failed with `PermissionError`, errno 1, independently of herdr CLI file access. The installed sandbox utility reproduced it. The file recorder is not proof that the planned Unix-socket `drovr` CLI works.
2. **Owner acceptance.** The owner must run, change, and repeat the checkpoint, then give trust/interruption/update feedback. Approval to run experiments/install hooks is not this acceptance.

Official OpenAI documentation describes [named permission profiles and Unix-socket allowlists](https://learn.chatgpt.com/docs/permissions). The bounded candidate extended `:workspace`, enabled the network proxy with no external domain allows, and permitted only the isolated test socket. The installed TUI accepted the configuration but its actual tool still failed at **socket creation**, before connect, with `PermissionError`/errno 1. The original project config was restored byte-for-byte and its known-good session resumed. Native helper and real-TUI results are retained separately. A failed narrow policy is not justification to disable the sandbox, add a protocol, or drop Codex.

The prepared [read-only probe rule](../tools/spike/examples/codex-socket-probe.rules) is **unapplied**. It would allow only one fixed `spike.py ... socket-probe` invocation outside the command sandbox. The host probe already reaches the live isolated socket. [Official command-rule documentation](https://learn.chatgpt.com/docs/agent-configuration/rules) describes this outside-sandbox behavior. Testing that exception and accepting the same approach only for messaging CLI verbs requires the owner's explicit policy decision; the driver does not install rules automatically.

The readiness and missing-OpenCode-history findings are handoff constraints made explicit in C5: reject known/unclassified overlays before prompting, and do not infer continued history or observation continuity from a matching id. Preserve owner cold/gap recovery and the explicit fresh/resume choice. These constraints do not add a transcript fallback or another agent protocol.

No service implementation begins while its needed gate is unresolved. All three native TUIs remain scope. Exact next corrections require native compatibility evidence and, where they change the owner-approved policy, an explicit decision.

## Retained evidence and checks

Under `/tmp/drovr-g01-live`: versions/schema, literal `commands.jsonl` requests and outcomes, launch records, lost-response records, per-harness notes and actual result rows, environment-presence files, native login metadata, file baselines/diffs, output polling, phased cold snapshots, client disconnect/reattach results, and owner metadata audit/repair. These paths are ephemeral across host replacement; preserve the synthetic directory before removing the environment. Raw native logs/screens may contain unrelated private context and are not public report artifacts.

Fixture checks covered quiet/body validation, duplicates, bounded logs/input/locking, open stdin, confined markers, MCP initialize/list/call, selector rejection, Python/JSON/TOML parsing, and native non-JSON output. A real client disconnected and reattached without changing the three native bindings; keyboard detachment was not verified through the tool's PTY. Repository checks are whitespace, local links/fences, and new-file inspection. No application `npm` test/build/install check is claimed.
