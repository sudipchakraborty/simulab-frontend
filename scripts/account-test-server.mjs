/** @file Real account API fixture. Seeding happens through trusted in-process services; HTTP has no test bypass. */
import { mkdtempSync } from "node:fs";
import { resolve, join } from "node:path";
import { createAccountServer } from "../../simulab-backend/src/accounts/server.mjs";
import { createMailer } from "../../simulab-backend/src/accounts/mailer.mjs";
const root = resolve(".local/e2e");
const { mkdirSync } = await import("node:fs");
mkdirSync(root, { recursive: true });
const directory = mkdtempSync(join(root, "accounts-"));
const port = Number(process.env.SIMULAB_E2E_ACCOUNT_PORT || 4321);
const origin = process.env.SIMULAB_E2E_ORIGIN || "http://127.0.0.1:5174";
const mailer = createMailer({
  outboxPath: resolve(
    process.env.SIMULAB_E2E_OUTBOX || ".local/e2e/mail-outbox",
  ),
});
const api = createAccountServer({
  dbPath: join(directory, "accounts.sqlite"),
  configPath: join(directory, "SYSTEM.json"),
  origins: [origin],
  baseUrl: origin,
  mailer,
});
const messages = [];
// Capture seed messages in process while keeping real development outbox for UI signups.
const deliver = mailer.send;
mailer.send = async (m) => {
  messages.push(m);
  await deliver(m);
};
for (const [name, role, paid] of [
  ["paid", "editor", true],
  ["trial", "editor", false],
  ["admin", "admin", true],
  ["viewer", "viewer", true],
]) {
  const email = `${name}@simulab.test`;
  await api.service.signup({
    email,
    password: "Simulab-test-password-123",
    theme: "corporate-navy",
  });
  const { userId } = api.service.verify(
    new URL(messages.at(-1).url).searchParams.get("verify"),
  );
  if (role === "admin") api.service.bootstrapAdmin(email);
  if (role === "viewer")
    api.service.db
      .prepare("UPDATE users SET role='viewer' WHERE id=?")
      .run(userId);
  if (paid)
    api.service.grantPaid(
      userId,
      Date.now() + 86400000,
      "explicit local browser fixture",
    );
}
api.server.listen(port, "127.0.0.1", () =>
  console.log(
    `Real browser account fixture listening ${port}; SQLite ${directory}; development outbox only`,
  ),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    api.server.close(() => {
      api.close();
      process.exit(0);
    }),
  );
