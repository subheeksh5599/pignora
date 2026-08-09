# Pignora — One-page summary

Cleanverse Build: Trusted Assets Hackathon · Aug 2026

## Problem

Repo is how institutions fund themselves — trillions of dollars a day — but
on-chain repo does not exist for verified institutions. DeFi lending is
anonymous and over-collateralized, and the compliance rails (KYC, Travel
Rule) live in backends, not in settlement logic. When a counterparty's
credential breaks mid-deal, the outcome is discretionary and slow.

## Solution

Pignora is a compliant repo rail for tokenized assets on Monad. Identity is
the pricing engine and the enforcement trigger, not a gate:

- The lending cap is set by the counterparty's Cleanverse A-Pass tier
  (bucketed: 50+ → 2%, 20+ → 5%, else 10%). More verification, higher
  lending cap — the same bond, different terms, purely because of who the
  counterparty is verified to be.
- Credential events are protocol events: freezing (or revoking/expiring) the
  borrower's A-Pass mid-term triggers an automatic compliant closeout —
  collateral covers the obligation, the excess returns, and frozen parties
  fail closed to escrow until verified again.
- Every leg carries Travel Rule attribution and produces an append-only
  audit pack with a real PDF artifact.
- The desk runs the repo lifecycle from the connected wallet: the lender
  signs open and closeout directly (MetaMask), and the credential event is
  EIP-712 signed before the backend executes it.

## CVI · CVA integration points

- **CVI**: `query_apass` (tier/status/expiry/cvRecordId) drives counterparty
  eligibility and the tier → lending-cap pricing map. The relay mirrors
  A-Pass state into an on-chain IdentityRegistry; real credential events
  (`update_status` freeze, verified live with tx hashes) propagate to the
  protocol and trigger closeout.
- **CVA**: Pignora issued its own A-Token (PNGUSD, USD-pegged CVA) used as
  the settlement cash leg — the repo escrows both legs until repayment or
  closeout. Collateral is a tokenized bond (MockBond) on the same rail.
- **CCP**: pre-check on every repo open (both parties verified, cap
  coverage, travel rule anchor). **Travel Rule**: per-repo attribution via
  the Cleanverse travel-rule flow, anchored on-chain and exported in the
  audit pack.

## Deployed chains

- Monad testnet (chain id 10143) — LIVE: RepoDesk
  `0x398D45F56F759Cd4b4cf0be07C2C4AADf7327edA`, IdentityRegistry
  `0xdcb889940B95FF9625d76a735DaCdFEB979aD4C2`, MockBond `0x13211b8f…`,
  MockUSD `0xA66155a4…`. Repos are opened, frozen, and closed out on-chain
  with real A-Pass-verified parties (tier 50 borrower); every position row
  links its open and closeout transactions.
- Live desk: https://pignora-desk.vercel.app/dashboard (landing at the same
  URL) — identity, policy, and positions all read live from the deployed
  backend.

## Build facts

- Contracts: 22 Foundry tests green. Backend: 8 node tests green (hermetic)
  + live sandbox E2E. Frontend: typecheck/build clean. CI green on push.
- One-command local stack: `./scripts/dev-up.sh` (anvil chain + deployed
  contracts + backend + frontend).
