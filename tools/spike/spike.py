#!/usr/bin/env python3
"""Disposable goal-01 experiments; not the drovr service. Python 3.11+, Git, herdr."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import socket
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
KINDS = ("claude", "codex", "opencode")


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def run(args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True,
                          timeout=40, **kwargs).stdout


def env():
    # Never inherit the owner's socket, pane, or session selection.
    return {k: v for k, v in os.environ.items() if not k.startswith("HERDR_")}


def ctl(root, args, timeout=40):
    meta = json.loads((root / "spike.json").read_text())
    # Only explicit fixture commands are retained. No environment dump.
    evidence = root / "commands.jsonl"
    if evidence.exists() and evidence.stat().st_size > 8 * 1024 * 1024:
        raise SystemExit("Evidence reached 8 MiB; retain it and prepare a new experiment root")
    request = time.time_ns()
    def record(**fields):
        with evidence.open("a") as out:
            out.write(json.dumps({"at": time.time(), "request": request, **fields}) + "\n")
    record(state="requested", args=args)
    try:
        result = subprocess.run(["herdr", "--session", meta["session"], *args],
                                env=env(), text=True, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        record(state="outcome_unknown")
        raise
    record(state="returned", exit=result.returncode, stdout=result.stdout, stderr=result.stderr)
    print(result.stdout or result.stderr, end="")
    if result.returncode:
        raise SystemExit(result.returncode)
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return result.stdout  # read commands return plain terminal text on 0.9.3


def prepare(root):
    root.mkdir(parents=True, exist_ok=False, mode=0o700)
    session = "drovr-g01-" + hashlib.sha256(str(root).encode()).hexdigest()[:10]
    write(root / "spike.json", json.dumps({"session": session}, indent=2) + "\n")
    versions = {}
    for kind in ("herdr", *KINDS):
        executable = shutil.which(kind)
        if not executable and kind == "opencode":
            candidate = Path.home() / ".opencode/bin/opencode"
            executable = str(candidate) if candidate.is_file() else None
        versions[kind] = {"path": executable,
                          "version": run([executable, "--version"]).strip() if executable else None}
    write(root / "versions.json", json.dumps(versions, indent=2) + "\n")
    write(root / "schema.json", run(["herdr", "api", "schema", "--json"]))
    # Seed is disposable too; never register worktrees against the owner's repository.
    seed = root / "seed"
    seed.mkdir()
    run(["git", "init", "-b", "main", str(seed)])
    write(seed / "AGENTS.md", (HERE / "examples/repository-AGENTS.md").read_text())
    write(seed / "sample.txt", "spike sample\n")
    run(["git", "-C", str(seed), "add", "."])
    run(["git", "-C", str(seed), "-c", "user.name=Spike", "-c",
         "user.email=spike@example.invalid", "commit", "-m", "Disposable spike input"])
    for kind in KINDS:
        for label in ("A", "B"):
            name = f"{kind}-{label.lower()}"
            folder = root / "runs" / name
            extra = root / "extra" / name
            folder.mkdir(parents=True)
            extra.mkdir(parents=True)
            write(folder / ".drovr-spike.json", json.dumps({"profile": name,
                  "results": str(folder / "results.jsonl")}) + "\n")
            write(extra / "sample.txt", "extra directory sample\n")
            run(["git", "-C", str(seed), "worktree", "add", "-b", name,
                 str(folder / "api"), "main"])
            instructions = (HERE / "examples/AGENTS.md").read_text().replace(
                "PROFILE_SENTINEL=reviewer-A", f"PROFILE_SENTINEL={name}")
            instructions += f"\nNon-git extra workspace: {extra}\n"
            write(folder / ("CLAUDE.md" if kind == "claude" else "AGENTS.md"), instructions)
            skills = {"claude": ".claude", "codex": ".agents", "opencode": ".opencode"}[kind]
            shutil.copytree(HERE / "examples/skills", folder / skills / "skills")
            skill_path = folder / skills / "skills/drovr/SKILL.md"
            skill = skill_path.read_text().replace("SKILL_SENTINEL=drovr-A", f"SKILL_SENTINEL={name}")
            skill += "\nFor this fixture, invoke the recorder by its absolute path: " + str(HERE / "stub/drovr") + ".\n"
            write(skill_path, skill)
            mcp_args = [str(HERE / "stub/mcp.py"), "--sentinel", f"MCP_SENTINEL={name}"]
            if kind == "claude":
                write(folder / ".mcp.json", json.dumps({"mcpServers": {"spike": {
                    "command": sys.executable, "args": mcp_args}}}, indent=2))
                write(folder / ".claude/settings.json", json.dumps({"permissions": {
                    "defaultMode": "acceptEdits", "additionalDirectories": [str(extra), str(seed)],
                    "allow": ["Bash(drovr *)", f"Bash({HERE / 'stub/drovr'} *)",
                              "mcp__spike__spike_sentinel"]}}, indent=2))
            elif kind == "codex":
                write(folder / ".codex/config.toml", '\n'.join([
                    'sandbox_mode = "workspace-write"', 'approval_policy = "on-request"',
                    '[sandbox_workspace_write]', f'writable_roots = {json.dumps([str(extra), str(seed)])}',
                    '[mcp_servers.spike]', f'command = {json.dumps(sys.executable)}',
                    f'args = {json.dumps(mcp_args)}', '']))
            else:
                rules = [{"action": "shell", "resource": "*", "effect": "ask"},
                         {"action": "external_directory", "resource": "*", "effect": "ask"}]
                for directory in (extra, seed, HERE / "stub"):
                    rules.append({"action": "external_directory", "resource": str(directory) + "/*", "effect": "allow"})
                for command in ("drovr *", str(HERE / "stub/drovr") + " *",
                                "git status *", "git diff *", "git -C api status *"):
                    rules.append({"action": "shell", "resource": command, "effect": "allow"})
                write(folder / "opencode.json", json.dumps({"mcp": {"servers": {"spike": {
                    "type": "local", "command": [sys.executable, *mcp_args]}}},
                    "permissions": rules}, indent=2))
    print(f"Namespace: {session}\nInputs/workspaces/evidence: {root}\nReport: docs/spike.md")
    print(f"Attach after launch: herdr --session {session}")


def start_server(root):
    status = ctl(root, ["status", "--json"])
    meta = json.loads((root / "spike.json").read_text())
    meta["socket"] = status["server"]["socket"]
    write(root / "spike.json", json.dumps(meta, indent=2) + "\n")
    if status["server"]["running"]:
        if not (root / "herdr.toml").is_file() or not (root / "bin/spike-shell").is_file():
            raise SystemExit("Running namespace predates calibrated shell setup. Inspect it, then explicitly stop only this test server and run start-server; no automatic restart.")
        return
    server_env = env()
    versions = json.loads((root / "versions.json").read_text())
    native_dirs = dict.fromkeys(str(Path(v["path"]).parent) for v in versions.values() if v["path"])
    # Herdr's native resume drops initial CLI flags. Keep the required Codex
    # process mode on its normal executable lookup, including resume.
    codex = versions["codex"]["path"]
    if codex:
        launcher = root / "bin/codex"
        write(launcher, "#!/bin/sh\nexec " + shlex.quote(str(Path(codex).resolve())) + ' --no-daemon "$@"\n')
        launcher.chmod(0o700)
    # This spike targets the observed Debian/Bash hub only. Its normal bashrc
    # prepends user bins, so prepend the fixture launcher AFTER sourcing it.
    shell_rc = root / "shell.rc"
    write(shell_rc, "if [ -f " + shlex.quote(str(Path.home() / ".bashrc")) + " ]; then . " +
          shlex.quote(str(Path.home() / ".bashrc")) + "; fi\nexport PATH=" +
          shlex.quote(str(root / "bin")) + ':"$PATH"\n')
    shell = root / "bin/spike-shell"
    write(shell, "#!/bin/sh\nexec /bin/bash --noprofile --rcfile " + shlex.quote(str(shell_rc)) + " -i\n")
    shell.chmod(0o700)
    write(root / "herdr.toml", '[terminal]\ndefault_shell = ' + json.dumps(str(shell)) + '\nshell_mode = "non_login"\n')
    server_env["HERDR_CONFIG_PATH"] = str(root / "herdr.toml")
    server_env["PATH"] = ":".join([str(root / "bin"), *native_dirs, server_env["PATH"]])
    server_env["DROVR_SPIKE_SERVER_MARKER"] = "present"
    with (root / "server.log").open("ab") as log:
        process = subprocess.Popen(["herdr", "--session", meta["session"], "server"],
                                   env=server_env, stdout=log, stderr=log, start_new_session=True)
    write(root / "server.pid", str(process.pid) + "\n")
    for _ in range(30):
        time.sleep(.1)
        if process.poll() is not None:
            raise SystemExit("Isolated server exited; inspect server.log")
        status = subprocess.run(["herdr", "--session", meta["session"], "status", "--json"],
                                env=env(), text=True, capture_output=True, timeout=5)
        if status.returncode == 0 and json.loads(status.stdout)["server"]["running"]:
            return
    raise SystemExit("Server readiness uncertain; inspect status before any retry")


def socket_probe(root):
    """Read-only platform check; no mailbox, routing, native keys, or file writes."""
    meta = json.loads((root / "spike.json").read_text())
    endpoint = meta.get("socket")
    if not isinstance(endpoint, str) or not Path(endpoint).is_absolute():
        raise SystemExit("Run start-server first to retain the verified socket path")
    stage = "socket"
    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
            client.settimeout(2)
            stage = "connect"
            client.connect(endpoint)
            stage = "ping"
            client.sendall(b'{"id":"spike-socket-probe","method":"ping","params":{}}\n')
            line = client.makefile("rb").readline(4097)
            if len(line) > 4096:
                raise ValueError("response exceeds probe bound")
            response = json.loads(line)
            success = response.get("id") == "spike-socket-probe" and "result" in response
        print(json.dumps({"success": success, "stage": stage}))
        return 0 if success else 1
    except (OSError, ValueError) as error:
        print(json.dumps({"success": False, "stage": stage, "exception_type": type(error).__name__,
                          "errno": getattr(error, "errno", None)}))
        return 1


def drop_response(root, method, params):
    """Write one request then disconnect before reading its acknowledgment."""
    status = ctl(root, ["status", "--json"])
    request_id = "lost-" + str(time.time_ns())
    request = {"id": request_id, "method": method, "params": params}
    record = root / f"{request_id}.json"
    write(record, json.dumps({"state": "prepared", "request": request}, indent=2))
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
        client.settimeout(5)
        client.connect(status["server"]["socket"])
        client.sendall((json.dumps(request) + "\n").encode())
        # No read: the caller cannot classify the native outcome.
    write(record, json.dumps({"state": "acknowledgment_discarded", "request": request}, indent=2))
    print(f"Outcome unknown. Retained {record}; observe without replaying.")


def launch(root, name, lose_ack=False):
    # Commit this record before creating a pane or requesting a native launch.
    # An interrupted call requires observation, never an automatic second start.
    record = root / f"{name}.launch.json"
    if record.exists():
        raise SystemExit("Launch already requested. Inspect agent list/snapshot; do not replay.")
    start_server(root)
    folder = root / "runs" / name
    kind = name.rsplit("-", 1)[0]
    versions = json.loads((root / "versions.json").read_text())
    executable = versions[kind]["path"]
    if not executable:
        raise SystemExit(f"Missing {kind}; record the blocker")
    write(record, json.dumps({"state": "requested", "name": name, "cwd": str(folder)}))
    path = ":".join([str(HERE / "stub"), str(root / "bin"), str(Path(executable).parent), os.environ["PATH"]])
    workspace = ctl(root, ["workspace", "create", "--cwd", str(folder), "--label", name,
                           "--env", f"PATH={path}", "--env", f"DROVR_SPIKE_RESULTS={folder}/results.jsonl",
                           "--env", f"DROVR_SPIKE_PROFILE={name}", "--env", "DROVR_SPIKE_EXPLICIT=present",
                           "--no-focus"])
    pane = workspace["result"]["root_pane"]["pane_id"]
    write(record, json.dumps({"state": "pane_created", "name": name, "cwd": str(folder), "pane": pane}))
    native_args = []  # the namespace-local Codex launcher also covers cold resume
    if lose_ack:
        drop_response(root, "agent.start", {"name": name, "kind": kind, "pane_id": pane,
                                          "timeout_ms": 10000, "args": native_args})
    else:
        ctl(root, ["agent", "start", name, "--kind", kind, "--pane", pane,
                   "--timeout", "10000", "--", *native_args], timeout=15)


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path, help="absolute disposable experiment root")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("prepare")
    launch_parser = commands.add_parser("launch", help="explicit live TUI launch; uses existing login")
    launch_parser.add_argument("profile", choices=[f"{k}-{x}" for k in KINDS for x in ("a", "b")])
    launch_parser.add_argument("--lose-ack", action="store_true", help="disconnect after requesting native start")
    lost = commands.add_parser("lost-prompt", help="submit once, deliberately discard acknowledgment")
    lost.add_argument("profile", choices=[f"{k}-{x}" for k in KINDS for x in ("a", "b")])
    lost.add_argument("text")
    commands.add_parser("observe", help="snapshot only; does not focus or send keys")
    commands.add_parser("start-server", help="start/reuse only this isolated herdr server")
    commands.add_parser("socket-probe", help="read-only bounded ping to the retained test socket")
    native = commands.add_parser("herdr", help="explicit native command in ONLY this namespace")
    native.add_argument("args", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    root = args.root
    if not root.is_absolute() or root.resolve() != root:
        parser.error("--root must be an absolute, canonical path")
    if args.command == "prepare":
        prepare(root)
    else:
        meta = json.loads((root / "spike.json").read_text())
        expected = "drovr-g01-" + hashlib.sha256(str(root).encode()).hexdigest()[:10]
        if meta["session"] != expected:
            parser.error("namespace does not match this disposable root")
        if args.command == "launch":
            launch(root, args.profile, args.lose_ack)
        elif args.command == "lost-prompt":
            drop_response(root, "agent.prompt", {"target": args.profile, "text": args.text})
        elif args.command == "observe":
            ctl(root, ["api", "snapshot"])
        elif args.command == "start-server":
            start_server(root)
        elif args.command == "socket-probe":
            raise SystemExit(socket_probe(root))
        else:
            if not args.args:
                parser.error("supply a native command, e.g. herdr agent list")
            native_end = args.args.index("--") if "--" in args.args else len(args.args)
            if any(value.split("=", 1)[0] in ("--session", "--machine", "--remote",
                                              "--remote-keybindings") for value in args.args[:native_end]):
                parser.error("global target selectors are forbidden in the isolated wrapper")
            if args.args[0].startswith("-") or args.args[0] not in (
                    "agent", "pane", "workspace", "tab", "api", "status", "server"):
                parser.error("use a namespace-local native command; no global selectors")
            ctl(root, args.args, timeout=40)


if __name__ == "__main__":
    try:
        main()
    except subprocess.TimeoutExpired:
        raise SystemExit("Native call timed out: outcome unknown. Observe; never automatically replay.")
