/**
 * Pignora demo script (mock mode, offline).
 * Runs the full repo lifecycle: identity gate -> tier-priced haircut -> repo
 * open -> credential revocation -> compliant closeout -> audit pack.
 *
 *   cd backend && npm run demo
 */

const BASE = "http://localhost:8787";

const BORROWER = "0x1111111111111111111111111111111111111111"; // mock tier-3 (2% haircut)
const LENDER = "0x2222222222222222222222222222222222222222";

async function call(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

const log = (s) => console.log(`\n== ${s}`);

log("1. Health");
const health = await call("/health");
console.log("mode:", health.mode, "| contracts:", JSON.stringify(health.contracts));

log("2. Identity gate — borrower A-Pass (tier 3, bank-verified)");
const id = await call(`/identity/${BORROWER}`);
console.log(`verified=${id.verified} tier=${id.tier} status=${id.status} haircut=${id.haircutBps}bps`);

log("3. Unverified wallet is rejected at the door");
try {
  await call("/repos/open", {
    method: "POST",
    body: JSON.stringify({
      borrower: "0x9999999999999999999999999999999999999999",
      lender: LENDER,
      collateralAmount: "1000000000000",
      cashAmount: "980000000000",
    }),
  });
  console.log("UNEXPECTED: unverified borrower accepted");
} catch (e) {
  console.log("rejected as expected:", e.message.slice(0, 90));
}

log("4. Open repo — tier 3 haircut = 2%, so 98% LTV is allowed");
const open = await call("/repos/open", {
  method: "POST",
  body: JSON.stringify({
    borrower: BORROWER,
    lender: LENDER,
    collateralToken: "BOND",
    cashToken: "aUSDC",
    collateralAmount: "1000000000000",
    cashAmount: "980000000000",
    feeBps: 50,
    termDays: 7,
  }),
});
const repo = open.repo;
console.log(`repo#${repo.id} opened: cash=${repo.cashAmount} collateral=${repo.collateralAmount} haircut=${repo.haircutBps}bps travelRule=${repo.travelRule}`);

log("5. Credential event — borrower A-Pass REVOKED mid-term");
await call(`/identity/${BORROWER}/status`, {
  method: "POST",
  body: JSON.stringify({ status: "REVOKED", tier: 3 }),
});
console.log("borrower status -> REVOKED (relay pushed the event)");

log("6. Compliant closeout — anyone can execute");
const co = await call(`/repos/${repo.id}/closeout`, { method: "POST" });
console.log("closeout:", JSON.stringify(co.repo.closeout));

log("7. Audit pack — travel rule + event ledger");
const pack = await call(`/repos/${repo.id}/audit`);
console.log("travelRule:", JSON.stringify(pack.travelRule));
console.log("events:", pack.events.map((e) => e.type).join(" -> "));

console.log("\nDEMO OK — full lifecycle: gate -> pricing -> open -> revocation -> closeout -> audit");
