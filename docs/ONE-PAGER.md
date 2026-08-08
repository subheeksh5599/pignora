# Pignora — One-page summary (submission requirement)

Cleanverse Build: Trusted Assets Hackathon · Track 1 (RWA) · Aug 2026

## Problem

Repo is how institutions fund themselves — trillions of dollars a day — but
on-chain repo does not exist for verified institutions: DeFi lending is
anonymous and over-collateralized, and the compliance rails (KYC, Travel Rule)
live in backends, not in the settlement logic. When a counterparty's
credential breaks mid-deal, the outcome is discretionary and slow.

## Solution

Pignora is a compliant repo rail for tokenized assets on Monad. Identity is
the pricing engine and the enforcement trigger, not a gate:

- The lending cap is set by the counterparty's Cleanverse A-Pass tier (numeric
  0-99, bucketed: ≥50 → 2%, ≥20 → 5%, else 10%). More verification, higher
  lending cap — the same bond, different terms, purely because of who the
  counterparty is verified to be.
- Credential events are protocol events: a freeze (or revocation/expiry) of
  the borrower mid-term triggers an automatic margin call and a compliant
  closeout — collateral covers the obligation, excess returns, and frozen
  parties fail closed to escrow until verified again.
- Every leg settles in aUSDC, carries Travel Rule attribution, and produces an
  append-only audit pack with a real PDF artifact.

## CVI · CVA integration points

- **CVI**: `query_apass` (tier/subTier/group/status/expiry/cvRecordId) drives
  counterparty eligibility and the tier → lending-cap pricing map. The relay
  mirrors A-Pass state into an on-chain IdentityRegistry; real credential
  events (`update_status` freeze/unfreeze, verified live with tx hashes)
  propagate to the protocol and trigger closeout.
- **CVA**: settlement is exclusively aUSDC (sandbox faucet-funded, live tx);
  the repo escrows both legs until repayment or closeout. Pignora also issued
  its own verified asset — A-Token "Pignora Bond" (PNGB01,
  `0x48b84eb8e24663a3B9C68A94d60a4569CFbE83b8` on Monad testnet) with an
  embedded compliance rule (min_tier 10) — used as repo collateral: CVA from
  the issuance stage.
- **CCP**: pre-check on every repo open (both parties verified, cap
  coverage, travel rule anchor). **Travel Rule**: per-repo attribution via
  `download_travel_rule`, anchored on-chain and exported in the audit pack.

## Deployed chains

- Monad testnet (chain id 10143) — LIVE: RepoDesk `0x398D45F56F759Cd4b4cf0be07C2C4AADf7327edA`,
  IdentityRegistry `0xdcb889940B95FF9625d76a735DaCdFEB979aD4C2`, MockBond `0x13211b8f…`,
  MockUSD `0xa66155a4…`. A real repo was settled on-chain with real A-Pass-verified
  parties (tier 50, cvRecordId 1832/1833): opened at the tier-priced 2% lending cap
  (tx `0xb6fff6a9…`), real freeze credential event (tx `0x7df33be6…`), compliant
  closeout (tx `0x10241e21…`) — lender received 98.49% obligation coverage,
  borrower excess fail-closed to escrow.
- Live Cleanverse integrations: A-Pass fixtures cvRecordId 373/374, Pignora's
  own issued A-Token PNGB01 (`0x48b84eb8…`), aUSDC faucet delivery (tx `0x096cfcdf…`).
- Cash leg in the settlement E2E used the local MockUSD because the institution
  aUSDC faucet pool ran dry at demo time; swapping one address uses real aUSDC.

## Build facts

- Contracts: 22 Foundry tests green. Backend: 8 node tests green (hermetic) +
  live sandbox E2E. Frontend: typecheck/lint/build clean.
- Live desk: localhost:3000/dashboard (sandbox mode against the real API).
