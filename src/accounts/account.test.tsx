import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountRoot, AccountControls, useAccount } from "./index";
const signed = {
  user: {
    id: "one",
    email: "one@example.test",
    role: "editor",
    verified: true,
  },
  subscription: { mode: "paid", expiresAt: Date.now() + 100000 },
  permissions: ["projects.write", "simulation.run", "hardware.upload"],
  preferences: { theme: "midnight" },
  csrfToken: "csrf",
};
function Studio() {
  const a = useAccount();
  return (
    <>
      <p>Private studio {a.user?.email}</p>
      <p>{a.canSave ? "Saving enabled" : "Saving disabled"}</p>
      <AccountControls />
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
  history.replaceState(null, "", "/");
});
describe("secure account boundary", () => {
  it("gates anonymous users and signs in only after csrf preflight", async () => {
    const calls: string[] = [];
    let logged = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path: string, options?: RequestInit) => {
        calls.push(path);
        if (path.endsWith("/login")) {
          expect(options?.credentials).toBe("include");
          logged = true;
        }
        return {
          ok: true,
          json: async () => (logged ? signed : { ...signed, user: null }),
        };
      }),
    );
    render(
      <AccountRoot>
        <Studio />
      </AccountRoot>,
    );
    await screen.findByRole("heading", { name: "Welcome to Simulab" });
    expect(screen.queryByText(/Private studio/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "one@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Private studio one@example.test");
    expect(calls.slice(-2)).toEqual(["/api/auth/session", "/api/auth/login"]);
  });
  it("keeps an open studio while disabling save on failed refresh", async () => {
    let fail = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        if (fail) throw new Error("Network unavailable");
        return { ok: true, json: async () => signed };
      }),
    );
    render(
      <AccountRoot>
        <Studio />
      </AccountRoot>,
    );
    await screen.findByText("Saving enabled");
    fail = true;
    act(() => window.dispatchEvent(new Event("focus")));
    await screen.findByText("Saving disabled");
    expect(screen.getByText("Private studio one@example.test")).toBeTruthy();
  });
  it("clears identity before mounting another account and avoids resets on same-user refresh", async () => {
    let current = signed;
    const changed = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => current })),
    );
    render(
      <AccountRoot onIdentityChange={changed}>
        <Studio />
      </AccountRoot>,
    );
    await screen.findByText("Private studio one@example.test");
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
    current = {
      ...signed,
      user: { ...signed.user, id: "two", email: "two@example.test" },
    };
    act(() => window.dispatchEvent(new Event("focus")));
    await screen.findByText("Private studio two@example.test");
    expect(changed.mock.calls).toEqual([["one"], ["two"]]);
  });
});

it("ignores an anonymous focus refresh that resolves after explicit login", async () => {
  let resolveOld!: (value: unknown) => void;
  let sessions = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) => {
      if (path.endsWith("/auth/session")) {
        sessions++;
        if (sessions === 2)
          return await new Promise((resolve) => {
            resolveOld = resolve;
          });
        return { ok: true, json: async () => ({ ...signed, user: null }) };
      }
      return { ok: true, json: async () => signed };
    }),
  );
  render(
    <AccountRoot>
      <Studio />
    </AccountRoot>,
  );
  await screen.findByRole("heading", { name: "Welcome to Simulab" });
  act(() => window.dispatchEvent(new Event("focus")));
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "one@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByText("Private studio one@example.test");
  await act(async () =>
    resolveOld({ ok: true, json: async () => ({ ...signed, user: null }) }),
  );
  expect(screen.getByText("Private studio one@example.test")).toBeTruthy();
});
it("revokes paid saving at exact expiry without awaiting a session response", async () => {
  vi.useFakeTimers();
  const expires = Date.now() + 500;
  let first = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (first) {
        first = false;
        return {
          ok: true,
          json: async () => ({
            ...signed,
            subscription: { mode: "paid", expiresAt: expires },
          }),
        };
      }
      return await new Promise(() => {});
    }),
  );
  await act(async () => {
    render(
      <AccountRoot>
        <Studio />
      </AccountRoot>,
    );
  });
  expect(screen.getByText("Saving enabled")).toBeTruthy();
  await act(async () => {
    vi.advanceTimersByTime(501);
  });
  expect(screen.getByText("Saving disabled")).toBeTruthy();
  vi.useRealTimers();
});
it("keeps a confirmed theme when an earlier session refresh finishes later", async () => {
  let sessions = 0,
    resolveOld!: (value: unknown) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) => {
      if (path.endsWith("/auth/session") && ++sessions === 2)
        return await new Promise((resolve) => {
          resolveOld = resolve;
        });
      return { ok: true, json: async () => signed };
    }),
  );
  render(
    <AccountRoot>
      <Studio />
    </AccountRoot>,
  );
  await screen.findByText("Private studio one@example.test");
  act(() => window.dispatchEvent(new Event("focus")));
  fireEvent.change(screen.getByLabelText("Colour profile"), {
    target: { value: "pearl" },
  });
  await waitFor(() =>
    expect(document.documentElement.dataset.theme).toBe("pearl"),
  );
  await act(async () => resolveOld({ ok: true, json: async () => signed }));
  expect(document.documentElement.dataset.theme).toBe("pearl");
});
