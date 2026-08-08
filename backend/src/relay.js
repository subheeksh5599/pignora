import { config } from "./config.js";
import { cleanverse } from "./cleanverse.js";
import { JsonRpcProvider, Wallet, Contract } from "ethers";

const STATUS_TO_ENUM = { ACTIVE: 1, FROZEN: 2, REVOKED: 3, EXPIRED: 4, UNVERIFIED: 0 };

/** Encode a cvRecordId (numeric string or hash) as bytes32 for on-chain storage. */
function toBytes32(v) {
  const s = String(v ?? "");
  if (s.startsWith("0x") && s.length === 66) return s;
  if (/^\d+$/.test(s)) return "0x" + BigInt(s).toString(16).padStart(64, "0");
  return "0x" + Buffer.from(s).toString("hex").padEnd(64, "0").slice(0, 64);
}

/**
 * Identity relay: mirrors Cleanverse A-Pass state into the on-chain
 * IdentityRegistry (sandbox mode) or the mock ledger (mock mode).
 *
 * This is the credential-event channel: revocation / freeze / expiry of a
 * counterparty is pushed here, which is what triggers RepoDesk closeout.
 */
class Relay {
  constructor() {
    this.registryContract = null;
    this.wallet = null;
    this.isSandboxLive = config.mode === "sandbox" && Boolean(config.apiId && config.apiKey);
    if (config.mode === "sandbox" && config.relayKey && config.identityRegistry && config.monadRpc) {
      try {
        const provider = new JsonRpcProvider(config.monadRpc, config.monadChainId, { staticNetwork: true });
        this.wallet = new Wallet(config.relayKey, provider);
        this.registryContract = new Contract(
          config.identityRegistry,
          [
            "function setProfile(address account,uint8 status,uint8 tier,uint64 expiry,bytes32 cvRecordId) external",
            "function relay() view returns (address)",
            "function isActive(address) view returns (bool)",
            "function tierOf(address) view returns (uint8)",
          ],
          this.wallet
        );
      } catch (e) {
        console.warn("[relay] sandbox init failed, relay writes disabled:", e.message);
      }
    }
  }

  /**
   * Set/update an account's compliance state. `simulate` events are the demo
   * mechanism for credential events (revocation, freeze, expiry).
   *
   * sandbox mode: ACTIVE/FROZEN map to the REAL Cleanverse update_status
   * endpoint (1 activate / 2 freeze) — the real credential event — and the
   * verdict is mirrored into the on-chain IdentityRegistry when configured.
   */
  async setProfile(address, { status, tier, expiry, cvRecordId }, source = "api") {
    const profile = { address, status, tier: tier ?? 0, expiry: expiry ?? 0, cvRecordId: cvRecordId ?? `cv-${address.slice(0, 8)}` };

    // Real credential event via the Cleanverse cooperate API (sandbox only).
    if (this.isSandboxLive) {
      try {
        if (status === "ACTIVE" || status === "FROZEN") {
          const r = await cleanverse.updateStatus({
            wallet: address,
            status: status === "ACTIVE" ? 1 : 2,
            cvRecordId: cvRecordId || undefined,
          });
          profile.cleanverse = r;
        } else {
          profile.cleanverse = { note: `status ${status} has no update_status mapping (1/2 only); mirrored locally` };
        }
      } catch (e) {
        profile.cleanverse = { error: e.message };
      }
    }

    if (this.registryContract) {
      const statusEnum = STATUS_TO_ENUM[status] ?? 0;
      const tx = await this.registryContract.setProfile(address, statusEnum, profile.tier, profile.expiry, toBytes32(profile.cvRecordId));
      await tx.wait();
      profile.txHash = tx.hash;
    } else if (cleanverse.isMock()) {
      cleanverse.mockIdentities.set(address.toLowerCase(), {
        status,
        tier: profile.tier,
        expiry: profile.expiry,
        cvRecordId: profile.cvRecordId,
      });
    } else {
      // sandbox mode without a relay key: mirror locally so the demo still works
      cleanverse.mockIdentities.set(address.toLowerCase(), {
        status,
        tier: profile.tier,
        expiry: profile.expiry,
        cvRecordId: profile.cvRecordId,
      });
    }

    profile.source = source;
    return profile;
  }

  /** Verify an account against Cleanverse and push the verdict on-chain. */
  async verifyAndMirror(address) {
    const v = await cleanverse.verifyApass(address);
    const profile = v.profile;
    if (!profile) {
      await this.setProfile(address, { status: "UNVERIFIED", tier: 0 }, "verify_apass");
      return { address, passed: false, code: v.code };
    }
    await this.setProfile(
      address,
      { status: profile.status, tier: profile.tier, expiry: profile.expiry, cvRecordId: profile.cvRecordId },
      "verify_apass"
    );
    return { address, passed: v.passed, code: v.code };
  }
}

export const relay = new Relay();
