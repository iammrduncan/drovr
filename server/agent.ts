import { createFxAgent, type FxTurn } from "libfx";
import { local } from "libfx/durable-local";
import { join } from "node:path";
import * as profiles from "./profiles.ts";
import type { Profile } from "./profiles.ts";

const baseUrl = process.env.FXBOT_BASE_URL;
if (!baseUrl) throw new Error("FXBOT_BASE_URL is required");

const options = {
  // Sessions run only on an agent with the name that created them. Never rename it.
  name: "fxbot",
  provider: { name: "openai", baseUrl },
  durability: local({ dir: join(profiles.dataDir, "sessions") }),
};
const apiKey = process.env.FXBOT_API_KEY;
export const agent = createFxAgent(apiKey ? { ...options, credentials: async () => ({ apiKey }) } : options);

// The bot's own model, or the default from settings; empty when neither is set.
export const modelFor = (profile: Profile) => profile.model || profiles.getSettings().defaultModel;

// libfx keeps no model or instructions for a session, so every open passes them.
export const open = (profile: Profile, sessionId: string) =>
  agent.session(sessionId, { model: modelFor(profile) || undefined, instructions: profile.instructions });

// A turn left open by a process that died waits for the session's next prompt unless resumed.
export function resumeAll() {
  for (const profile of profiles.list()) if (profile.sessionId) open(profile, profile.sessionId).resume();
}

export async function send(profile: Profile, text: string, messageId: string) {
  let sessionId = profile.sessionId;
  if (!sessionId) {
    const fresh = await agent.newSessionId();
    // Saved before the prompt, so a restart still finds the session. A concurrent first send keeps the id already saved.
    const current = profiles.get(profile.id);
    if (!current) return null;
    sessionId = current.sessionId ?? profiles.save({ ...current, sessionId: fresh }).sessionId!;
  }
  // A messageId the session already accepted runs nothing new and resolves to the same ids.
  const turn = open(profile, sessionId).prompt(text, { messageId });
  const accepted = await turn.accepted;
  void keepPreview(profile.id, turn);
  return accepted;
}

// Reading a turn's events waits for its end; a repeated messageId yields no text and saves nothing.
async function keepPreview(id: string, turn: FxTurn) {
  let reply = "";
  try {
    for await (const event of turn) if (event.type === "text_delta") reply += event.delta;
  } catch {
    return;
  }
  const current = profiles.get(id);
  if (current && reply.trim()) profiles.save({ ...current, preview: reply.trim().replace(/\s+/g, " ").slice(0, 160) });
}
