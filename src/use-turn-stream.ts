import { useEffect, useState } from "react";
import { auth } from "./api.ts";

export type Turn = { messageId: string; text: string; reply: string; reasoning?: string; done: boolean; note?: string; unsent?: boolean };

type Line = {
  type: string;
  messageId?: string;
  input?: string;
  delta?: string;
  stopReason?: string;
  error?: { message: string };
  cursor?: number;
  epoch?: number;
};

// Folds one stream line into the thread. Lines without a messageId, such as `idle`, and
// tool lines are not shown in v1.
function apply(turns: Turn[], line: Line): Turn[] {
  const { messageId } = line;
  if (!messageId) return turns;
  const i = turns.findLastIndex((turn) => turn.messageId === messageId);
  const turn = turns[i] ?? { messageId, text: "", reply: "", done: false };
  if (line.type === "turn_start" || line.type === "turn_resume") {
    // Turns show in the order they start, so a message sent during the replay lands after it.
    // A turn that runs again after a crash sends its reply again from the start.
    const started = { ...turn, text: line.input ?? turn.text, reply: "", reasoning: undefined, done: false, note: undefined, unsent: undefined };
    return [...(i < 0 ? turns : turns.toSpliced(i, 1)), started];
  }
  let next: Turn;
  if (line.type === "text_delta") {
    next = { ...turn, reply: turn.reply + line.delta };
  } else if (line.type === "reasoning_delta") {
    next = { ...turn, reasoning: (turn.reasoning ?? "") + line.delta };
  } else if (line.type === "turn_end") {
    const note = line.error ? `Error: ${line.error.message}` : line.stopReason === "end_turn" ? undefined : `Stopped: ${line.stopReason}`;
    next = { ...turn, done: true, note };
  } else return turns;
  return i < 0 ? [...turns, next] : turns.with(i, next);
}

// Reads a profile's NDJSON stream from the start, then follows it. After a dropped
// connection it asks again from the last cursor it read.
export function useTurnStream(profileId: string, live: boolean) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    if (!live) return;
    const abort = new AbortController();
    let cursor = 0;
    let epoch = 0;
    (async () => {
      while (!abort.signal.aborted) {
        try {
          const res = await fetch(`/api/profiles/${profileId}/stream?cursor=${cursor}`, { headers: auth, signal: abort.signal });
          if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
          setConnected(true);
          const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
          let rest = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            const parts = (rest + value).split("\n");
            rest = parts.pop()!;
            const lines: Line[] = [];
            for (const part of parts.filter(Boolean)) {
              const line: Line = JSON.parse(part);
              cursor = line.cursor ?? cursor;
              // libfx's rule: hide a line whose epoch is lower than one before it.
              if (line.epoch !== undefined && line.epoch < epoch) continue;
              epoch = line.epoch ?? epoch;
              lines.push(line);
            }
            if (lines.length) setTurns((turns) => lines.reduce(apply, turns));
          }
        } catch {}
        if (abort.signal.aborted) return;
        setConnected(false);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    })();
    return () => abort.abort();
  }, [profileId, live]);

  return { turns, setTurns, connected };
}
