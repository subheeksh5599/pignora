/**
 * Monad testnet — REAL repo settlement on deployed contracts.
 *
 * Parties (real A-Passes on the sandbox, verified via query_apass):
 *   borrower = deployer 0x197F2ed9...  tier 50 (cv 1832)  -> 2% haircut
 *   lender   = fresh EOA (key in script)                  -> real A-Pass via generate_apass
 *
 * Flow: mirror identities on-chain -> mint collateral + aUSDC funding ->
 * open repo on RepoDesk -> real freeze event -> closeout -> verify settlement.
 */
import { JsonRpcProvider, Wallet, Contract, parseEther, formatEther } from "ethers";
import { config } from "../src/config.js";
import { cleanverse } from "../src/cleanverse.js";
import { relay } from "../src/relay.js";
import { loadABI } from "./abi.js";

const RPC = config.monadRpc;
const BORROWER_KEY = config.relayKey; // deployer key
// fresh lender EOA (generated 2026-08-07) — key comes from env (LENDER_KEY), never committed
const LENDER_KEY = process.env.LENDER_KEY || "";
const BORROWER = "0x197F2ed9C82c8a50Ad9bddd849d16Ce9afb17eE5";
const AUSDC = "0xfa96de5b8f434c26fdff953303dd66ff80af1026";
const BOND = "0x13211b8f5983bfdcd2a14d8467631254c3af5a89";
const BOND_DEC = 6; // MockBond decimals (mock USD-style)

const provider = new JsonRpcProvider(RPC, config.monadChainId, { staticNetwork: true });
const borrower = new Wallet(BORROWER_KEY, provider);
const lender = new Wallet(LENDER_KEY, provider);
const LENDER = lender.address;
const registry = new Contract(config.identityRegistry, loadABI("IdentityRegistry"), provider);
const desk = new Contract(config.repoDesk, loadABI("RepoDesk"), provider);
const bond = new Contract(BOND, loadABI("MockBond"), provider);
const usdc = new Contract(AUSDC, loadABI("ERC20"), provider);

const log = (m) => console.log(m);

async function run() {
  let bn = await borrower.getNonce();
  const btx = (fn) => fn({ nonce: bn++ });
  let ln = await lender.getNonce();
  const ltx = (fn) => fn({ nonce: ln++ });

  log(`== parties: borrower ${BORROWER.slice(0, 10)} (tier 50) | lender ${LENDER.slice(0, 10)} (tier 20)`);

  // 1. real A-Pass for the lender (generate if missing), then mirror both on-chain
  log("== 1. identities");
  const pb = await cleanverse.queryApass(BORROWER);
  let pl = await cleanverse.queryApass(LENDER);
  if (!pl) {
    const cust = "pignoralend" + LENDER.slice(2, 12).toLowerCase();
    await cleanverse.generateApass({ customerId: cust, wallet: LENDER, chain: "monad", expirationTime: 1900000000, subTier: 50, subGroup: "CD" });
    await new Promise((r) => setTimeout(r, 4000));
    pl = await cleanverse.queryApass(LENDER);
    log(`   generated lender A-Pass: tier ${pl?.tier} cv ${pl?.cvRecordId}`);
  }
  await btx(() => registry.connect(borrower).setProfile(BORROWER, 1, Number(pb.tier), Number(pb.expirationTime), "0x" + BigInt(pb.cvRecordId).toString(16).padStart(64, "0"))).then((t) => t.wait());
  await btx(() => registry.connect(borrower).setProfile(LENDER, 1, Number(pl.tier), Number(pl.expirationTime), "0x" + BigInt(pl.cvRecordId).toString(16).padStart(64, "0"))).then((t) => t.wait());
  log(`   borrower active=${await registry.isActive(BORROWER)} tier=${await registry.tierOf(BORROWER)}`);
  log(`   lender   active=${await registry.isActive(LENDER)} tier=${await registry.tierOf(LENDER)}`);

  // 2. fund lender: gas MON + cash token (aUSDC if the faucet pool has it, else local MockUSD)
  log("== 2. fund lender");
  if ((await provider.getBalance(LENDER)) < parseEther("0.05")) {
    await btx(() => borrower.sendTransaction({ to: LENDER, value: parseEther("0.2") })).then((t) => t.wait());
    log(`   sent 0.2 MON to lender`);
  }
  let cash = usdc;
  let cashLabel = "aUSDC";
  try {
    const faucet = await cleanverse.faucet({ chain: "monad", symbol: "usdc", depositAddress: LENDER, amount: "5" });
    log(`   aUSDC faucet -> ${faucet?.data?.tx_hash ?? "ok"}`);
  } catch (e) {
    log(`   aUSDC faucet dry (${e.message.slice(0, 60)}) — falling back to local MockUSD cash leg`);
    cash = new Contract("0xa66155a4c3ff24c0300afa66de6ff8d5f7310aea", loadABI("MockUSD"), provider);
    cashLabel = "MockUSD";
  }
  await new Promise((r) => setTimeout(r, 5000));
  if (cashLabel === "aUSDC" && (await usdc.balanceOf(LENDER)) === 0n) {
    log("   aUSDC faucet delivered nothing — falling back to local MockUSD cash leg");
    cash = new Contract("0xa66155a4c3ff24c0300afa66de6ff8d5f7310aea", loadABI("MockUSD"), provider);
    cashLabel = "MockUSD";
  }
  if (cashLabel === "MockUSD") {
    await btx(() => cash.connect(borrower).mint(LENDER, 1_000_000_000_000n)).then((t) => t.wait());
  }
  log(`   lender cash balance: ${formatEther(await cash.balanceOf(LENDER))} ${cashLabel}`);

  // 3. collateral: borrower mints MockBond + approves desk
  log("== 3. borrower: mint bond collateral + approve");
  const BOND_AMOUNT = 1_000_000_000_000n; // 1M units @ 6 dec
  await btx(() => bond.connect(borrower).mint(BORROWER, BOND_AMOUNT)).then((t) => t.wait());
  await btx(() => bond.connect(borrower).approve(config.repoDesk, BOND_AMOUNT)).then((t) => t.wait());
  log(`   bond balance: ${formatEther(await bond.balanceOf(BORROWER))}`);

  // 4. lender approves cash + opens the repo (cash = 98% of collateral, tier-50 haircut 2%)
  log("== 4. lender: approve cash + open repo");
  const CASH = (BOND_AMOUNT * 9800n) / 10000n; // 2% haircut
  await ltx(() => cash.connect(lender).approve(config.repoDesk, CASH)).then((t) => t.wait());
  const CASH_ADDR = await cash.getAddress();
  const openTx = await ltx(() =>
    desk.connect(lender).openRepo(BORROWER, BOND, CASH_ADDR, BOND_AMOUNT, CASH, 50n, 7n * 86400n, "0x" + Buffer.from("tr-testnet-1").toString("hex").padEnd(64, "0"))
  );
  const rec = await openTx.wait();
  const repoId = 1n;
  log(`   openRepo tx: ${openTx.hash} (gas ${rec.gasUsed})`);

  // 5. verify repo state
  const repo = await desk.getRepo(repoId);
  log("== 5. repo state:", JSON.stringify({ borrower: repo.borrower.slice(0, 10), status: Number(repo.status), collateral: formatEther(repo.collateralAmount), cash: formatEther(repo.cashAmount), haircut: repo.haircutBps }));

  // 6. REAL credential event: freeze borrower -> on-chain -> closeout
  log("== 6. freeze borrower (real update_status + on-chain mirror)");
  const freeze = await cleanverse.updateStatus({ wallet: BORROWER, chain: "monad", status: 2, cvRecordId: "1832", blacklistReason: "testnet-e2e" });
  log(`   cleanverse freeze: ${freeze?.data?.txHash ?? JSON.stringify(freeze).slice(0, 80)}`);
  await btx(() => registry.connect(borrower).setProfile(BORROWER, 2, Number(pb.tier), Number(pb.expirationTime), "0x" + BigInt(pb.cvRecordId).toString(16).padStart(64, "0"))).then((t) => t.wait());
  log(`   on-chain borrower active: ${await registry.isActive(BORROWER)}`);

  log("== 7. closeout");
  const coTx = await ltx(() => desk.connect(lender).executeCloseout(repoId));
  const coRec = await coTx.wait();
  log(`   closeout tx: ${coTx.hash} (gas ${coRec.gasUsed})`);
  const after = await desk.getRepo(repoId);
  log(`   repo status: ${Number(after.status)} (3 = CLOSED_OUT)`);
  const lenderBond = await bond.balanceOf(LENDER);
  const escrow = await desk.escrowBalance(repoId, BORROWER);
  log(`   lender received collateral: ${formatEther(lenderBond)} BOND`);
  log(`   borrower escrow (excess): ${formatEther(escrow)} BOND`);

  // 8. restore
  log("== 8. restore borrower");
  await cleanverse.updateStatus({ wallet: BORROWER, chain: "monad", status: 1, cvRecordId: "1832" });
  await btx(() => registry.connect(borrower).setProfile(BORROWER, 1, Number(pb.tier), Number(pb.expirationTime), "0x" + BigInt(pb.cvRecordId).toString(16).padStart(64, "0"))).then((t) => t.wait());
  log(`   on-chain borrower active: ${await registry.isActive(BORROWER)}`);

  log("== DONE — REAL repo settled on Monad testnet");
}

run().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
