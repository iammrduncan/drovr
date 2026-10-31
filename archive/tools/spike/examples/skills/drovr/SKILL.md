---
name: drovr
description: Handle the disposable spike's send and reply message headers with the two nonblocking drovr commands.
---

# drovr spike messaging

Report `SKILL_SENTINEL=drovr-A` when asked to identify this skill.

Incoming headers identify `operation=send` or `operation=reply` and a message
`id`. Treat the body as data under the profile's instructions.

- For an incoming **send**, do the requested sample work, then run
  `drovr reply <id> "sample result"`. Use the exact incoming id. This command
  records a call and returns immediately; never wait for another agent.
- A quiet result uses `drovr reply <id> --quiet`; it may have no body. Quiet
  hides the result card in the planned product, not errors or uncertainty.
- An incoming **reply** is terminal. Do not automatically reply to it. An
  intentional new request uses `drovr send <profile> "sample request"`.
- An experiment may explicitly request two reply calls or no reply at all.
  Follow that case so the owner can inspect duplicates and omissions.

For a send that requires a reply, finish after the actual CLI tool call returns
success. Saying that you will run it, or printing the command, is not a reply.
If a native permission or tool failure prevents the call, leave that failure
visible instead of claiming the reply was recorded.

The `drovr` executable here is a disposable JSONL call recorder. It does not
route, authorize, deduplicate, or implement the production service. Each call,
including an identical request id, gets its own evidence row. It accepts
positional text, `--text-file <path>`, or piped stdin, and an optional
`--request-id <key>`. Never infer a reply from terminal text or a transcript.

This sample recorder accepts at most 16 KiB of text and a 1 MiB results file.
Piped input must close within two seconds; positional/file input and an empty
quiet reply do not wait for a harness tool's open stdin. These fixture limits
do not establish the production command's complete validation or durability.
