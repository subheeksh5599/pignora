// Fetch the aUSDC deposit address for the sandbox (per the Cleanverse team's
// guidance: query_deposit_address -> fund via faucet.circle.com on Monad testnet).
import "dotenv/config";
import { cleanverse } from "../src/cleanverse.js";

const out = { mode: cleanverse.isMock() ? "mock" : "sandbox" };
try {
  const d = await cleanverse.queryDepositAddress({ chain: "monad", symbol: "aUSDC" });
  out.depositAddress = d?.depositAddress ?? d;
  console.log(JSON.stringify(out, null, 2));
} catch (e) {
  out.error = e.message;
  console.log(JSON.stringify(out, null, 2));
  process.exit(1);
}
