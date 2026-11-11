import { describe, expect, it, vi } from "vitest";
import { entitlements, request } from "./api";
const session = {
  user: { id: "a", email: "a@b.c", role: "editor", verified: true },
  subscription: { mode: "trial", expiresAt: Date.now() + 100000 },
  permissions: ["projects.write", "hardware.upload", "simulation.run"],
  preferences: { theme: "midnight" },
  csrfToken: "csrf",
} as const;
describe("account authority", () => {
  it("denies trial saving while allowing editor and simulation", () =>
    expect(entitlements(session)).toMatchObject({
      canSave: false,
      canEdit: true,
      canRun: true,
      canUpload: true,
    }));
  it("denies saving offline and expired permissions", () => {
    expect(
      entitlements(
        {
          ...session,
          subscription: { mode: "paid", expiresAt: Date.now() + 100000 },
        },
        false,
      ).canSave,
    ).toBe(false);
    expect(
      entitlements({
        ...session,
        subscription: { mode: "paid", expiresAt: 1 },
      }),
    ).toMatchObject({
      canSave: false,
      canEdit: false,
      canRun: false,
      canUpload: false,
    });
  });
  it("never grants viewer editing from write permission", () =>
    expect(
      entitlements({ ...session, user: { ...session.user, role: "viewer" } })
        .canEdit,
    ).toBe(false));
  it("sends cookie and csrf without caching credentials", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    await request(
      "/preferences",
      { method: "PUT", body: JSON.stringify({ theme: "pearl" }) },
      "proof",
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledWith(
      "/api/preferences",
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({ "x-csrf-token": "proof" }),
      }),
    );
  });
});
