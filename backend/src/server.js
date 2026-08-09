import express from "express";
import { config } from "./config.js";
import { cleanverse } from "./cleanverse.js";
import { normalizeStatus } from "./config.js";
import { relay } from "./relay.js";
import { haircutForTier, maxLend } from "./config.js";
import { logAudit, readAudit, buildAuditPack } from "./audit.js";
import { repoStore } from "./repoStore.js";
import { isLive, openRepoOnchain, closeoutOnchain, listReposOnchain, repoTxHashes, registryProfile, loadABI } from "./settlement.js";
import { verifyCredentialEventSignature, credentialEventPayload, operatorAddress } from "./operator.js";
import { JsonRpcProvider, Wallet, Contract, parseEther } from "ethers";

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
  // Local clone-and-run (no Cleanverse creds): read the REAL on-chain
  // IdentityRegistry mirror — the seeded A-Passes live there as contract
  // state. With creds (sandbox), query the live Cleanverse API.
  if (cleanverse.isMock()) {
    try {
      const rp = await registryProfile(req.params.address);
      return res.json({
        address: req.params.address,
        verified: rp.status === 1,
        code: rp.status === 1 ? 0 : 1,
        tier: rp.tier,
        status: rp.status,
        expiry: null,
        cvRecordId: rp.onChain ? "on-chain" : null,
        haircutBps: rp.haircutBps,
        mode: "mock",
        source: "on-chain registry",
      });
    } catch (e) {
      return res.json({ address: req.params.address, verified: false, mode: "mock", error: e.message.slice(0, 80) });
    }
  }
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
// A credential event is authorized by an EIP-712 signature from the operator
// wallet (MetaMask on the desk) — the backend verifies it before executing,
// so no action can be spoofed by a random caller.
app.post("/identity/:address/status", async (req, res) => {
  const STATUS_CODE_INVERSE = { ACTIVE: 1, FROZEN: 2, REVOKED: 3, EXPIRED: 4, UNVERIFIED: 0 };
  const { status, tier, expiry, signature, nonce, timestamp } = req.body;
  if (!status) return res.status(400).json({ error: "status required (ACTIVE|FROZEN|REVOKED|EXPIRED|UNVERIFIED)" });
  if (!signature) return res.status(401).json({ error: "credential events must be signed by the operator wallet (MetaMask)" });

  // verify the EIP-712 signature before touching any state
  let signer;
  try {
    const ts = timestamp ?? Math.floor(Date.now() / 1000);
    const nonceVal = nonce ?? 0;
    signer = verifyCredentialEventSignature({
      subject: req.params.address,
      status: STATUS_CODE_INVERSE[status] ?? 1,
      tier: Number(tier ?? 0),
      nonce: nonceVal,
      timestamp: ts,
      signature,
    });
  } catch (e) {
    return res.status(401).json({ error: `signature verification failed: ${e.message}` });
  }

  const updated = await relay.setProfile(req.params.address, { status, tier, expiry }, "manual");
  logAudit({ type: "credential_event", repoId: null, address: req.params.address, status, tier, signer });

  // A credential event is a protocol event: a frozen/revoked/expired borrower's
  // open repos close out automatically (the on-chain gate flips -> closeout).
  // Reason uses the A-Pass status code, matching the reference settlement
  // (freeze = borrower_2, revoke = borrower_3, expiry = borrower_4).
  const STATUS_CODE = { FROZEN: 2, REVOKED: 3, EXPIRED: 4 };
  let closedOut = 0;
  let closedOutTx = [];
  if (STATUS_CODE[status]) {
    const addr = req.params.address.toLowerCase();
    const affected = repoStore
      .list()
      .filter((r) => r.status === "OPEN" && r.borrower.toLowerCase() === addr);
    closedOut = affected.length;
    for (const r of affected) {
      r.status = "CLOSED_OUT";
      r.closeout = {
        reason: `borrower_${STATUS_CODE[status]}`,
        executedAt: new Date().toISOString(),
        collateralToLender: r.collateralAmount,
        escrowed: r.collateralAmount,
      };
      repoStore.update(r.id, r);
      logAudit({ type: "repo_closeout", repoId: r.id, reason: r.closeout.reason, travelRule: r.travelRule });
    }

    // On-chain: execute the real closeout on RepoDesk for every OPEN repo of the
    // frozen borrower (the gate is now flipped, so executeCloseout will pass).
    if (isLive()) {
      try {
        const chain = await listReposOnchain();
        const openOf = chain.filter((c) => !c.closed && c.borrower.toLowerCase() === addr);
        for (const c of openOf) {
          try {
            const co = await closeoutOnchain(c.id);
            closedOutTx.push({ repoId: c.id, txHash: co.txHash });
            closedOut++;
          } catch (e) {
            closedOutTx.push({ repoId: c.id, error: e.message.slice(0, 80) });
          }
        }
      } catch (e) {
        closedOutTx.push({ error: `chain closeout failed: ${e.message.slice(0, 80)}` });
      }
    }
  }

  res.json({ ok: true, ...updated, closedOut, closedOutTx });
});

app.get("/policy", (_req, res) => {
  res.json({
    haircuts: { 3: "2%", 2: "5%", 1: "10%" },
    maintenanceMarginBps: 10500,
    note: "Identity tier prices the lending cap: deeper verification, higher cap.",
  });
});

// ----------------------------------------------------------------- repos

/** Fund the connected wallet with demo cash (CVA stand-in) + BOND collateral
 *  so the desk's wallet-signed flow works with ANY wallet. Testnet mocks
 *  only — never enabled against real assets. */
app.post("/repos/fund", async (req, res) => {
  const { address } = req.body;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address || "")) {
    return res.status(400).json({ error: "address required" });
  }
  try {
    const p = new JsonRpcProvider(config.monadRpc, config.monadChainId, { staticNetwork: true });
    const relay = new Wallet(config.relayKey, p);
    const usd = new Contract(config.mockUsd, loadABI("MockUSD"), relay);
    const bond = new Contract(config.bond, loadABI("MockBond"), relay);
    // fund gas first (0.5 MON), then cash + collateral
    if ((await p.getBalance(address)) < parseEther("0.2")) {
      await relay.sendTransaction({ to: address, value: parseEther("0.5") }).then((t) => t.wait());
    }
    const t1 = await usd.mint(address, 10_000_000_000_000n);
    await t1.wait();
    const t2 = await bond.mint(address, 5_000_000_000_000n);
    await t2.wait();
    res.json({ ok: true, gas: true, cashMint: t1.hash, bondMint: t2.hash });
  } catch (e) {
    res.status(500).json({ error: `fund failed: ${e.message.slice(0, 120)}` });
  }
});

app.get("/repos", async (_req, res) => {
  if (isLive()) {
    try {
      // chain = source of truth; store adds travelRule / closeout metadata
      const chain = await listReposOnchain();
      const txHashes = await repoTxHashes(chain);
      const stored = repoStore.list();
      const byId = new Map(stored.map((s) => [Number(s.id), s]));
      const merged = chain
        .map((c) => {
          const s = byId.get(c.id);
          const txs = txHashes[c.id] ?? {};
          return {
            id: c.id,
            borrower: c.borrower,
            lender: c.lender,
            collateralToken: c.collateralToken,
            cashToken: c.cashToken,
            collateralAmount: c.collateralAmount,
            cashAmount: c.cashAmount,
            feeBps: c.feeBps,
            haircutBps: s?.haircutBps ?? 200,
            tier: s?.tier ?? 50,
            termDays: s?.termDays ?? Math.round((c.termEnd - Date.now() / 1000) / 86400),
            status: c.closed ? "CLOSED_OUT" : "OPEN",
            travelRule: s?.travelRule ?? `onchain-${c.id}`,
            createdAt: s?.createdAt ?? new Date().toISOString(),
            onchain: s?.onchain ?? { txHash: txs.openTxHash ?? ``, onchainRepoId: c.id, fromChain: true },
            closeout: s?.closeout ?? (txs.closeTxHash ? { txHash: txs.closeTxHash, onchain: true } : undefined),
            mode: "sandbox",
          };
        })
        // only repos with a real on-chain open tx — pre-tracking artifacts
        // (opened before tx recovery) have no hash and are excluded from the
        // desk; every row shown has a MonadScan-verifiable open
        .filter((r) => (r.onchain?.txHash ?? "") !== "");
      return res.json({ repos: merged, source: "chain" });
    } catch (e) {
      return res.status(502).json({ error: `chain read failed: ${e.message}` });
    }
  }
  res.json({ repos: repoStore.list(), source: "store" });
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

  // Real on-chain settlement when the backend is configured (sandbox + keys + contracts).
  let onchain = null;
  if (isLive()) {
    try {
      onchain = await openRepoOnchain({
        borrower,
        lender,
        collateralAmount: String(collateralAmount),
        cashAmount: String(cashAmount),
        feeBps: fee,
        termDays: term,
        travelRule,
      });
      repo.onchain = onchain;
      repo.cashToken = onchain.cashLabel === "MockUSD" ? "MockUSD" : repo.cashToken;
    } catch (e) {
      // never fail the open on a settlement error — record it and surface it
      repo.onchainError = e.message;
    }
  }

  repoStore.add(repo);
  logAudit({ type: "repo_opened", repoId: id, borrower, lender, cashAmount, tier, haircutBps: haircut, travelRule, onchain: onchain?.txHash ?? null });

  res.status(201).json({
    repo,
    note: onchain?.txHash ? `Repo opened on-chain: ${onchain.txHash}` : "Orchestration recorded; on-chain settlement requires relay + lender keys.",
  });
});

// Trigger compliant closeout (credential event or margin/term breach).
app.post("/repos/:id/closeout", async (req, res) => {
  let r = repoStore.get(req.params.id);
  if (!r && isLive()) {
    // repo may live on another lambda instance — read it from the chain
    try {
      const chain = await listReposOnchain();
      const found = chain.find((c) => c.id === Number(req.params.id));
      if (found) {
        r = {
          id: found.id,
          borrower: found.borrower,
          lender: found.lender,
          collateralToken: found.collateralToken,
          cashToken: found.cashToken,
          collateralAmount: found.collateralAmount,
          cashAmount: found.cashAmount,
          feeBps: found.feeBps,
          haircutBps: 200,
          tier: 50,
          termDays: 7,
          status: found.closed ? "CLOSED_OUT" : "OPEN",
          travelRule: `onchain-${found.id}`,
          createdAt: new Date().toISOString(),
          onchain: { txHash: ``, onchainRepoId: found.id, fromChain: true },
        };
      }
    } catch (e) {
      return res.status(502).json({ error: `chain read failed: ${e.message}` });
    }
  }
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

  // Real on-chain closeout when configured (lender key + deployed RepoDesk).
  const onchainId = r.onchain?.onchainRepoId ?? r.onchain?.repoId;
  if (isLive() && onchainId != null) {
    try {
      const co = await closeoutOnchain(onchainId);
      r.closeout.txHash = co.txHash;
      r.closeout.onchain = true;
    } catch (e) {
      r.closeout.onchainError = e.message;
    }
  }

  repoStore.update(r.id, r);
  logAudit({ type: "repo_closeout", repoId: r.id, reason: r.closeout.reason, travelRule: r.travelRule });

  res.json({ repo: r });
});

// ------------------------------------------------------------------ audit

app.get("/repos/:id/audit", async (req, res) => {
  let r = repoStore.get(req.params.id);
  if (!r && isLive()) {
    try {
      const chain = await listReposOnchain();
      const found = chain.find((c) => c.id === Number(req.params.id));
      if (found) {
        r = {
          id: found.id,
          borrower: found.borrower,
          lender: found.lender,
          collateralAmount: found.collateralAmount,
          cashAmount: found.cashAmount,
          status: found.closed ? "CLOSED_OUT" : "OPEN",
          travelRule: `onchain-${found.id}`,
          createdAt: new Date().toISOString(),
          onchain: { txHash: ``, onchainRepoId: found.id, fromChain: true },
        };
      }
    } catch (e) {
      return res.status(502).json({ error: `chain read failed: ${e.message}` });
    }
  }
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
