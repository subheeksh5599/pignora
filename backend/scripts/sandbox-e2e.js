/**
 * On-chain E2E against real contracts (anvil): exercises the ethers wiring
 * that Foundry tests don't cover — relay writes to IdentityRegistry, then a
 * full repo lifecycle through RepoDesk.
 *
 *   anvil --port 8545 &
 *   forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
 *   IDENTITY_REGISTRY_ADDRESS=0x.. REPO_DESK_ADDRESS=0x.. MOCK_USD=0x.. MOCK_BOND=0..
 *   RELAY_KEY=<anvil default private key> \
 *   MONAD_RPC=http://localhost:8545 node scripts/sandbox-e2e.js
 */
import "dotenv/config";
import { JsonRpcProvider, Wallet, Contract } from "ethers";

const RPC = process.env.MONAD_RPC || "http://localhost:8545";
const KEY = process.env.RELAY_KEY || "";
const REGISTRY = process.env.IDENTITY_REGISTRY_ADDRESS || "";
const DESK = process.env.REPO_DESK_ADDRESS || "";
const MOCK_USD = process.env.MOCK_USD || "";
const MOCK_BOND = process.env.MOCK_BOND || "";

const provider = new JsonRpcProvider(RPC, 31337, { staticNetwork: true });
const wallet = new Wallet(KEY, provider);
const log = (s) => console.log(`== ${s}`);

const registryAbi = [
  "function setProfile(address account,uint8 status,uint8 tier,uint64 expiry,bytes32 cvRecordId) external",
  "function isActive(address) view returns (bool)",
  "function tierOf(address) view returns (uint8)",
  "function haircutOf(address) view returns (uint16)",
];
const deskAbi = [
  "function openRepo(address borrower,address collateralToken,address cashToken,uint256 collateralAmount,uint256 cashAmount,uint256 feeBps,uint64 term,bytes32 travelRule) external returns (uint256)",
  "function executeCloseout(uint256) external",
  "function getRepo(uint256) view returns (address,address,address,address,uint256,uint256,uint256,uint256,uint64,uint64,bool)",
  "function escrowed(uint256,address) view returns (uint256)",
];
const erc20Abi = [
  "function mint(address,uint256) external",
  "function approve(address,uint256) external returns (bool)",
  "function balanceOf(address) view returns (uint256)",
];

const toBytes32 = (s) => "0x" + Buffer.from(s, "utf8").toString("hex").padEnd(64, "0");
const CV_TIER3 = toBytes32("mock-cv-tier3");
const CV_TIER2 = toBytes32("mock-cv-tier2");
const CV_TRAVEL = toBytes32("travel-rule-onchain");

// anvil default accounts (funded): #0 = borrower/relay wallet, #1 = lender
const BORROWER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const LENDER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const LENDER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const registry = new Contract(REGISTRY, registryAbi, wallet);
const desk = new Contract(DESK, deskAbi, wallet);
const usd = new Contract(MOCK_USD, erc20Abi, wallet);
const bond = new Contract(MOCK_BOND, erc20Abi, wallet);
const lenderSigner = new Wallet(LENDER_KEY, provider);

// Explicit nonce management: ethers' Wallet cache desyncs when explicit
// nonces are mixed with auto-nonce sends.
let wNonce = await wallet.getNonce();
let lNonce = await provider.getTransactionCount(LENDER);

async function wTx(promiseFactory) {
  const tx = await promiseFactory({ nonce: wNonce++ });
  return tx.wait();
}

async function lTx(promiseFactory) {
  const tx = await promiseFactory({ nonce: lNonce++ });
  return tx.wait();
}

log("1. relay writes identities ON-CHAIN (A-Pass mirror)");
await wTx((o) => registry.setProfile(BORROWER, 1, 50, 4102444800, CV_TIER3, o));
await wTx((o) => registry.setProfile(LENDER, 1, 20, 4102444800, CV_TIER2, o));
console.log(`borrower active=${await registry.isActive(BORROWER)} tier=${await registry.tierOf(BORROWER)} haircut=${Number(await registry.haircutOf(BORROWER)) / 100}%`);
console.log(`lender   active=${await registry.isActive(LENDER)} tier=${await registry.tierOf(LENDER)} haircut=${Number(await registry.haircutOf(LENDER)) / 100}%`);

log("2. fund + approve (mock stand-ins; real aUSDC on testnet)");
await wTx((o) => usd.mint(LENDER, 10_000_000_000_000n, o));
await wTx((o) => bond.mint(BORROWER, 1_000_000_000_000n, o));
await wTx((o) => bond.approve(DESK, 2n ** 256n - 1n, o)); // borrower = wallet
await lTx((o) => usd.connect(lenderSigner).approve(DESK, 2n ** 256n - 1n, o));

log("3. open repo — tier-3 haircut (2%) allows 98% LTV");
await lTx((o) =>
  desk.connect(lenderSigner).openRepo(
    BORROWER,
    MOCK_BOND,
    MOCK_USD,
    1_000_000_000_000n,
    980_000_000_000n,
    50n,
    7n * 24n * 3600n,
    CV_TRAVEL,
    o
  )
);
console.log(`desk holds collateral: ${await bond.balanceOf(DESK)} units, cash: ${await usd.balanceOf(DESK)} micro`);

log("4. credential event — borrower REVOKED on-chain");
await wTx((o) => registry.setProfile(BORROWER, 3, 3, 0, CV_TIER3, o));
console.log(`borrower active now: ${await registry.isActive(BORROWER)}`);

log("5. compliant closeout — anyone can execute");
await wTx((o) => desk.executeCloseout(1n, o));
const [, , , , , , , , , , closed] = await desk.getRepo(1n);
const lenderEscrow = await desk.escrowed(1n, LENDER);
const borrowerEscrow = await desk.escrowed(1n, BORROWER);
console.log(`closed=${closed}`);
console.log(`lender escrowed: ${lenderEscrow} (expect 0 — lender is Active)`);
console.log(`borrower escrowed: ${borrowerEscrow} (revoked -> fail-closed, expect 15100000000)`);
console.log(`lender bond balance: ${await bond.balanceOf(LENDER)} (expect 984900000000)`);
console.log(`borrower bond balance: ${await bond.balanceOf(BORROWER)} (expect 0 — excess escrowed)`);

console.log("\nSANDBOX E2E OK — relay writes, repo open, revocation, closeout, escrow all on-chain");
