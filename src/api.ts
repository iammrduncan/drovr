import type { Fields, Profile, Settings } from "../server/profiles.ts";

export type { Fields, Profile, Settings };

// Set only for a server started with FXBOT_HOST. It is one shared secret, not an account.
const token = import.meta.env.VITE_FXBOT_TOKEN;
export const auth: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};

export const unreachable = "Cannot reach the server.";

export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { ...auth, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(unreachable);
  }
  // A body that is not JSON comes from a proxy in front of a stopped server.
  const data = await res.json().catch(() => null);
  if (!res.ok || data === null) throw new Error(data?.error ?? unreachable);
  return data;
}
