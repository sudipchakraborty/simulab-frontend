import type { ThemeId } from "../themes";
export interface Session {
  user: { id: string; email: string; role: string; verified: boolean } | null;
  subscription: { mode: string; expiresAt: number } | null;
  permissions: readonly string[];
  preferences: { theme: ThemeId };
  csrfToken: string;
}
/** @brief Derive UI capabilities from current server authority and network state. */
export function entitlements(session: Session | null, online = true) {
  const user = session?.user,
    permissions = session?.permissions ?? [];
  const active =
    !!user?.verified &&
    !!session?.subscription &&
    session.subscription.mode !== "expired" &&
    session.subscription.expiresAt > Date.now();
  const editor = user?.role === "admin" || user?.role === "editor";
  return {
    canSave:
      online &&
      active &&
      session?.subscription?.mode === "paid" &&
      permissions.includes("projects.write"),
    canEdit: active && editor,
    canRun:
      active &&
      (permissions.length === 0 || permissions.includes("simulation.run")),
    canUpload:
      online && active && editor && permissions.includes("hardware.upload"),
  };
}
/** @brief Cookie-authenticated JSON transport; callers supply server CSRF proof. */
export async function request<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {},
  csrf = "",
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const response = await fetcher(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
      ...options.headers,
    },
  });
  const value = await response.json();
  if (!response.ok)
    throw new Error(value.error || `Request failed (${response.status})`);
  return value as T;
}
