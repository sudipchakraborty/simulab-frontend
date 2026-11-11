import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AccountRoot, SubscriptionBanner, useAccount } from "./index";
import { loadSystemConfig, parseSystemConfig } from "./systemConfig";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("requires explicit false, and unavailable/invalid config enables login", async () => {
  expect(parseSystemConfig({ loginEnabled: false }).loginEnabled).toBe(false);
  for (const v of [null, {}, { loginEnabled: "false" }, { loginEnabled: true }])
    expect(parseSystemConfig(v).loginEnabled).toBe(true);
  expect(
    await loadSystemConfig(vi.fn().mockRejectedValue(new Error("offline"))),
  ).toEqual({ loginEnabled: true });
});
it("local mode opens without account calls and enables local saves with isolated identity", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  function Probe() {
    const a = useAccount();
    return (
      <button
        disabled={!a.canSave}
        onClick={() => void a.saveProject("local", {})}
      >
        {a.storageKey}
      </button>
    );
  }
  render(
    <AccountRoot loginEnabled={false}>
      <SubscriptionBanner />
      <Probe />
    </AccountRoot>,
  );
  expect((await screen.findByRole("button")).hasAttribute("disabled")).toBe(
    false,
  );
  expect(screen.getByRole("button").textContent).toBe(
    "simulab.ide.local-workspace",
  );
  expect(screen.getByRole("status").textContent).toContain("Login disabled");
  expect(fetcher).not.toHaveBeenCalled();
});
