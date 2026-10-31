# 08 — Minimal phone and desktop PWA

**Show me — planned slice**

Component labels below illustrate boundaries; they are not implemented component names.

**Five views share one request path; the service owns decisions.**

```text
PWA shell (phone + desktop; native controls)
├── Attention       approvals, dialogs, Retry/Cancel, review/working cards
├── Agents          every hub pane; only profiles are message/launch targets
├── Pane            drovr exchange + labeled screen + real terminal viewer
│   └── Ordinary pane → observation only
├── Profiles        Name + Harness, raw editor, applied preview, session state
├── Messages        roots/pair filter, replies, admission, attempt history
├── Shared composer → profile target chip + retained action key
└── Shared request/refresh helper → private owner API
    └── Service owns admission, limits, readiness, recovery, and card status
```

**Saving a profile and loading its new context are different interactions.**

```mermaid
sequenceDiagram
    participant Owner
    participant UI as Profiles view
    participant API as Owner API
    participant Runtime as Native TUI via herdr
    Owner->>UI: Edit instruction and Save
    UI->>API: Save file with previous content token
    API->>API: Check token and validate candidate
    API-->>UI: Saved; pending changes
    Note over UI,Runtime: Applied files and running context remain unchanged
    Owner->>Runtime: End native TUI after pausing automation
    Owner->>UI: Launch fresh with saved changes
    UI->>API: Explicit fresh Launch
    API->>Runtime: Apply while exited, then start fresh
    API-->>UI: Updated applied/runtime state; pause remains
```

**The composer makes identity and retries visible.**

```text
Target chip: @reviewer
  "@builder inspect this" → select builder as the target
  "Ask @builder later"   → keep reviewer; later mention is plain text
  ordinary pane          → cannot become a message target

Submit action with key K → keep K while its response is unresolved
Transport retry          → resend K and identical input
Result                   → one durable message; inspect its real history
```

**Offline is an explicit read-only state, not a hidden action queue.**

```text
on disconnect
  mark last-loaded data stale
  disable send, Stop, Retry, approvals, and other mutations
  do not queue those actions for reconnection

on reconnect
  refresh through the shared path before enabling current actions
  recheck cards through the service when an action is submitted

static-shell cache → app assets only
never cache       → tokens, API responses, terminal data, queued mutations
```

**Observable checkpoint: use the same real fleet on a phone and desktop.**

```text
Pair → browse all five views → open an ordinary observation-only pane
Keyboard → labeled forms, visible focus, reachable actions, understandable errors
Send to a profile → watch its actual pane → read the explicit reply
Resolve an off-list card → Stop/Resume → inspect resulting history
Save an instruction → compare saved / applied / live state
Disconnect → stale view + disabled mutations → reconnect without replay
Feedback → fix the awkward screen or action and repeat that interaction
```

Status: planned. Depends on: [07 — Private owner API](goal-07.md).

## Outcome

The owner can see what needs an answer, message profiles, resolve delivery uncertainty, and edit profile files from a phone or desktop. Build the five views in [Attention and the PWA](../research/plan-final.md#attention-and-the-pwa); keep them thin views over the service.

## Bounded work

- Build static HTML/CSS/TypeScript with Vite in the root npm package. Use small shared rendering/request helpers and native form controls. Simple navigation is enough; no client application framework or global state store is required.
- Make forms and actions keyboard-operable with programmatic labels, visible focus, associated validation errors, and meaningful status text/announcements. Do not convey state by color alone or trap focus in the terminal viewer. Use native semantics and small targeted attributes rather than an accessibility framework.
- Add an installable app manifest and a minimal static-shell cache. Cache no tokens, API responses, terminal content, or queued mutations. Refresh through one bounded polling path and on owner actions; do not add a second event protocol for the UI.
- Implement the views below. Keep one shared composer and one shared owner-action request path. Generate and retain a request key for each submitted action, reusing it on a transport retry rather than creating a second message.
- Render message bodies as text. Display the screen as a labeled screen excerpt. Use an existing terminal renderer for the hub observation stream; do not write a VT parser or simulate transcript chat.
- Support empty, loading, error, service-offline, and herdr-down states. Mark last-loaded data stale and disable mutating controls until connectivity is re-established. Never replay offline Stop, send, retry, or approval actions.

## Five views, one small surface

| View | MVP content and actions |
| --- | --- |
| Attention | Needs you, Ready for review, Working; counts, dismiss, off-list approval, current dialog keys, and uncertain-delivery Retry or Cancel |
| Agents | Every hub pane, a profile badge, native status, and pane view; only profiles are message targets or launch targets |
| Pane | Profile's drovr exchange, labeled bounded screen, hub terminal viewer, shared composer, and Stop; ordinary panes have observation only |
| Profiles | Name + Harness creation, saved files, applied-file preview, session state, allow list, launch/Stop/Resume; one raw editor |
| Messages | Threads by root and a pair filter; from/to, depth, reply link, admission, attempts, and reply action |

The composer uses a profile target chip. Only a leading `@name` can change that chip; a mention later in the text remains text. Implement the message and recovery details from [contracts.md](contracts.md), including quiet replies and owner-only cancellation.

Follow the [profile design](profiles.md): the creation form takes name and harness only, then opens the raw definition editor. Show saved definition, applied native files, and live session separately; mark pending edits without implying they were loaded. The raw editor selects a supported relative path and shows plain text with Save and validation errors. It can create a supported config file through the same API restriction. Preview uses the service renderer. No tree editor, drag-and-drop skills, schema-generated forms, syntax-editor dependency, profile rename/delete workflow, or configuration history UI. Saving config must say that a running profile retains its applied files; after native exit, the owner can explicitly launch fresh with saved changes.

## Explicit cuts

No harness transcript readers, rich chat reconstruction, editable terminal emulator, native mobile app, push, voice, room UI, remote agents, arbitrary pane messaging, structured MCP/permission designer, or trigger wizard. The service remains the only place that decides admission, limits, readiness, recovery, and card status. [09 — Triggers](goal-09.md) adds quiet/choices/brief behavior and check-error cards using these existing views.

## Done when

- [ ] The complete owner path works at phone and desktop widths: pair, open a profile, send, see the reply, answer an off-list card, Stop, and Resume.
- [ ] A keyboard walkthrough can pair, navigate views, compose, approve, and save profile text with labeled controls and visible, predictable focus. Validation is associated with its input, important status changes are exposed accessibly, and the terminal viewer permits leaving focus normally.
- [ ] Ordinary panes are visible and viewable but cannot be selected by the composer or sent a message through another view.
- [ ] `@name` at the start selects that profile; `@name` later in a prompt, an email address, or code containing `@` does not reroute it.
- [ ] A lost response retried with the same action key creates no second durable message. Retry and Cancel on an uncertain attempt use the explicit owner operations and show the preserved attempt history.
- [ ] Dismissing a card does not move the native client's focus. Changed dialog/runtime cards cannot submit a stale key, and an unknown dialog offers observation rather than guessed buttons.
- [ ] Editing a valid profile file saves it; an invalid file shows an error; the live applied instructions remain unchanged. Traversal errors do not expose files outside the profile.
- [ ] Name + Harness creates one saved-only profile, Preview shows its real generated files, and saved/applied/live states remain distinct through save, pause, native exit, and fresh launch.
- [ ] Empty/offline/herdr-down screens are usable. Disconnecting after choosing an action does not leave a hidden operation scheduled for reconnection.
- [ ] Browser tests cover these behaviors and hostile message text without asserting every DOM node or taking a large screenshot suite. One phone-width and one desktop-width manual inspection confirm usable forms and terminal access.
- [ ] The final hands-on checkpoint has been tried by the owner and revised for feedback before this goal is marked complete.

## Handoff

The existing views must accept trigger reports, choices, check errors, and the daily brief from [09 — Triggers](goal-09.md) without creating new pages or a task subsystem. Add UI behavior only when its real service data exists. Follow the release checklist in the [plan index](README.md) for the final end-to-end proof.

## Try it and give feedback

**You get:** the actual private PWA URL, pairing instructions, and the sample fleet from goal 06. At delivery, provide the runnable start command and URL; do not hand over screenshots as the only artifact.

1. Open and pair the app on a phone and a desktop browser. On desktop, use the keyboard to navigate the five views and representative forms/actions; check labels, visible focus, and understandable validation/status messages. Open an ordinary pane and confirm it is viewable but cannot be a message target or trap keyboard focus.
2. Send a request to a profile with the target chip, observe its real pane and reply, then try text containing a non-leading `@reviewer`. The target must stay where you selected it.
3. Use the supplied off-list sample to Allow once, then Stop and Resume its target. Inspect the resulting message/attempt history rather than relying only on a toast.
4. Change a sample profile instruction in the raw editor. Confirm the saved configuration changes while the running applied instruction remains unchanged and the required restart is clear.
5. Disconnect the browser, inspect the stale/offline state, try a disabled mutation, and reconnect. No hidden message, Stop, or approval may run after reconnection.

**Expected:** these are usable forms and real fleet actions at both screen sizes. You can follow a request from send to reply, identify what needs you, and understand which changes are saved versus applied.

**Feedback:** Which screen or action is awkward on the phone? Can you find what needs an answer and recover a failed action without opening the database? Return that feedback and iterate on these views before adding trigger UI behavior.
