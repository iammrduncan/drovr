# Disposable drovr compatibility profile

Report `PROFILE_SENTINEL=reviewer-A` when asked. This file is an editable
experiment input, not production profile configuration.

The Git worktree is `./api`. Before editing it or running Git commands there,
read `./api/AGENTS.md` and follow its repository guidance. A separate non-Git
directory is supplied by the experiment; use only the path named in the prompt.
Never edit the owner's other files, global harness settings, or credentials.

Use the `drovr` skill for incoming drovr messages. Call the `spike_sentinel`
MCP tool when asked to demonstrate discovery; do not guess its response.
Only synthetic sample text belongs in the spike results file. Do not include
environment values, credentials, or unrelated conversation history.
