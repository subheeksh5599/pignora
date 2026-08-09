import { Wallet, verifyTypedData } from "ethers";
import { config } from "./config.js";

/**
 * Operator authorization for credential events (EIP-712).
 *
 * The desk is an operator rail: a freeze / revoke / expire is a credential
 * event. Before the backend executes it (Cleanverse update_status + on-chain
 * registry flip), it must be authorized by a signature from the operator
 * wallet (the RELAY_KEY holder). The browser signs typed data via MetaMask;
 * the backend verifies it here, so no action can be spoofed by a random
 * caller who does not control the operator key.
 *
 * Domain: { name: "Pignora", version: "1", chainId: <chain>, verifyingContract: <repoDesk> }
 * Types:
 *   CredentialEvent(address subject, uint8 status, uint8 tier, uint256 nonce, uint256 timestamp)
 */

export const TYPES = {
  CredentialEvent: [
    { name: "subject", type: "address" },
    { name: "status", type: "uint8" },
    { name: "tier", type: "uint8" },
    { name: "nonce", type: "uint256" },
    { name: "timestamp", type: "uint256" },
  ],
};

export function operatorAddress() {
  if (!config.relayKey) return "";
  return new Wallet(config.relayKey).address;
}

export function domain() {
  return {
    name: "Pignora",
    version: "1",
    chainId: config.monadChainId,
    verifyingContract: config.repoDesk,
  };
}

/** Build the typed-data payload the browser signs. */
export function credentialEventPayload({ subject, status, tier, nonce, timestamp }) {
  return {
    domain: domain(),
    types: TYPES,
    primaryType: "CredentialEvent",
    message: {
      subject,
      status: Number(status),
      tier: Number(tier),
      nonce: BigInt(nonce).toString(),
      timestamp: BigInt(timestamp).toString(),
    },
  };
}

/**
 * Verify an EIP-712 signature for a credential event against the operator
 * wallet. Returns the recovered signer address; throws if it does not match.
 */
export function verifyCredentialEventSignature({ subject, status, tier, nonce, timestamp, signature }) {
  const expected = operatorAddress();
  if (!expected) throw new Error("operator not configured (RELAY_KEY missing)");
  if (!signature) throw new Error("signature required — sign the credential event with your wallet");
  const recovered = verifyTypedData(domain(), TYPES, {
    subject,
    status: Number(status),
    tier: Number(tier),
    nonce: BigInt(nonce).toString(),
    timestamp: BigInt(timestamp).toString(),
  }, signature);
  if (recovered.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`signature from ${recovered}, expected operator ${expected}`);
  }
  return recovered;
}
