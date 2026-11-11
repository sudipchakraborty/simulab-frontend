import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  applyTheme,
  readThemeCache,
  writeThemeCache,
  ThemeSelector,
  isThemeId,
  type ThemeId,
} from "../themes";
import { request, entitlements, type Session } from "./api";
import { AccountDialogs } from "./dialogs";
interface AccountValue {
  loginEnabled?: boolean;
  session: Session | null;
  user: Session["user"];
  online: boolean;
  error: string;
  theme: ThemeId;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setTheme: (theme: ThemeId) => Promise<void>;
  canSave: boolean;
  canEdit: boolean;
  canRun: boolean;
  canUpload: boolean;
  storageKey: string;
  saveProject: (name: string, data: unknown) => Promise<unknown>;
}
const AccountContext = createContext<AccountValue | null>(null);
/** @brief Access authenticated capabilities without storing browser credentials. */
export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("AccountRoot is required");
  return value;
}
/** @brief Gate studio access and isolate identities before exposing a new session. */
export function AccountRoot({
  children,
  onIdentityChange,
  loginEnabled = true,
}: {
  children: ReactNode;
  onIdentityChange?: (id: string | null) => void;
  loginEnabled?: boolean;
}) {
  return loginEnabled ? (
    <AuthenticatedAccountRoot onIdentityChange={onIdentityChange}>
      {children}
    </AuthenticatedAccountRoot>
  ) : (
    <LocalAccountRoot onIdentityChange={onIdentityChange}>
      {children}
    </LocalAccountRoot>
  );
}
/** @brief Explicit local workspace mode; never grants access to private server accounts or projects. */
function LocalAccountRoot({
  children,
  onIdentityChange,
}: {
  children: ReactNode;
  onIdentityChange?: (id: string | null) => void;
}) {
  const [theme, setAppearance] = useState<ThemeId>(readThemeCache);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    onIdentityChange?.("local-workspace");
    setReady(true);
  }, []);
  const setTheme = async (next: ThemeId) => {
    setAppearance(applyTheme(next));
    writeThemeCache(next);
  };
  const session: Session = {
    user: {
      id: "local-workspace",
      email: "Local workspace",
      role: "editor",
      verified: true,
    },
    subscription: null,
    permissions: [],
    preferences: { theme },
    csrfToken: "",
  };
  return (
    <AccountContext.Provider
      value={{
        loginEnabled: false,
        session,
        user: session.user,
        online: true,
        error: "",
        theme,
        setTheme,
        refresh: async () => {},
        logout: async () => {},
        canSave: true,
        canEdit: true,
        canRun: true,
        canUpload: true,
        storageKey: "simulab.ide.local-workspace",
        saveProject: async () => ({ storage: "local" }),
      }}
    >
      <div className="account-studio">{ready ? children : null}</div>
    </AccountContext.Provider>
  );
}
function AuthenticatedAccountRoot({
  children,
  onIdentityChange,
}: {
  children: ReactNode;
  onIdentityChange?: (id: string | null) => void;
}) {
  const [session, setSession] = useState<Session | null>(null),
    [online, setOnline] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [theme, setAppearance] = useState<ThemeId>(readThemeCache);
  const [handlingLink, setHandlingLink] = useState(
    () =>
      new URLSearchParams(location.search).has("verify") ||
      new URLSearchParams(location.search).has("reset"),
  );
  const [expiryTick, setExpiryTick] = useState(0);
  useEffect(() => {
    const expires = session?.subscription?.expiresAt;
    if (!expires || expires <= Date.now()) return;
    const timer = setTimeout(
      () => {
        setExpiryTick((value) => value + 1);
        void refresh();
      },
      Math.min(2147483647, expires - Date.now() + 1),
    );
    return () => clearTimeout(timer);
  }, [session?.subscription?.expiresAt, expiryTick]);
  const identity = useRef<string | null>(null),
    generation = useRef(0);
  const accept = (next: Session) => {
    const id = next.user?.verified ? next.user.id : null;
    if (identity.current !== id) {
      onIdentityChange?.(id);
      identity.current = id;
    }
    setSession(next);
    setOnline(true);
    setError("");
    if (isThemeId(next.preferences?.theme) && next.user) {
      setAppearance(applyTheme(next.preferences.theme));
      writeThemeCache(next.preferences.theme);
    }
  };
  const refresh = async () => {
    const current = ++generation.current;
    try {
      const next = await request<Session>("/auth/session");
      if (current === generation.current) accept(next);
    } catch (e) {
      if (current === generation.current) {
        setOnline(false);
        setError((e as Error).message);
      }
    } finally {
      setReady(true);
    }
  };
  useEffect(() => {
    void refresh();
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    const timer = setInterval(focus, 60000);
    return () => {
      window.removeEventListener("focus", focus);
      clearInterval(timer);
      generation.current++;
    };
  }, []);
  const logout = async () => {
    await request("/auth/logout", { method: "POST" }, session?.csrfToken);
    generation.current++;
    onIdentityChange?.(null);
    identity.current = null;
    setSession(null);
    await refresh();
  };
  const setTheme = async (next: ThemeId) => {
    if (session?.user)
      await request(
        "/preferences",
        { method: "PUT", body: JSON.stringify({ theme: next }) },
        session.csrfToken,
      );
    generation.current++;
    setAppearance(applyTheme(next));
    writeThemeCache(next);
  };
  const access = entitlements(session, online);
  const saveProject = async (name: string, data: unknown) => {
    if (!access.canSave)
      throw new Error(
        "An active paid plan and project write permission are required.",
      );
    return request(
      "/projects",
      { method: "POST", body: JSON.stringify({ name, data }) },
      session?.csrfToken,
    );
  };
  return (
    <AccountContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        online,
        error,
        theme,
        refresh,
        logout,
        setTheme,
        ...access,
        storageKey: `simulab.ide.user.${session?.user?.id ?? "anonymous"}`,
        saveProject,
      }}
    >
      {!ready ? (
        <main className="account-landing">
          <p role="status">Restoring your secure session</p>
        </main>
      ) : session?.user?.verified && !handlingLink ? (
        <div key={session.user.id} className="account-studio">
          {children}
        </div>
      ) : (
        <AuthLanding
          accept={(next) => {
            generation.current++;
            accept(next);
            setHandlingLink(false);
          }}
        />
      )}
    </AccountContext.Provider>
  );
}
function AuthLanding({ accept }: { accept: (session: Session) => void }) {
  const account = useAccount();
  const query = new URLSearchParams(location.search);
  const [mode, setMode] = useState(query.has("reset") ? "reset" : "login"),
    [token] = useState(query.get("reset") || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [email, setEmail] = useState("");
  const verifyStarted = useRef(false);
  useEffect(() => {
    const proof = query.get("verify");
    if (!proof || verifyStarted.current) return;
    verifyStarted.current = true;
    history.replaceState(null, "", location.pathname + location.hash);
    setBusy(true);
    request<Session>(`/auth/verify?token=${encodeURIComponent(proof)}`)
      .then(async (next) => {
        if (next.user) accept(next);
        else await account.refresh();
        setNotice("Email verified. You can now sign in.");
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    if (token)
      history.replaceState(null, "", location.pathname + location.hash);
  }, [token]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    try {
      const preflight = await request<Session>("/auth/session");
      const body =
        mode === "reset"
          ? { token, password: data.get("password") }
          : {
              email: data.get("email"),
              ...(mode === "forgot" ? {} : { password: data.get("password") }),
              remember: true,
              ...(mode === "signup" ? { theme: account.theme } : {}),
            };
      const result = await request<
        Session & {
          message?: string;
          delivery?: string;
          devOutbox?: unknown;
          outbox?: unknown;
        }
      >(
        `/auth/${mode === "pending" ? "resend-verification" : mode === "signup" ? "signup" : mode === "forgot" ? "forgot-password" : mode === "reset" ? "reset-password" : "login"}`,
        { method: "POST", body: JSON.stringify(body) },
        preflight.csrfToken,
      );
      if (result.user?.verified) accept(result);
      else {
        const dev =
          result.delivery === "outbox" ||
          result.delivery === "development-outbox" ||
          result.devOutbox ||
          result.outbox;
        setNotice(
          dev
            ? "Development email was written to the server outbox. SMTP delivery is not configured."
            : result.message ||
                (mode === "signup"
                  ? "Check your email to verify your account before opening the studio."
                  : mode === "forgot"
                    ? "If the account exists, reset instructions have been requested."
                    : mode === "reset"
                      ? "Password reset. Sign in with your new password."
                      : "Verify your email before signing in."),
        );
        if (mode === "signup") setMode("pending");
        if (mode === "reset") setMode("login");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const change = (next: string) => {
    setMode(next);
    setError("");
    setNotice("");
  };
  return (
    <main className="account-landing">
      <div className="account-appearance">
        <ThemeSelector
          value={account.theme}
          onChange={(next) =>
            void account.setTheme(next).catch((e) => setError(e.message))
          }
        />
      </div>
      <section className="account-card">
        <p className="account-eyebrow">SIMULAB ENGINEERING WORKSPACE</p>
        <h1>
          {mode === "signup"
            ? "Create your workspace"
            : mode === "forgot"
              ? "Recover your account"
              : mode === "reset"
                ? "Choose a new password"
                : mode === "pending"
                  ? "Verify your email"
                  : "Welcome to Simulab"}
        </h1>
        <p className="account-muted">
          Build circuits, write firmware and explore simulation in your private
          workspace.
        </p>
        {account.error && (
          <p role="alert">
            Account service unavailable: {account.error}{" "}
            <button onClick={() => void account.refresh()}>
              Retry connection
            </button>
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {
          <form onSubmit={submit}>
            {mode !== "reset" && (
              <label>
                Email
                <input
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="username"
                  required
                />
              </label>
            )}
            {mode !== "forgot" && mode !== "pending" && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  minLength={mode === "login" ? 1 : 12}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                />
              </label>
            )}
            <button className="account-primary" disabled={busy}>
              {busy
                ? "Please wait"
                : mode === "pending"
                  ? "Resend verification"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Request reset"
                      : mode === "reset"
                        ? "Reset password"
                        : "Sign in"}
            </button>
          </form>
        }
        <div className="account-links">
          {mode !== "login" && (
            <button onClick={() => change("login")}>Back to sign in</button>
          )}
          {mode === "login" && (
            <>
              <button onClick={() => change("signup")}>Create account</button>
              <button onClick={() => change("forgot")}>Forgot password?</button>
            </>
          )}
        </div>
        <p className="account-muted account-small">
          Trial accounts can explore the studio. Saving requires an active paid
          subscription.
        </p>
      </section>
    </main>
  );
}
/** @brief Compact account, appearance, billing and privileged administration controls. */
export function AccountControls() {
  const account = useAccount(),
    [dialog, setDialog] = useState<"billing" | "admin" | null>(null),
    [error, setError] = useState("");
  return (
    <div className="account-controls">
      <ThemeSelector
        value={account.theme}
        onChange={(next) =>
          void account.setTheme(next).catch((e) => setError(e.message))
        }
      />
      {account.loginEnabled !== false && (
        <>
          <span title={account.user?.email}>{account.user?.email}</span>
          <button onClick={() => setDialog("billing")}>Plan & billing</button>
          {account.session?.permissions.includes("billing.manage") && (
            <button onClick={() => setDialog("admin")}>Admin</button>
          )}
          <button
            onClick={() =>
              void account.logout().catch((e) => setError(e.message))
            }
          >
            Sign out
          </button>
        </>
      )}
      {account.loginEnabled === false && <span>Local workspace</span>}
      {error && <span role="alert">{error}</span>}
      {dialog && <AccountDialogs kind={dialog} close={() => setDialog(null)} />}
    </div>
  );
}
/** @brief Explain capability limitations using the authoritative subscription. */
export function SubscriptionBanner() {
  const a = useAccount();
  return (
    <div className="subscription-banner" role="status">
      {a.loginEnabled === false
        ? "Login disabled in system configuration. Local saving is enabled."
        : !a.online
          ? "Account service offline. Saving and hardware upload are unavailable."
          : a.session?.subscription?.mode === "paid"
            ? `Paid plan  ${a.canSave ? "Cloud saving available" : "Saving unavailable"}`
            : a.session?.subscription?.mode === "expired"
              ? "Subscription expired. Renew your plan to continue."
              : "Trial workspace  Saving and export require a paid plan."}
    </div>
  );
}
