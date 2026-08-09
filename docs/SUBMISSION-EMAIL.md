# Pignora — Submission email (draft)

Send to: isaac@cleanverse.com
Subject: [Cleanverse Build] Pignora submission — Track 1 (RWA)

---

Hi Cleanverse Team,

Submission for the Cleanverse Build: Trusted Assets Hackathon — Track 1 (RWA).

PROJECT: Pignora — a compliant repo rail for tokenized assets on Monad.
Repo: https://github.com/subheeksh5599/pignora
Live app: https://pignora-desk.vercel.app (landing at /, desk at /dashboard)
Demo video: <PASTE VIDEO LINK>
One-page summary: https://github.com/subheeksh5599/pignora/blob/main/docs/ONE-PAGER.md

WHAT IT DOES
Repo agreements (sell-and-buy-back collateralized lending, trillions of
dollars a day in TradFi) on-chain: the lending cap is priced by the
counterparty's Cleanverse A-Pass tier, and a credential event (freeze /
revocation / expiry) mid-term triggers an automatic margin call and a
compliant closeout — collateral covers the obligation, excess fails closed to
escrow until the party is verified again. Settlement is aUSDC; every leg is
Travel Rule-attributed with an append-only audit pack. No freeze-and-hope:
when a verified identity dies mid-term, the position closes on defined terms.

CVI + CVA INTEGRATION (both, from issuance — Track 1 requirement)
- CVI: query_apass (tier 0-99, status, cvRecordId) drives eligibility and the
  tier -> lending-cap pricing map; real update_status freeze/unfreeze events
  (tx hashes in the README) propagate through an on-chain IdentityRegistry.
- CVA: settlement is exclusively aUSDC; Pignora also issued its own verified
  asset via atoken/launch — "Pignora Bond" (PNGB01) with an embedded
  min_tier compliance rule — used as repo collateral: CVA from the issuance
  stage.

DEPLOYED CHAINS
- Monad testnet (10143): RepoDesk 0x398D45F56F759Cd4b4cf0be07C2C4AADf7327edA,
  IdentityRegistry 0xdcb889940B95FF9625d76a735DaCdFEB979aD4C2.
  A real repo was settled on-chain with real A-Pass-verified parties (tier 50,
  cvRecordId 1832/1833): open at the tier-priced 2% lending cap, real freeze
  credential event, compliant closeout — lender received 98.49% obligation
  coverage, borrower excess fail-closed to escrow. All tx hashes in the README.

VERIFICATION
22 Foundry tests + 8 backend tests green; the live app fetches every number
from the deployed API (identity, tier caps, health) — no mock data, no
simulation. Repo is cloneable: contracts, backend, and frontend all build and
run from a fresh clone.

Thank you,
<YOUR NAME>
