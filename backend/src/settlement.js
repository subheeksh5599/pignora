/**
 * On-chain settlement: executes REAL RepoDesk transactions on Monad testnet
 * when the backend is configured (sandbox mode + relay key + deployed
 * contracts). Without keys this module stays inert and the API falls back to
 * store-only orchestration.
 *
 * Mirrors the verified testnet-repo.js flow: identities -> fund -> approve ->
 * openRepo -> (closeout) executeCloseout.
 */
import { JsonRpcProvider, Wallet, Contract, parseEther } from "ethers";
import { config } from "./config.js";
import { cleanverse } from "./cleanverse.js";
import { relay } from "./relay.js";
import { ABIS } from "./abis.js";

const loadABI = (name) => ABIS[name];

const AUSDC = config.ausdc || "";
const BOND = config.bond || "";
const MOCK_USD = config.mockUsd || "";
const BOND_DEC = 6;

export function isLive() {
  return (
    config.mode === "sandbox" &&
    Boolean(config.relayKey && config.lenderKey && config.monadRpc && config.repoDesk && config.identityRegistry && config.ausdc && config.bond)
  );
}

let _provider = null;
function provider() {
  if (!_provider) _provider = new JsonRpcProvider(config.monadRpc, config.monadChainId, { staticNetwork: true });
  return _provider;
}

/**
 * Open a REAL repo on-chain. Mirrors testnet-repo.js: mints BOND collateral
 * for the borrower (deployer), funds the lender, both approve the desk, then
 * openRepo on the deployed RepoDesk. Returns the tx hash.
 */
export async function openRepoOnchain({ borrower, lender, collateralAmount, cashAmount, feeBps, termDays, travelRule }) {
  const p = provider();
  const borrowerWallet = new Wallet(config.relayKey, p);
  const lenderWallet = new Wallet(config.lenderKey, p);
  const desk = new Contract(config.repoDesk, loadABI("RepoDesk"), p);
  const bond = new Contract(BOND, loadABI("MockBond"), p);
  const usdc = new Contract(AUSDC, loadABI("ERC20"), p);
  let bn = await borrowerWallet.getNonce();
  let ln = await lenderWallet.getNonce();
  const btx = (fn) => fn({ nonce: bn++ });
  const ltx = (fn) => fn({ nonce: ln++ });

  // borrower = relay key holder (deployer). Mirror identity on-chain if needed.
  const pb = await cleanverse.queryApass(borrowerWallet.address);
  if (!pb) throw new Error(`borrower ${borrowerWallet.address} has no A-Pass`);
  if (!(await registryActive(borrowerWallet.address))) {
    await btx(() => setProfile(borrowerWallet.address, pb, 1)).then((t) => t.wait());
  }

  // lender funding: gas MON
  if ((await p.getBalance(lenderWallet.address)) < parseEther("0.05")) {
    await borrowerWallet.sendTransaction({ to: lenderWallet.address, value: parseEther("0.2") }).then((t) => t.wait());
  }
  const pl = await cleanverse.queryApass(lenderWallet.address);
  if (!pl) throw new Error(`lender ${lenderWallet.address} has no A-Pass`);

  // cash leg: prefer the lender's held aUSDC (correct address 0xaC0893…);
  // else fall back to MockUSD which transfers freely through the desk.
  // (PNGUSD is issued as Pignora's CVA but its A-Token transfer gate blocks
  // transfers to the desk — the same compliance blocker the team confirmed
  // for aUSDC; settlement txs are real regardless of the cash token.)
  let cash = null;
  let cashLabel = "";
  const cashBig = BigInt(String(cashAmount));
  if ((await usdc.balanceOf(lenderWallet.address)) >= cashBig) {
    cash = usdc;
    cashLabel = "aUSDC";
  } else if (MOCK_USD) {
    cash = new Contract(MOCK_USD, loadABI("MockUSD"), p);
    cashLabel = "MockUSD";
    const c = cash.connect(borrowerWallet);
    await c.mint(lenderWallet.address, cashBig).then((t) => t.wait());
  }
  if (!cash) throw new Error("no cash token available");

  // collateral: borrower mints BOND + approves desk
  const bondBig = BigInt(String(collateralAmount));
  const bondB = bond.connect(borrowerWallet);
  if ((await bond.balanceOf(borrowerWallet.address)) < bondBig) {
    await bondB.mint(borrowerWallet.address, bondBig).then((t) => t.wait());
  }
  await bondB.approve(config.repoDesk, bondBig).then((t) => t.wait());

  // lender approves cash + opens the repo
  await cash.connect(lenderWallet).approve(config.repoDesk, cashBig).then((t) => t.wait());
  const CASH_ADDR = await cash.getAddress();
  const travelBytes = "0x" + Buffer.from(String(travelRule)).toString("hex").padEnd(64, "0").slice(0, 64);
  const openTx = await desk
    .connect(lenderWallet)
    .openRepo(borrowerWallet.address, BOND, CASH_ADDR, bondBig, cashBig, BigInt(feeBps), BigInt(termDays) * 86400n, travelBytes);
  const rec = await openTx.wait();

  // read the real on-chain repo id from the RepoOpened event
  let onchainRepoId = null;
  const ev = rec.logs?.find((l) => l?.fragment?.name === "RepoOpened");
  if (ev?.args) onchainRepoId = Number(ev.args[0]);

  return { txHash: openTx.hash, cashToken: CASH_ADDR, cashLabel, gasUsed: rec.gasUsed?.toString(), onchainRepoId };
}

/** Execute the on-chain closeout for a repo id. Returns the tx hash. */
export async function closeoutOnchain(onchainRepoId) {
  const p = provider();
  const lenderWallet = new Wallet(config.lenderKey, p);
  const desk = new Contract(config.repoDesk, loadABI("RepoDesk"), p);
  const tx = await desk.connect(lenderWallet).executeCloseout(BigInt(onchainRepoId));
  const rec = await tx.wait();
  return { txHash: tx.hash, gasUsed: rec.gasUsed?.toString() };
}

/** List ALL repos straight from the deployed RepoDesk (chain = source of truth). */
export async function listReposOnchain() {
  const p = provider();
  const desk = new Contract(config.repoDesk, loadABI("RepoDesk"), p);
  const count = Number(await desk.repoCounter());
  const out = [];
  for (let i = 1; i <= count; i++) {
    try {
      const r = await desk.getRepo(i);
      out.push({
        id: i,
        borrower: r.borrower,
        lender: r.lender,
        collateralToken: r.collateralToken,
        cashToken: r.cashToken,
        collateralAmount: r.collateralAmount.toString(),
        cashAmount: r.cashAmount.toString(),
        feeBps: Number(r.feeBps),
        collateralValue: r.collateralValue.toString(),
        termEnd: Number(r.termEnd),
        marginDeadline: Number(r.marginDeadline),
        closed: r.closed,
      });
    } catch {
      // repo not initialized — skip
    }
  }
  return out;
}

/** Look up the REAL open + closeout tx hashes from chain events (no store dependency). */
export async function repoTxHashes(chain) {
  if (!chain.length) return {};
  const p = provider();
  const desk = new Contract(config.repoDesk, loadABI("RepoDesk"), p);
  const iface = desk.interface;
  const openTopic = iface.getEvent("RepoOpened").topicHash;
  const closeTopic = iface.getEvent("CloseoutExecuted").topicHash;
  const latest = await p.getBlockNumber();
  const out = {};
  const step = 900;
  const WINDOW = 30_000; // repos were opened recently; no need to scan genesis
  for (let from = Math.max(0, latest - WINDOW); from < latest; from += step) {
    const to = Math.min(from + step - 1, latest);
    const handle = (l) => {
      if (l.topics[0] === openTopic) {
        const parsed = iface.parseLog(l);
        out[Number(parsed.args[0])] = { ...(out[Number(parsed.args[0])] ?? {}), openTxHash: l.transactionHash };
      } else if (l.topics[0] === closeTopic) {
        const parsed = iface.parseLog(l);
        out[Number(parsed.args[0])] = { ...(out[Number(parsed.args[0])] ?? {}), closeTxHash: l.transactionHash };
      }
    };
    try {
      const logs = await p.getLogs({ address: config.repoDesk, fromBlock: from, toBlock: to });
      for (const l of logs) handle(l);
    } catch {
      try {
        const mid = Math.floor((from + to) / 2);
        const a = await p.getLogs({ address: config.repoDesk, fromBlock: from, toBlock: mid });
        const b = await p.getLogs({ address: config.repoDesk, fromBlock: mid + 1, toBlock: to });
        for (const l of [...a, ...b]) handle(l);
      } catch {
        // give up on this window
      }
    }
    if (Object.keys(out).length >= chain.length) break;
  }
  return out;
}

async function registryActive(address) {
  const p = provider();
  const registry = new Contract(config.identityRegistry, loadABI("IdentityRegistry"), p);
  return registry.isActive(address);
}

async function setProfile(address, profile, status) {
  const p = provider();
  const wallet = new Wallet(config.relayKey, p);
  const registry = new Contract(config.identityRegistry, loadABI("IdentityRegistry"), wallet);
  const cv = "0x" + BigInt(profile.cvRecordId).toString(16).padStart(64, "0");
  return registry.setProfile(address, status, Number(profile.tier), Number(profile.expirationTime), cv);
}
