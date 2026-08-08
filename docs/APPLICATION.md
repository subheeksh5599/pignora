# Pignora — Cleanverse Build application copy

Ready to paste into the registration form (fields per the hackathon page).
Placeholders marked `<...>` are yours to fill (email, names). Registration
closes Aug 7 23:59 UTC.

---

## Project name

Pignora

## Track

RWA — Real-World Assets, Verified

## Project description (form text, ~150 words)

Pignora is a compliant repo rail for tokenized assets on Monad: verified
institutions repo out tokenized bonds and credit against aUSDC cash, with
clean money and clean hands enforced by the rail itself, not by a backend.

Identity is the pricing engine and the enforcement trigger, not a gate:
- The lending cap is set by the counterparty's Cleanverse A-Pass tier —
  more verification, higher lending cap (tier 3 = 2%, tier 2 = 5%, tier 1 = 10%).
- Credential events are protocol events: a revocation, freeze, or expiry
  mid-term triggers an automatic margin call and a compliant closeout —
  collateral covers the obligation, excess returns, and frozen or revoked
  parties fail closed to escrow until they are verified again.
- Every leg settles in aUSDC, carries Travel Rule attribution, and produces
  an append-only audit pack with a generated PDF artifact.

Repo is the daily institutional funding market. Pignora makes it
pilotable: any treasury desk can run a compliant repo against verified
counterparties today.

## Integration plan (form text — USE this field, it's free depth points)

- CVI — A-Pass gate + pricing: `verify_apass` (gate code 4 is the only pass)
  and `query_apass` (tier/subTier/group/state/expiry) drive counterparty
  eligibility and the tier -> lending-cap map. The relay mirrors A-Pass state
  into an on-chain IdentityRegistry, so identity events (revocation, freeze,
  expiry) propagate to the protocol.
- CVA — settlement: the cash leg and collateral valuation are exclusively
  aUSDC; the repo contract holds both legs until repayment or closeout.
- CCP — pre-transaction rule checks on every repo open (both parties
  verified, cap coverage, travel rule anchor).
- Travel Rule — per-repo attribution via `download_travel_rule`, anchored
  on-chain as a hash and exported in the audit pack.
- Sandbox-first: mock mode for offline dev, Cleanverse sandbox API via env;
  production contract addresses are env-configured, never hardcoded.

## Team background (edit)

`<your background — builder/contributor history, Solidity/Foundry, previous
hackathons, Cleanverse API research including live verification of chain
config and contract behavior on Monad testnet>`

## Contact email

`<your email>`

## Optional: deck

Not included — the live demo and repo carry the story.

## What ships in 48h

- Foundry contracts: IdentityRegistry + RepoDesk (open/repay/margin/closeout/
  escrow) with 16 passing tests
- Node/TS backend: Cleanverse client, policy, relay, audit API (mock +
  sandbox modes)
- Next.js treasury desk: open repo, positions, credential-event simulator,
  audit console
- Live deploy on Monad testnet with real aUSDC transactions
