import "dotenv/config";

export const config = {
  mode: process.env.CLEANVERSE_MODE || "sandbox",
  apiBase: process.env.CLEANVERSE_API || "https://uatapi.cleanverse.com/api/skills",
  cooperateBase: process.env.CLEANVERSE_COOPERATE_API || "https://uatapi.cleanverse.com/api/cooperate",
  apiId: process.env.CLEANVERSE_API_ID || "",
  apiKey: process.env.CLEANVERSE_API_KEY || "", // Base64 AES key — never sent, never committed
  chain: process.env.CLEANVERSE_CHAIN || "monad",
  monadChainId: Number(process.env.MONAD_CHAIN_ID || 10143),
  monadRpc: process.env.MONAD_RPC || "",
  ausdc: process.env.AUSDC_ADDRESS || "",
  apass: process.env.APASS_ADDRESS || "",
  repoDesk: process.env.REPO_DESK_ADDRESS || "",
  identityRegistry: process.env.IDENTITY_REGISTRY_ADDRESS || "",
  relayKey: process.env.RELAY_KEY || "",
  port: Number(process.env.PORT || 8787),
};

/** A-Pass status codes (Cleanverse API v3, verified from sponsor skill pack) */
export const APASS = {
  PASS: 4,
  FROZEN: 2,
  REVOKED: 3,
  EXPIRED: 5,
};

/** Normalize A-Pass status to a number: real API uses 1/2, mock uses strings. */
export function normalizeStatus(s) {
  if (typeof s === "number") return s;
  if (s === "ACTIVE") return 1;
  if (s === "FROZEN") return 2;
  if (s === "REVOKED") return 3;
  if (s === "EXPIRED") return 4;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** A-Pass tier scale (API v5.6): numeric 0-99, rules compare tier > min_tier. */
export const HAIRCUT_BPS = { 3: 200, 2: 500, 1: 1000 }; // buckets: 3 deep, 2 standard, 1 basic

/** Map a real A-Pass tier (0-99) into our risk buckets (1-3). Mock tiers (1-3) pass through. */
export function bucketOf(tier) {
  const t = Number(tier);
  if (t <= 3) return t >= 1 ? t : 1; // mock mode tiers
  if (t >= 50) return 3;
  if (t >= 20) return 2;
  return 1;
}

export function haircutForTier(tier) {
  return HAIRCUT_BPS[bucketOf(tier)] ?? 1000;
}

/** Maximum cash lendable against collateral value for a given tier. */
export function maxLend(collateralValue, tier) {
  const h = haircutForTier(tier);
  return (collateralValue * (10000 - h)) / 10000;
}
