# OpenDuet takeaways for drovr

Notes from reviewing [CopilotKit/OpenDuet](https://github.com/CopilotKit/OpenDuet) on Oct 28, 2026. These are working notes for us. The in-depth review is in `openduet-review.md`.

## What OpenDuet is

OpenDuet is an open-source, self-hosted proactive personal assistant from CopilotKit, built on their OpenBot platform. It reads your mail and calendar, sorts what needs you from what can wait, writes a morning brief, and keeps working on tasks in a container of its own, asking before it sends, pays, signs or deletes anything.

- MIT license. Created Oct 21, 2026, and marked early development.
- Stack: TypeScript, Bun, Hono, the CopilotKit runtime, Postgres with pgvector, and Docker, with one container per bot (Chromium, `/workspace`, a shell).
- It needs a CopilotKit Intelligence cloud project, which stores threads and memory. The server won't start without its key.
- Agents are any endpoint that speaks AG-UI, CopilotKit's agent-to-UI protocol, built with LangGraph, Mastra, CrewAI and the like, or written by hand. Model calls use your own API key.

## Verdict

Borrow ideas from it, but don't build on it or depend on it.

## Why we aren't building on it

| drovr requirement | OpenDuet |
| --- | --- |
| Native interactive harness TUIs in herdr panes, never headless | Agents are headless AG-UI endpoints driven over the API, which is the SDK-loop model we ruled out |
| herdr does the heavy lifting | It has its own server, worker and a container per bot, with no idea of terminal panes |
| Agents @-tag each other through a core router | No agent-to-agent messaging or router. Channels are views onto one user thread |
| As simple as possible, single user, self-contained | Needs Postgres, Docker and a CopilotKit cloud project for memory |
| Coding-agent fleet | A personal assistant for mail, calendar and the web |

## What we're taking

1. **Proactive hub profiles.** Profiles on the hub act on their own, not just when tagged. The drovr router wakes a profile's native TUI pane from:
   - **Schedules:** per-profile cron wakes with a saved prompt, such as a morning brief.
   - **Events:** webhooks (a GitHub PR, issue or CI failure) and local watchers, each turned into a prompt.
   - **Standing goals:** a short goal list per profile and a periodic "anything to do?" check that stays quiet when nothing has changed.
2. **Approval cards.** Actions outside a profile's own workspace, and agent-to-agent messages not on the allow list, pause with **Allow once**, **Always allow** or **Refuse**, plus the rule that asked. Every decision is logged. This turns the advisory allow list into a one-tap approval flow.
3. **Task states.** The PWA's Needs-you feed becomes a Tasks view with **Working**, **Needs input**, **Ready for review** and **Resolved**, mapped from herdr's working, blocked, done and idle states plus drovr's own message state. Each card opens straight to the pane or message it's about.
4. **Daily brief.** An optional morning brief per hub profile or across the fleet, showing what needs you, what finished overnight and what's still running.
5. **One folder per profile.** Each profile is a folder of plain files (instructions or soul, MCP config, skills, schedule, goals), like OpenDuet's tenant folder with its `agents.yaml`, `skills.yaml` and `model.yaml`. It's easy to copy, diff and keep in git.
6. **Tap-to-answer replies.** When an agent asks a question, the PWA shows the likely answers as buttons.

## Later, maybe

- **Channels as lightweight rooms.** A named channel with a purpose and a color that groups related work. This is a possible first step toward the rooms we put off.
- **Checking what leaves.** Scan outgoing messages and webhook posts for secrets before they go out.
- **Voice input** in the PWA composer.

## Not taking

- AG-UI agents, the headless SDK runtime, or any per-bot model API calls.
- The CopilotKit Intelligence cloud dependency. drovr keeps its state in its own SQLite file.
- Postgres, or Docker containers per bot.
- Gmail and calendar triage. That's outside drovr's scope.

## Open questions

- How often should the standing-goal check run, and how do we keep it cheap? One option is a cheap pre-check (git, CI or webhook diff) before waking the pane at all.
- When a scheduled wake fires while the profile is busy, should it wait in the queue like a message, or be skipped if one is already pending?
- Does every approval card go to the PWA, with a push notification, or can some be decided by rules alone?
