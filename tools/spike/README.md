# Native compatibility spike

This is disposable goal 01 tooling, not the drovr service. Python 3.11+, Git,
herdr, and the selected native harness are required. The calibrated shell setup
targets the recorded Debian/Bash hub. The observed versions,
results, and remaining gates belong in [docs/spike.md](../../docs/spike.md).
A successful recorder or MCP check alone proves no native compatibility case.

The current Codex command sandbox denies the observed Unix-socket probe. The
prepared [probe rule](examples/codex-socket-probe.rules) is a proposed owner
decision, not an installed exception. `socket-probe` sends only a bounded
read-only ping to the retained test endpoint; the driver never installs a rule
or broadens native permissions on its own. See the report for the failed narrow
socket policy and the outstanding messaging-transport gate.

## Prepare and inspect

From the repository root, choose a **new**, nonexistent disposable directory:

```bash
SPIKE_ROOT=/tmp/drovr-goal01-owner-20261030-a
python3 tools/spike/spike.py --root "$SPIKE_ROOT" prepare
cat "$SPIKE_ROOT/versions.json"
cat "$SPIKE_ROOT/spike.json"
```

Preparation creates a local seed repository, six profile inputs under `runs/`,
six Git worktrees at `runs/<profile>/api`, and non-Git directories under
`extra/<profile>`. Profiles are `claude-a`, `claude-b`, `codex-a`, `codex-b`,
`opencode-a`, and `opencode-b`. Inputs come from [examples/](examples/).
Edit generated inputs before launch if desired. Keep this directory for review;
preparation refuses to overwrite it. It does not install missing harnesses.

This hub uses owner-approved herdr integrations Claude v10, Codex v8, and
OpenCode v13, installed while preserving prior user settings. The driver never
installs integrations or changes global shell/harness configuration. A new hub
needs its own observed setup; use the report for this hub's installation evidence.

The native TUIs use the existing login and user configuration. Global hooks,
memory, instructions, permissions, and MCP servers may therefore contribute.
Generated files describe the experiment's contribution, not configuration
isolation. Do not copy credentials or alter global settings to make a case pass.

Each run directory also contains a small `.drovr-spike.json` recorder marker.
If a native shell filters the fixture's custom environment names, the stub can
read that marker only from its exact cwd and write only `cwd/results.jsonl`.
If it also filters `PATH`, explicitly invoke the repository's absolute
`tools/spike/stub/drovr` path while keeping the run directory as cwd, and record
that calibration. This fixture convenience proves no production launch-environment
inheritance; missing environment presence remains an observation to resolve.

## Launch and observe

The following helper keeps every native command on the experiment's named
server and records requests/results in `commands.jsonl`:

```bash
spike() { python3 tools/spike/spike.py --root "$SPIKE_ROOT" "$@"; }
spike start-server
spike launch opencode-a
spike observe
spike herdr agent list
spike herdr agent get opencode-a
spike herdr agent read opencode-a --source visible --lines 80
```

Replace `opencode-a` with another prepared profile to exercise that harness.
`start-server` writes only task-owned `herdr.toml`, `bin/spike-shell`,
`shell.rc`, and `bin/codex` under this root. The Bash rcfile sources the owner's
normal `~/.bashrc`, then prepends the namespace's `bin` directory so user PATH
setup cannot displace the Codex launcher. Server PATH also includes the
recorded native executable directories, including OpenCode when it is outside
the caller's PATH. No global shell file is edited.

The namespace-local `bin/codex` executes the recorded native binary with
`--no-daemon` for both initial launch and herdr's native resume. This preserves
the measured process mode when herdr drops initial CLI arguments. The original
shared-daemon experiment reused another pane's context; retain its history and
any session lock instead of automatically forking or starting a replacement
conversation. See the report for the completed cold-restore observations.

Always use `spike start-server` for cold startup, so the task-owned config and
launcher PATH are loaded. It refuses an already running legacy root that lacks
the calibrated setup files. Keep that root inspectable; prepare a new root for
the three-harness recipe instead of silently restarting or rewriting its fleet.
Launch may return a readiness failure while leaving a real pane at a native
dialog. Inspect it; do not repeat Launch. The `<profile>.launch.json` file
retains the requested name, cwd, and any returned pane id. A timeout means an
unknown outcome, not permission to retry. Observe the namespace first.

To open the namespace interactively, use a separate terminal:

```bash
SPIKE_SESSION=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["session"])' "$SPIKE_ROOT/spike.json")
env -u HERDR_SOCKET_PATH -u HERDR_PANE_ID -u HERDR_TAB_ID -u HERDR_WORKSPACE_ID herdr --session "$SPIKE_SESSION"
```

Inspect trust, login, and MCP dialogs there. The script sends no approval keys.
Owner approval, when needed, is a separate native interaction to record. Do not
send prompts until `agent get` reports interactive readiness and the visible
screen agrees. Reads and observations do not intentionally change focus.

The wrapper rejects global `--session`, `--machine`, and `--remote` selectors
before the native `--` separator. Harness arguments after `agent start ... --`
are passed through, including OpenCode's native `--session` resume argument.

## Message exercises

Start with one explicit `send` header and synthetic sample work:

```bash
spike herdr agent prompt opencode-a 'operation=send id=m01 from=owner. Identify the loaded profile and drovr skill sentinels. Call the spike_sentinel MCP tool. Read api/AGENTS.md, report its sentinel, and append one sample line to api/sample.txt. Finish with drovr reply m01 containing those observations.'
spike herdr agent get opencode-a
spike herdr agent read opencode-a --source visible --lines 80
cat "$SPIKE_ROOT/runs/opencode-a/results.jsonl"
```

Expected observations are profile/skill/MCP sentinel `opencode-a`, repository
sentinel `api-A`, the sample edit, and a recorded reply with target `m01`.
Observe permission questions separately from a successful edit. A missing row
stays missing; never manufacture a reply from terminal text.

On this hub the calibrated Codex recorder command is
`/root/github/drovr/tools/spike/stub/drovr`. After launching/trusting `codex-a`,
whose generated marker points to its own results file, one explicit sample is:

```bash
spike herdr agent prompt codex-a "operation=send id=absolute-recorder from=owner. Use the drovr skill. Keep cwd at $SPIKE_ROOT/runs/codex-a and run /root/github/drovr/tools/spike/stub/drovr reply absolute-recorder 'sample result'."
```

The generated skill names the absolute path for this checkout. Record a
filtered environment separately from a successful absolute-path call.

Repeat that prompt **one at a time** with ids `m02` through `m10`, replacing
both occurrences of the id. Before each submission, inspect readiness and the
previous result. Record ten requested ids versus the actual calls; do not
automatically resend a case that times out or omits a reply. Repeat the ten
cases for each harness under its own profile/results file.

Then submit these separately, observing readiness between cases:

```bash
spike herdr agent prompt opencode-a 'operation=send id=duplicate from=owner. Run drovr reply duplicate "sample duplicate" --request-id duplicate-key twice.'
spike herdr agent prompt opencode-a 'operation=send id=omitted from=owner. This is the omitted-reply test: say sample done on screen and do not call drovr.'
spike herdr agent prompt opencode-a 'operation=send id=quiet from=owner. Finish only by running drovr reply quiet --quiet with no body.'
spike herdr agent prompt opencode-a 'operation=reply id=terminal from=owner. This reply is terminal. Read it; do not reply automatically or start a new send.'
```

The recorder intentionally retains two distinct duplicate-call rows. It does
not implement deduplication or wake scheduling. Omission/terminal cases should
have no corresponding calls, while quiet should have an empty-text quiet row.
Use the visible screen only for native behavior, never for routing.

## Deliberately lose an acknowledgment

Use an **unlaunched** prepared profile for the lost-start case. This request
retains the initial launch intent and returned pane id, sends one native start
request, and disconnects before reading its response:

```bash
spike launch opencode-b --lose-ack
spike observe
spike herdr agent list
spike herdr agent get opencode-b
spike herdr agent read opencode-b --source visible --lines 80
```

An unavailable agent name is a result to inspect against the saved pane and
snapshot; it is not permission to create another pane. Native dialogs still
require the owner. Do not rerun Launch or remove the launch record.

Once `opencode-a` is visibly ready with an empty composer, send one synthetic
prompt while deliberately discarding its acknowledgment:

```bash
spike lost-prompt opencode-a 'operation=send id=lostack from=owner. Use the drovr skill and reply to lostack with only LOST_ACK_SAMPLE.'
spike observe
spike herdr agent read opencode-a --source visible --lines 80
cat "$SPIKE_ROOT/runs/opencode-a/results.jsonl"
```

Both commands print an `Outcome unknown` message and retain a `lost-*.json`
request record. The printed message describes what the caller knows, not what
the native process did. Observe state and any exact explicit reply without
resending. If the prompt later disappears from the bounded screen, that absence
still proves no non-delivery. Retain the same request record through any
subsequent native reset or cold-restore observation.

## Remaining native matrix

Use the report's matrix to retain expected versus observed results for both
profiles, with private evidence paths. The same `spike herdr ...` wrapper can
run native `pane`, `agent`, `workspace`, `api`, and namespace-local `server`
commands. Check installed `--help` for exact arguments before a new operation.

- Ask for an edit in the printed non-Git extra directory. Exercise worktree
  edits and Git metadata writes separately; a successful edit does not prove
  that `git add` or a commit is permitted.
- Record the actual cwd, native config/session homes, credential source by
  location/type only, inherited global behavior, generated-file mutations,
  and environment **presence** from the launched pane. Never dump values.
- Record fresh trust/MCP dialogs and any owner-approved key sequence. Exercise
  the chosen interrupt key while working, idle, holding a draft, and in a
  dialog. Test Ctrl+C as a negative case only in a disposable pane.
- Leave a sample draft in the composer, then request one prompt; retain whether
  it appends, submits the draft, or leaves it. Do not add a clearing workaround.
- Exercise native `/clear` or `/new`, pane move, detach/reattach, and cold
  restore. Retain name/public pane id/cwd/session identity before and after.
  Stop/restart only this isolated server; never the owner's default server.
- Exercise lost prompt and launch acknowledgments with the recorded native
  command. Retain the request before interrupting the caller, then observe
  without replaying it. Screen absence does not establish non-delivery.
- Compare snapshot sequence/output observations on one runtime, then across
  an observation gap or cold restore. Unsupported subscriptions stay unsupported.
- Measure native tool-call timeout behavior, and record missing/invalid resume
  behavior using only a disposable saved session id. Keep the original session
  and its evidence; do not delete native history to manufacture a missing case.

## Cold restore on the isolated server

Once all three profiles have real native sessions, retain their current name,
pane id, cwd, and native session reference. Then explicitly stop **only this
experiment's server** and restart through the calibrated entrypoint:

```bash
spike observe
spike herdr agent list
spike herdr server stop
spike start-server
spike observe
spike herdr agent get claude-a
spike herdr agent get codex-a
spike herdr agent get opencode-a
```

Compare each restored binding with the retained baseline and inspect the native
screen. For Codex, submit a new synthetic recorder case after restore and check
the actual row's `profile`, `pane_id`, target, and result in that profile's file;
a successful native resume alone does not prove correct tool attribution.
Use a new case id, and never replay an earlier uncertain delivery. An absent
session reference, picker, native error, or changed binding remains a recovery
case rather than a reason to launch another pane automatically.

## Instruction changes and native resume

Do not rewrite generated instructions/config/skills while a native TUI is
running. First exit it through its normal native UI, then confirm in `agent
list` and `pane process-info --pane <saved-pane>` that the saved pane is back at an
available shell. Record the session id before exit. Read the pane id retained
by the initial launch (refresh it from the observed state if the pane moved):

```bash
SPIKE_PANE=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["pane"])' "$SPIKE_ROOT/opencode-a.launch.json")
spike herdr pane process-info --pane "$SPIKE_PANE"
```

After confirmed exit, edit that profile's instruction sentinel, then launch on
the same available shell with the saved name and explicit native resume args:

```bash
# Set SPIKE_NATIVE_SESSION to the exact session id observed before native exit.
spike herdr agent start opencode-a --kind opencode --pane "$SPIKE_PANE" -- --session "$SPIKE_NATIVE_SESSION"
```

For Claude use `-- --resume "$SPIKE_NATIVE_SESSION"`; for Codex use
`-- resume "$SPIKE_NATIVE_SESSION"`, with the corresponding kind/name/pane.
Do not add another `--no-daemon`: the namespace-local Codex launcher supplies it
on fresh starts and resumes. Keep saved conversations and any existing native
session locks intact; do not silently fork or replace a session that cannot resume.
Ask for the loaded sentinel and record the result; the edited file alone
proves no reload. A fresh comparison on the same exited shell omits native
resume arguments, or use a newly prepared root for an independently fresh
layout. The driver's `launch` guard covers the initial launch only; these
manual native starts require observation and must not be replayed blindly.

Keep raw `commands.jsonl`, native screens, session ids, and sample results
private. Summarize redacted observations and failures in the report. Owner
feedback on setup, trust, interrupts, and fresh/resumed instruction behavior is
still required before goal 01 can be marked complete.
