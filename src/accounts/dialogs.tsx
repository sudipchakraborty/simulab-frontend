import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAccount } from "./index";
import { request } from "./api";
interface Payment {
  id: string;
  status: string;
  reference?: string;
  userId?: string;
  amount: number;
  currency: string;
}
interface Config {
  enabled: boolean;
  amount: number;
  currency: string;
  qrImage: string;
  confirmation: string;
}
/** @brief Server-owned payment tracking and deliberate audited administrator actions. */
export function AccountDialogs({
  kind,
  close,
}: {
  kind: "billing" | "admin";
  close: () => void;
}) {
  const account = useAccount(),
    [config, setConfig] = useState<Config>(),
    [payment, setPayment] = useState<Payment>(),
    [payments, setPayments] = useState<Payment[]>([]),
    [users, setUsers] = useState<{ id: string; email: string; role: string }[]>(
      [],
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const alive = useRef(true),
    dialog = useRef<HTMLDivElement>(null);
  const call = <T,>(path: string, method = "GET", body?: unknown) =>
    request<T>(
      path,
      { method, ...(body ? { body: JSON.stringify(body) } : {}) },
      account.session?.csrfToken,
    );
  const loadAdmin = async () => {
    const [u, p] = await Promise.all([
      call<{ users: typeof users }>("/admin/users"),
      call<{ payments: Payment[] }>("/admin/payments"),
    ]);
    if (alive.current) {
      setUsers(u.users);
      setPayments(p.payments);
    }
  };
  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    (kind === "billing"
      ? call<Config>("/billing/config").then((c) => {
          if (alive.current) setConfig(c);
        })
      : loadAdmin()
    ).catch((e) => {
      if (alive.current) setError(e.message);
    });
    return () => {
      alive.current = false;
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    if (!payment || payment.status === "paid" || payment.status === "approved")
      return;
    let count = 0;
    const timer = setInterval(() => {
      if (++count > 60) {
        clearInterval(timer);
        return;
      }
      void call<{ payment: Payment }>(`/billing/payments/${payment.id}`)
        .then(async (result) => {
          if (!alive.current) return;
          setPayment(result.payment);
          if (["paid", "approved"].includes(result.payment.status))
            await account.refresh();
        })
        .catch((e) => {
          if (alive.current) setError(e.message);
        });
    }, 5000);
    return () => clearInterval(timer);
  }, [payment?.id, payment?.status]);
  const action = async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const reference = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("reference");
    void action(async () => {
      const result = await call<{ payment: Payment }>(
        `/billing/payments/${payment!.id}/submit-reference`,
        "POST",
        { reference: value },
      );
      setPayment(result.payment);
      setMessage(
        "Reference submitted. Your plan changes only after server verification.",
      );
    });
  };
  return (
    <div className="account-modal-backdrop">
      <div
        className="account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
        tabIndex={-1}
        ref={dialog}
      >
        <header>
          <h2 id="account-dialog-title">
            {kind === "billing" ? "Plan & billing" : "Account administration"}
          </h2>
          <button aria-label="Close account dialog" onClick={close}>
            Close
          </button>
        </header>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        {kind === "billing" ? (
          <>
            <p>
              Current plan:{" "}
              <strong>{account.session?.subscription?.mode}</strong>
              {account.session?.subscription?.expiresAt && (
                <>
                  {" "}
                  Expires{" "}
                  {new Date(
                    account.session.subscription.expiresAt,
                  ).toLocaleDateString()}
                </>
              )}
            </p>
            {!config ? (
              <p>Loading checkout configuration</p>
            ) : (
              <>
                {config.enabled ? (
                  <p>
                    Price:{" "}
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: config.currency,
                    }).format(config.amount / 100)}
                  </p>
                ) : (
                  <p>
                    Checkout is not configured. An administrator must configure
                    a price and payment method.
                  </p>
                )}
                {config.qrImage ? (
                  <img
                    className="account-qr"
                    src={config.qrImage}
                    alt="Configured payment QR code"
                  />
                ) : (
                  <div className="account-qr-placeholder">
                    Payment QR image has not been configured.
                  </div>
                )}
                <button
                  disabled={busy || !config.enabled}
                  onClick={() =>
                    void action(async () => {
                      const result = await call<{ payment: Payment }>(
                        "/billing/checkout",
                        "POST",
                      );
                      setPayment(result.payment);
                    })
                  }
                >
                  Create checkout
                </button>
              </>
            )}
            {payment && (
              <section>
                <p>
                  Payment {payment.id} <strong>{payment.status}</strong>
                </p>
                <p>
                  Activation requires a verified provider event or administrator
                  confirmation.
                </p>
                {!["paid", "approved"].includes(payment.status) && (
                  <form onSubmit={reference}>
                    <label>
                      Payment reference
                      <input required name="reference" maxLength={200} />
                    </label>
                    <button disabled={busy}>Submit reference for review</button>
                  </form>
                )}
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      const result = await call<{ payment: Payment }>(
                        `/billing/payments/${payment.id}`,
                      );
                      setPayment(result.payment);
                      await account.refresh();
                    })
                  }
                >
                  Refresh payment status
                </button>
              </section>
            )}
          </>
        ) : (
          <>
            <h3>Users</h3>
            {users.map((user) => (
              <div className="account-admin-row" key={user.id}>
                <span>{user.email}</span>
                <label>
                  Role
                  <select
                    aria-label={`Role for ${user.email}`}
                    value={user.role}
                    disabled={busy}
                    onChange={(e) => {
                      const role = e.target.value;
                      void action(async () => {
                        await call(`/admin/users/${user.id}/role`, "PUT", {
                          role,
                        });
                        await loadAdmin();
                      });
                    }}
                  >
                    {["admin", "editor", "viewer"].map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
            <h3>Payments requiring review</h3>
            {payments.length === 0 && <p>No payment records.</p>}
            {payments.map((p) => (
              <div className="account-admin-row" key={p.id}>
                <span>
                  {p.userId}{" "}
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: p.currency,
                  }).format(p.amount / 100)}{" "}
                  {p.status}
                  <br />
                  Reference: {p.reference || "No reference"}
                </span>
                {!["paid", "approved"].includes(p.status) && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Confirm verified receipt for payment ${p.id}? This activates paid access and is audited.`,
                        )
                      )
                        void action(async () => {
                          await call(`/admin/payments/${p.id}/approve`, "POST");
                          await loadAdmin();
                          await account.refresh();
                        });
                    }}
                  >
                    Confirm verified receipt
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
