import test from "node:test";
import assert from "node:assert/strict";

// Hermetic tests: force mock mode BEFORE the client modules load. dotenv does
// not override already-set env vars, so the real .env (sandbox mode + live
// credentials) never leaks into the test process.
process.env.CLEANVERSE_MODE = "mock";
process.env.CLEANVERSE_API_ID = "";
process.env.CLEANVERSE_API_KEY = "";

const { haircutForTier, maxLend, bucketOf } = await import("../src/config.js");
const { cleanverse } = await import("../src/cleanverse.js");
const { relay } = await import("../src/relay.js");
const { logAudit, readAudit } = await import("../src/audit.js");

const TIER3 = "0x1111111111111111111111111111111111111111";
const ANON = "0x9999999999999999999999999999999999999999";

test("policy: tier -> haircut bps", () => {
  assert.equal(haircutForTier(60), 200); // deep bucket (real tier >= 50)
  assert.equal(haircutForTier(20), 500); // standard bucket (real tier >= 20)
  assert.equal(haircutForTier(5), 1000); // basic bucket
});

test("policy: real tier bucketing (0-99 scale)", () => {
  assert.equal(bucketOf(50), 3);
  assert.equal(bucketOf(20), 2);
  assert.equal(bucketOf(10), 1);
  assert.equal(bucketOf(3), 3); // mock tier passes through
});

test("policy: maxLend respects haircut", () => {
  assert.equal(maxLend(1_000_000, 60), 980_000);
  assert.equal(maxLend(1_000_000, 5), 900_000);
});

test("cleanverse mock: verified tier-3 passes", async () => {
  const v = await cleanverse.verifyApass(TIER3);
  assert.equal(v.passed, true);
  assert.equal(v.reason, "ACTIVE");
});

test("cleanverse mock: unknown wallet fails the gate", async () => {
  const v = await cleanverse.verifyApass(ANON);
  assert.equal(v.passed, false);
});

test("relay: credential event changes the gate verdict", async () => {
  assert.equal((await cleanverse.verifyApass(TIER3)).passed, true);
  await relay.setProfile(TIER3, { status: "REVOKED", tier: 3 }, "test");
  const v = await cleanverse.verifyApass(TIER3);
  assert.equal(v.passed, false);
  assert.equal(v.reason, "STATUS_3");
  // restore
  await relay.setProfile(TIER3, { status: "ACTIVE", tier: 3, expiry: 4102444800 }, "test");
  assert.equal((await cleanverse.verifyApass(TIER3)).passed, true);
});

test("relay: freeze maps to status 2 (real update_status semantics)", async () => {
  await relay.setProfile(TIER3, { status: "FROZEN", tier: 3 }, "test");
  const v = await cleanverse.verifyApass(TIER3);
  assert.equal(v.passed, false);
  assert.equal(v.reason, "STATUS_2");
  await relay.setProfile(TIER3, { status: "ACTIVE", tier: 3, expiry: 4102444800 }, "test");
});

test("audit: append + read round trip", () => {
  const repoId = 9999;
  logAudit({ type: "test_event", repoId });
  const events = readAudit(repoId);
  assert.ok(events.length >= 1);
  assert.equal(events[events.length - 1].type, "test_event");
});
