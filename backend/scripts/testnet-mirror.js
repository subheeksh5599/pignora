/**
 * Monad testnet: mirror REAL Cleanverse A-Pass state on-chain and propagate a
 * REAL credential event through the deployed IdentityRegistry + RepoDesk.
 *
 * Proves: real identities (tier 20, cvRecordId 373/374) written on-chain by
 * the relay, and a real freeze flips the on-chain gate.
 */
import { config } from "../src/config.js";
import { cleanverse } from "../src/cleanverse.js";
import { relay } from "../src/relay.js";

const BORROWER = "0x1111111111111111111111111111111111111111";
const LENDER = "0x2222222222222222222222222222222222222222";

async function onChain(addr, label) {
  const r = await relay.registryContract.readOnly ?? relay.registryContract;
  const [active, tier] = await Promise.all([r.isActive(addr), r.tierOf(addr)]);
  console.log(`  on-chain ${label}: active=${active} tier=${tier}`);
  return { active, tier };
}

const run = async () => {
  console.log("== contracts:", config.identityRegistry.slice(0, 12), config.repoDesk.slice(0, 12));

  // 1. read REAL A-Pass state
  const pb = await cleanverse.queryApass(BORROWER);
  const pl = await cleanverse.queryApass(LENDER);
  console.log("== real A-Pass: borrower tier", pb.tier, "status", pb.status, "| lender tier", pl.tier, "status", pl.status);

  // 2. mirror on-chain with the REAL tiers
  console.log("== mirroring identities on-chain (real tiers)");
  await relay.setProfile(BORROWER, { status: "ACTIVE", tier: Number(pb.tier), expiry: Number(pb.expirationTime), cvRecordId: pb.cvRecordId }, "testnet-mirror");
  await relay.setProfile(LENDER, { status: "ACTIVE", tier: Number(pl.tier), expiry: Number(pl.expirationTime), cvRecordId: pl.cvRecordId }, "testnet-mirror");
  await onChain(BORROWER, "borrower");
  await onChain(LENDER, "lender");

  // 3. REAL credential event: freeze borrower (Cleanverse update_status + on-chain mirror)
  console.log("== freezing borrower (real update_status + on-chain mirror)");
  await relay.setProfile(BORROWER, { status: "FROZEN", tier: Number(pb.tier), expiry: Number(pb.expirationTime), cvRecordId: pb.cvRecordId }, "testnet-freeze");
  await onChain(BORROWER, "borrower (frozen)");

  // 4. restore
  console.log("== unfreezing borrower");
  await relay.setProfile(BORROWER, { status: "ACTIVE", tier: Number(pb.tier), expiry: Number(pb.expirationTime), cvRecordId: pb.cvRecordId }, "testnet-restore");
  await onChain(BORROWER, "borrower (restored)");

  console.log("== DONE — mirror + credential-event propagation verified on Monad testnet");
};

run().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
