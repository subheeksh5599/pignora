// Check the A-Pass status of the deposit pool wallet (per the chat: the aUSDC
// transfer gate checks the FROM wallet's A-Pass too — TransferNotAllowed if it
// lost its credential).
import "dotenv/config";
import { cleanverse } from "../src/cleanverse.js";

const WALLET = process.argv[2] ?? "0x15fd89cf0356B547650e7F8Bab8e6DA2880f99bA";
try {
  const v = await cleanverse.verifyApass(WALLET, "monad");
  console.log(JSON.stringify({ wallet: WALLET, passed: v.passed, code: v.code, reason: v.reason, profile: v.profile }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ wallet: WALLET, error: e.message }, null, 2));
}
