# SimuLab accounts, corporate themes and expanded components - 2026-11-06

## Delivered architecture
- Independent Node24 HTTP account API on4320, reusable dependency-injected account domain, SQLite persistence and atomic SYSTEM.json user preferences. Restricted Arduino companion remains separate on4317.
- Verified signup/email recovery/reset, individually salted scrypt password hashes, opaque hashed HttpOnly remembered sessions, strict Origin/CSRF checks, revocation and role/owner enforcement. No first-user administrator. Trusted operator bootstrap is documented in backend README.account.md.
- Admin/editor/viewer roles; 30-day configurable trial starts on email verification. Trial disables project/serial downloads, export and autosave; paid editor/admin saves require server entitlement. Expiry/offline handling and identity-scoped workspace caches prevent privilege reuse and account leakage.
- Six corporate light/dark themes at top right, server-authoritative config restoration, appearance-only local cache and Monaco theme synchronization. Header has separate account and workspace-control rows.
- Configurable QR checkout/reference tracking, pending state, authenticated audited admin approval or validated payment webhook. Forged/mismatched/replayed events cannot activate or extend payment. No real provider/SMTP/QR/price was supplied; live delivery/charging is deliberately unconfigured.
- Categorized31-kind library: Microcontroller, Module, Robotics and other electrical parts. New19 kinds include Nano/Mega, volt/current meters, HX711 plus DHT22, stepper/driver, servo, tactile/electromagnetic switches, generic six-axis/Universal/Dobot/uArm arms, conveyor, car and IR pair. Parameterized pure model factories and SVG host adapters use versioned contracts; schema1.3 preserves old project parsing.
- Native Mega AVR profile distinct from ATmega328P, actual CPU ports/vectors/flash/SRAM/USART0; Nano shares real ATmega328P execution. No MCU fallback. Bounded DC solver and sensor protocols feed actual MCU input reads.

## Configuration and running
See ../README.md and ../../simulab-backend/README.account.md plus .env.accounts.example. Node24 is required; node:sqlite emits an experimental warning. For local5174 development:

```powershell
# From simulab-backend, first terminal (explicit local mail transport)
$env:ACCOUNT_DEV_OUTBOX='.local/mail-outbox'
$env:ACCOUNT_ORIGINS='http://127.0.0.1:5174,http://localhost:5174'
$env:APP_URL='http://127.0.0.1:5174'
npm.cmd run start:accounts
# From simulab-frontend, second terminal
npm.cmd run dev -- --port 5174 --strictPort
```

Verification messages are local private JSON files under backend .local/mail-outbox during this development mode, not delivered email. Open their link once. Production needs configured SMTP, HTTPS/secure cookies, price/currency/QR and validated provider adapter or trusted approval process. Remembered sessions retain credentials securely without storing plaintext passwords.

## Verification evidence
- Frontend:140 unit/component tests; strict TS/Vite build passed. Engine:21 tests; ESP binding:5 tests. Backend:10 real HTTP/security/SMTP/account/companion tests. Audit and vendored executable/firmware hashes passed.
- Real AVR firmware clocks HX711 signed -2 as FFFFFE and reads checksum-valid DHT22 -12.3C/60% frame0258807B55 through GPIO input hooks. No injected serial sensor answers.
- Real AVR GCC Mega fixture proves high native ports D49/A8, D2 input/D4 mirror, Timer1 interrupts, USART0 TX/RX and three-byte PC stack. Separate Arduino AVR1.8.6 Nano/Mega builds ran UART millis0/50/100/150/200; Mega D49 HIGH. Rebuild provenance: engine scripts/build-mega-firmware.mjs and firmware/mega2560-metadata.json.
- Browser harness uses real account service and private outbox/SQLite, with no product bypass. Real compiler tests serialize access to the intentionally single-job companion; worker-scoped normal HTTP login avoids mistaking test traffic for a brute-force attempt. Browser result appended below when final gate closes.
- Independent reviews corrected slow-request revocation, SMTP STARTTLS requirement, verification failure/retry, stale auth/theme refresh, exact expiry, serial entitlement gaps and header layout. Regression tests cover these findings.

## Honest boundaries
No live email, charge, provider-specific integration, supplied payment QR, physical hardware upload/comparison or deployment. Robot models are bounded educational kinematics/mechanics, not vendor protocol or hardware safety certification. Full analog/SPICE, AVR ADC/SPI/EEPROM/Mega USART1-3, independently validated Mega timers2-5, original ESP32 execution, S3 external timing-critical device hooks and source/DWARF/GDB debugging remain unavailable. Browser-local license controls can be modified by a machine owner; private API persistence remains authoritative. Source trees are uncommitted; no push/deploy was requested.

Final production gate:21/21 Chromium tests passed in1.2min with real account API, CLI companion and compiled S3 image; no skips. Dark/light screenshots reviewed. All audits0vulnerabilities. Live app5174 and account API4320 return HTTP200.
