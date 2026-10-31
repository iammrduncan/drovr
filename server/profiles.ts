import { randomBytes } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type Fields = { name: string; instructions: string; model: string };
// `preview` is the start of the latest reply, for the sidebar.
export type Profile = Fields & { id: string; sessionId: string | null; preview?: string };

export const dataDir = process.env.FXBOT_DATA ?? "data";
const dir = join(dataDir, "profiles");
mkdirSync(dir, { recursive: true });

const file = (id: string) => join(dir, `${id}.json`);
export const isId = (id: string) => /^[0-9a-f]{12}$/.test(id);

// Sync calls on purpose: a read-modify-write never interleaves with another request.
function read(path: string) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

// Written to a temporary file and renamed, so a crash never leaves half a file.
function write<T>(path: string, value: T): T {
  writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2) + "\n");
  renameSync(`${path}.tmp`, path);
  return value;
}

export const get = (id: string): Profile | null => read(file(id));

export function list(): Profile[] {
  return readdirSync(dir)
    .filter((name) => isId(name.replace(/\.json$/, "")))
    .map((name) => get(name.slice(0, 12))!)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const save = (profile: Profile) => write(file(profile.id), profile);

export const create = (fields: Fields) => save({ id: randomBytes(6).toString("hex"), ...fields, sessionId: null });

export const remove = (id: string) => rmSync(file(id));

// App settings, one file beside the profiles. A bot with no model of its own uses `defaultModel`.
export type Settings = { defaultModel: string };
const settingsFile = join(dataDir, "settings.json");
export const getSettings = (): Settings => ({ defaultModel: "", ...read(settingsFile) });
export const saveSettings = (settings: Settings) => write(settingsFile, settings);
