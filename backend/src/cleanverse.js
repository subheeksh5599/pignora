import { config, APASS, normalizeStatus } from "./config.js";
import { encryptBody, decryptBody } from "./aes.js";

/**
 * Cleanverse client (API v5.6).
 *
 * mock    — deterministic offline implementation (default; used for the local
 *           demo). Identity set is seeded explicitly and labelled MOCK.
 * sandbox — live calls to the Cleanverse cooperate API
 *           (uatapi.cleanverse.com/api/cooperate) with the api-id header.
 *           Write endpoints (generate_apass, update_status, atoken/*) send
 *           AES-CBC-encrypted bodies keyed by the Base64 api-key (never sent).
 */
class CleanverseClient {
  constructor(mode = config.mode) {
    this.mode = mode;
    // Mock identity ledger: wallet -> { status, tier, expiry, cvRecordId }
    // MOCK DATA ONLY — never used when CLEANVERSE_MODE=sandbox.
    this.mockIdentities = new Map([
      [
        "0x1111111111111111111111111111111111111111",
        { status: "ACTIVE", tier: 3, expiry: 4102444800, cvRecordId: "mock-cv-tier3-bank" },
      ],
      [
        "0x2222222222222222222222222222222222222222",
        { status: "ACTIVE", tier: 2, expiry: 4102444800, cvRecordId: "mock-cv-tier2" },
      ],
      [
        "0x3333333333333333333333333333333333333333",
        { status: "ACTIVE", tier: 1, expiry: 4102444800, cvRecordId: "mock-cv-tier1" },
      ],
      [
        "0x4444444444444444444444444444444444444444",
        { status: "REVOKED", tier: 3, expiry: 0, cvRecordId: "mock-cv-revoked" },
      ],
      // Local clone-and-run seed accounts (dev-up.sh): the same wallets the
      // E2E seed mirrors on-chain — anvil #0 (tier 50, 2% cap) and anvil #1
      // (tier 20, 5% cap). Keeps the desk usable with no Cleanverse creds.
      [
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        { status: "ACTIVE", tier: 50, expiry: 4102444800, cvRecordId: "seed-cv-t50" },
      ],
      [
        "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        { status: "ACTIVE", tier: 20, expiry: 4102444800, cvRecordId: "seed-cv-t20" },
      ],
    ]);
  }

  isMock() {
    return this.mode !== "sandbox";
  }

  get _headers() {
    return { "Content-Type": "application/json", "api-id": config.apiId };
  }

  /** Plain-JSON call (query_apass, common queries, validator reads). */
  async _plain(endpoint, body) {
    const res = await fetch(`${config.cooperateBase}/${endpoint}`, {
      method: "POST",
      headers: this._headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`cleanverse ${endpoint}: HTTP ${res.status}`);
    return res.json();
  }

  /** AES-encrypted call (generate_apass, update_status, atoken writes). */
  async _encrypted(endpoint, body) {
    const res = await fetch(`${config.cooperateBase}/${endpoint}`, {
      method: "POST",
      headers: this._headers,
      body: encryptBody(body, config.apiKey),
    });
    if (!res.ok) throw new Error(`cleanverse ${endpoint}: HTTP ${res.status}`);
    const json = await res.json();
    if (json.data && typeof json.data === "string" && json.data.length > 8) {
      try {
        return decryptBody(json.data, config.apiKey);
      } catch {
        return json; // some endpoints return plain envelopes
      }
    }
    return json;
  }

  /**
   * A-Pass gate: pass = registered on-chain AND status active (1) AND not
   * expired. Returns { passed, code, profile }.
   */
  async verifyApass(address, chain = config.chain) {
    const profile = await this.queryApass(address, chain);
    if (!profile) return { passed: false, code: 400, reason: "NOT_VERIFIED", profile: null };
    const status = normalizeStatus(profile.status);
    const expired = profile.expirationTime && Number(profile.expirationTime) < Math.floor(Date.now() / 1000);
    if (status !== 1) return { passed: false, code: 300, reason: `STATUS_${status}`, profile };
    if (expired) return { passed: false, code: 500, reason: "EXPIRED", profile };
    return { passed: true, code: 0, reason: "ACTIVE", profile };
  }

  /** query_apass: full A-Pass profile on a chain (plain JSON, api-id header). */
  async queryApass(address, chain = config.chain) {
    if (this.isMock()) {
      return this.mockIdentities.get(address.toLowerCase()) ?? null;
    }
    const r = await this._plain("query_apass", { address, chain });
    if (r.code !== "0000") return null;
    return r.data;
  }

  /**
   * update_status: freeze (2) / unfreeze (1) an A-Pass — the credential event.
   * Encrypted body. `ident` is cvRecordId or customerId.
   */
  async updateStatus({ wallet, chain = config.chain, status, blacklistReason, cvRecordId, customerId }) {
    if (this.isMock()) {
      const key = wallet.toLowerCase();
      const id = this.mockIdentities.get(key);
      if (id) {
        id.status = status === 2 ? "FROZEN" : "ACTIVE";
        this.mockIdentities.set(key, id);
      }
      return { ok: true, mock: true, address: wallet, status };
    }
    const body = { status, wallet: { chain, address: wallet } };
    if (blacklistReason) body.blacklistReason = blacklistReason;
    if (cvRecordId) body.cvRecordId = cvRecordId;
    if (customerId) body.customerId = customerId;
    return this._encrypted("update_status", body);
  }

  /** generate_apass: create a new A-Pass (encrypted body). */
  async generateApass({ customerId, wallet, chain = config.chain, expirationTime, subTier, subGroup, kycId }) {
    if (this.isMock()) {
      this.mockIdentities.set(wallet.toLowerCase(), {
        status: "ACTIVE",
        tier: subTier ?? 2,
        expiry: expirationTime ?? 4102444800,
        cvRecordId: `mock-cv-${customerId ?? "gen"}`,
      });
      return { ok: true, mock: true, address: wallet };
    }
    const body = {
      customerId,
      expirationTime: expirationTime ?? 1863690034,
      wallet: { chain, address: wallet },
    };
    if (subTier) body.subTier = subTier;
    if (subGroup) body.subGroup = subGroup;
    if (kycId) body.kycId = kycId;
    return this._encrypted("generate_apass", body);
  }

  /**
   * atoken/launch: issue a NEW verified asset (CVA) with an embedded
   * compliance rule (tier/group/country constraints on transfers). This is
   * the CVA-from-issuance integration the RWA track requires.
   */
  async launchAtoken({ chain = config.chain, tokenName, tokenSymbol, decimals = 6, adminAddress, rule = {}, icon }) {
    if (this.isMock()) {
      return { ok: true, mock: true, tokenName, tokenSymbol, applyId: "mock-apply-1" };
    }
    const body = { chain, token_name: tokenName, token_symbol: tokenSymbol, decimals, admin_address: adminAddress, rule, icon: icon ?? "https://cleanverse.com/favicon/logo.svg" };
    return this._encrypted("atoken/launch", body);
  }

  /** atoken/list_my_atokens: deployed A-Tokens for this institution (GET). */
  async listMyAtokens() {
    if (this.isMock()) return [];
    const res = await fetch(`${config.cooperateBase}/atoken/list_my_atokens`, {
      method: "GET",
      headers: { "api-id": config.apiId },
    });
    if (!res.ok) throw new Error(`cleanverse list_my_atokens: HTTP ${res.status}`);
    const json = await res.json();
    return json?.data?.items ?? [];
  }

  /** query_deposit_address: get the deposit address for a token on a chain (used with the Circle testnet faucet for aUSDC). */
  async queryDepositAddress({ chain = config.chain, symbol }) {
    if (this.isMock()) return { mock: true, chain, symbol, depositAddress: null };
    const res = await fetch(`${config.cooperateBase}/query_deposit_address`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-id": config.apiId },
      body: JSON.stringify({ chain, symbol }),
    });
    const json = await res.json();
    if (json.code !== "0000") throw new Error(`query_deposit_address ${symbol}: ${json.message}`);
    return json.data;
  }

  /** faucet: request test tokens (usdc/ausdc/usdt) to a deposit address. */
  async faucet({ chain = config.chain, symbol, depositAddress, amount = "5" }) {
    if (this.isMock()) return { mock: true, symbol, depositAddress, amount };
    const res = await fetch(`${config.cooperateBase}/faucet`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-id": config.apiId },
      body: JSON.stringify({ chain, symbol, depositAddress, amount }),
    });
    const json = await res.json();
    if (json.code !== "0000") throw new Error(`faucet ${symbol}: ${json.message}`);
    return json;
  }

  /** download_travel_rule: regulator report for a tx hash (withdraw or A-Token transfer). */
  async downloadTravelRule(txHash, chain = config.chain, address = "") {
    if (this.isMock()) {
      return {
        artifact: `mock-travel-rule-${String(txHash).slice(0, 12)}.pdf`,
        note: "MOCK artifact — real Travel Rule PDFs come from the Cleanverse sandbox API",
      };
    }
    try {
      const r = await this._plain("download_travel_rule", {
        txHash,
        wallet: { chain, address },
      });
      const d = r?.data ?? {};
      const url = d.url ?? d.downloadUrl ?? d.download_url ?? null;
      return { artifact: url ?? d.fileName ?? d.name ?? "travel-rule-export", raw: r };
    } catch {
      return { artifact: "travel-rule-export", note: "download_travel_rule unavailable for this tx" };
    }
  }

  /** CCP-style pre-check on the proposed flow (query_apass-based eligibility). */
  async ccpCheck({ from, to, amount }) {
    if (this.isMock()) return { passed: true, rules: ["mock-ccp-clear"] };
    const [f, t] = await Promise.all([this.queryApass(from), this.queryApass(to)]);
    const rules = [];
    if (f && Number(f.status) === 1) rules.push("sender_active");
    if (t && Number(t.status) === 1) rules.push("recipient_active");
    return { passed: rules.length === 2, rules };
  }
}

export const cleanverse = new CleanverseClient();
