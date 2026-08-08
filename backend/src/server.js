import express from "express";
import { config } from "./config.js";
import { cleanverse } from "./cleanverse.js";
import { normalizeStatus } from "./config.js";
import { relay } from "./relay.js";
import { haircutForTier, maxLend } from "./config.js";
import { logAudit, readAudit, buildAuditPack } from "./audit.js";
import { repoStore } from "./repoStore.js";

const app = express();
app.use(express.json());

// CORS: the desk runs on a different origin (localhost:3000) than the API.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ---------------------------------------------------------------- health

app.get("/health", async (_req, res) => {
  let cleanverseStatus = "unconfigured";
  if (config.mode === "sandbox") {
    try {
      const r = await cleanverse.queryApass("0x1111111111111111111111111111111111111111");
      cleanverseStatus = r ? "reachable" : "reachable (no profile)";
    } catch (e) {
      cleanverseStatus = `error: ${e.message}`;
    }
  } else {
    cleanverseStatus = "mock";
  }
  res.json({
    ok: true,
    mode: config.mode,
    chain: config.chain,
    monad: { chainId: config.monadChainId, rpc: config.monadRpc ? "set" : "unset" },
    contracts: { repoDesk: config.repoDesk || null, registry: config.identityRegistry || null },
    cleanverse: cleanverseStatus,
  });
});

// --------------------------------------------------------------- identity

app.get("/identity/:address", async (req, res) => {
  const profile = await cleanverse.queryApass(req.params.address);
  if (!profile) return res.status(404).json({ address: req.params.address, verified: false });
  const v = await cleanverse.verifyApass(req.params.address);
  res.json({
    address: req.params.address,
    verified: v.passed,
    code: v.code,
    tier: profile.tier,
    status: profile.status,
    expiry: profile.expiry,
    cvRecordId: profile.cvRecordId,
    haircutBps: haircutForTier(profile.tier),
    mode: cleanverse.isMock() ? "mock" : "sandbox",
  });
});

// Credential-event channel (demo/ops tool): revoke, freeze, expire, reactivate.
app.post("/identity/:address/status", async (req, res) => {
  const { status, tier, expiry } = req.body;
  if (!status) return res.status(400).json({ error: "status required (ACTIVE|FROZEN|REVOKED|EXPIRED|UNVERIFIED)" });
  const updated = await relay.setProfile(req.params.address, { status, tier, expiry }, "manual");
  logAudit({ type: "credential_event", repoId: null, address: req.params.address, status, tier });
  res.json({ ok: true, ...updated });
});

app.get("/policy", (_req, res) => {
  res.json({
    haircuts: { 3: "2%", 2: "5%", 1: "10%" },
    maintenanceMarginBps: 10500,
    note: "Identity tier prices the haircut: deeper verification, thinner haircut.",
  });
});

// ----------------------------------------------------------------- repos

app.get("/repos", (_req, res) => {
  res.json({ repos: repoStore.list() });
});

app.get("/repos/:id", (req, res) => {
  const r = repoStore.get(req.params.id);
  if (!r) return res.status(404).json({ error: "repo not found" });
  res.json(r);
});

/**
 * Open a repo (orchestration for the console):
 *  1. CCP pre-check on the proposed flow
 *  2. verify borrower + lender A-Pass (CVI gate)
 *  3. tier-priced haircut determines the max cash leg (CVI as pricing)
 *  4. travel rule attribution anchor
 * In mock mode the store records the repo. In sandbox mode with a key this
 * would submit the contract transaction; without a key it returns the
 * prepared payload for the console to sign.
 */
app.post("/repos/open", async (req, res) => {
  const { borrower, lender, collateralToken, cashToken, collateralAmount, cashAmount, feeBps, termDays } = req.body;
  if (!borrower || !lender || !collateralAmount || !cashAmount) {
    return res.status(400).json({ error: "borrower, lender, collateralAmount, cashAmount required" });
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(borrower) || !/^0x[0-9a-fA-F]{40}$/.test(lender)) {
    return res.status(400).json({ error: "borrower and lender must be valid addresses" });
  }
  if (!/^\d+$/.test(String(collateralAmount)) || !/^\d+$/.test(String(cashAmount))) {
    return res.status(400).json({ error: "amounts must be positive integers (token units)" });
  }
  const fee = Number(feeBps ?? 50);
  if (!Number.isInteger(fee) || fee < 0 || fee > 10000) {
    return res.status(400).json({ error: "feeBps must be an integer in [0, 10000]" });
  }
  const term = Number(termDays ?? 7);
  if (!Number.isInteger(term) || term < 1 || term > 3650) {
    return res.status(400).json({ error: "termDays must be an integer in [1, 3650]" });
  }

  const ccp = await cleanverse.ccpCheck({ from: lender, to: borrower, amount: cashAmount });
  if (!ccp.passed) return res.status(403).json({ error: "CCP pre-check failed", ccp });

  const bV = await cleanverse.verifyApass(borrower);
  const lV = await cleanverse.verifyApass(lender);
  if (!bV.passed) return res.status(403).json({ error: "borrower not verified", borrower, code: bV.code });
  if (!lV.passed) return res.status(403).json({ error: "lender not verified", lender, code: lV.code });

  const tier = bV.profile.tier;
  const haircut = haircutForTier(tier);
  const collateralValue = Number(collateralAmount); // valueOf(1:1) in mock; sandbox reads on-chain
  const allowed = maxLend(collateralValue, tier);
  if (Number(cashAmount) > allowed) {
    return res.status(422).json({
      error: "cash leg exceeds tier haircut coverage",
      tier,
      haircutBps: haircut,
      collateralValue,
      maxLend: allowed,
    });
  }

  const travelRule = `tr-${Date.now()}-${borrower.slice(2, 10)}-${lender.slice(2, 10)}`;
  const id = repoStore.nextId();
  const repo = {
    id,
    borrower,
    lender,
    collateralToken: collateralToken || "BOND",
    cashToken: cashToken || "aUSDC",
    collateralAmount: String(collateralAmount),
    cashAmount: String(cashAmount),
    feeBps: fee,
    haircutBps: haircut,
    tier,
    termDays: term,
    status: "OPEN",
    travelRule,
    createdAt: new Date().toISOString(),
    mode: cleanverse.isMock() ? "mock" : "sandbox",
  };
  repoStore.add(repo);
  logAudit({ type: "repo_opened", repoId: id, borrower, lender, cashAmount, tier, haircutBps: haircut, travelRule });

  res.status(201).json({ repo, note: "Mock settlement: cash + collateral escrowed in RepoDesk." });
});

// Trigger compliant closeout (credential event or margin/term breach).
app.post("/repos/:id/closeout", async (req, res) => {
  const r = repoStore.get(req.params.id);
  if (!r) return res.status(404).json({ error: "repo not found" });

  const b = await cleanverse.queryApass(r.borrower);
  const reason = !b || normalizeStatus(b.status) !== 1 ? `borrower_${b?.status ?? "UNVERIFIED"}` : null;

  r.status = "CLOSED_OUT";
  r.closeout = {
    reason: reason || "closeout_requested",
    executedAt: new Date().toISOString(),
    // Mock: lender receives obligation-covered collateral, excess escrowed if borrower not active.
    collateralToLender: r.collateralAmount,
    escrowed: reason ? r.collateralAmount : "0",
  };
  repoStore.update(r.id, r);
  logAudit({ type: "repo_closeout", repoId: r.id, reason: r.closeout.reason, travelRule: r.travelRule });

  res.json({ repo: r });
});

// ------------------------------------------------------------------ audit

app.get("/repos/:id/audit", async (req, res) => {
  const r = repoStore.get(req.params.id);
  if (!r) return res.status(404).json({ error: "repo not found" });
  const tr = await cleanverse.downloadTravelRule(r.travelRule);
  const pack = buildAuditPack(r.id, tr);
  res.json(pack);
});

const server = process.env.VERCEL === "1" ? null : app.listen(config.port, () => {
  console.log(`[pignora] backend on :${config.port} (mode=${config.mode})`);
});

// ------------------------------------------------------------ error handling

app.use((req, res) => res.status(404).json({ error: "not found" }));

app.use((err, _req, res, _next) => {
  console.error("[pignora] error:", err.message);
  res.status(500).json({ error: err.message || "internal error" });
});

export { app, server };
