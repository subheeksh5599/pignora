# Pignora — Project Checklist

Every task, small or big, listed. Ticked only when genuinely fixed and tested. User checks.

## Phase 0 — Registration & onboarding

- [x] Registered for Cleanverse Build (welcome email received — API docs access code, Sandbox API Id + key)
- [x] API docs unlocked (docs.cleanverse.com, access code) — full API v5.6 reference read: auth (api-id header), AES-CBC encryption (api-key, zero IV), A-Pass/A-Token/Validator/Fiat-Ramp/Common-Queries modules, response codes
- [ ] Join developer Telegram (t.me/Cleanverselabs)
- [ ] Day-1 verification: cvRecordId is identical for the same person across chains — PARTIAL: monad cvRecordId 373 confirmed; base query returned a different profile (tier 50); cross-chain identity record equivalence unconfirmed
- [x] Confirm aUSDC/addresses from the starter kit match verified facts — aUSDC 0xaC0893... confirmed via chain config + faucet

## Phase 1 — Research (done, evidence in session)

- [x] Judging criteria extracted (Depth 30 / Build 25 / Concept 20 / UX 15 / Scale 10) + submission requirements (public repo w/ window commits, demo video, one-page summary, live URL)
- [x] Field mapped — all 101 registered teams read and categorized
- [x] Chain config verified live (Monad 10143, aUSDC, A-Pass, Access Core addresses)
- [x] Sponsor contracts decoded: aUSDC policy()/canTransfer has NO identity dimension
- [x] Winner citations verified (Dropset FX Top 25, Yumi DeFi 1st, MCPay Stablecoin 1st, Autonom RWA 1st)

## Phase 2 — Contracts (Solidity + Foundry) — DONE

- [x] IdentityRegistry (A-Pass mirror, tier -> lending cap), RepoDesk (open/repay/margin/closeout/escrow, travel rule anchor)
- [x] 22 Foundry tests green (added: non-borrower reverts, double closeout, repay-after-closeout, zero amounts, unregistered collateral); forge build clean
- [x] Deploy script verified on anvil (real broadcast); Monad testnet one-command pipeline: scripts/deploy-monad.sh (deploy -> .env -> restart -> smoke)

## Phase 3 — Backend (Node/TS) — DONE

- [x] Cleanverse client: query_apass (real), verify (status 1 + not expired), update_status freeze/unfreeze (real credential events), generate_apass, atoken/launch + list_my_atokens (real CVA issuance), download_travel_rule, CCP pre-check
- [x] AES-CBC encryption module (api-key derived, zero IV) for write endpoints
- [x] Mock mode (offline) + sandbox mode (real cooperate API) via env; api-key NEVER sent/committed
- [x] Production polish: input validation on /repos/open (addresses, amounts, fee/term bounds), 404 + central error handler, extended /health with live Cleanverse reachability probe
- [x] 8 node tests green (hermetic mock); audit packs with real generated PDF artifact
- [x] REAL sandbox verified through the Pignora API: identities (cv 373/374, tier 20), unverified rejection, repo open at 5% lending cap, freeze -> closeout (reason borrower_2) -> unfreeze

## Phase 4 — Frontend (Next.js) — DONE

- [x] Treasury desk on :3000 (identity panel, open repo, positions, credential freeze simulator, audit console)
- [x] Build green; screenshots in docs/media/1-3.png

## Phase 5 — Deploy & verify

- [x] REAL Cleanverse integrations live on Monad testnet: A-Pass fixtures verified, PNGB01 A-Token issued (0x48b84eb8..., tx 0xaed3e394...), faucet aUSDC delivered (tx 0x096cfcdf...), real freeze/unfreeze tx hashes
- [x] RepoDesk + IdentityRegistry deployed to Monad testnet (IdentityRegistry 0xdcb88994..., RepoDesk 0x398D45F5..., deployer funded via faucet)
- [x] Real repo settled on-chain with REAL A-Pass-verified parties (tier 50 both, cv 1832/1833): open at 2% lending cap (tx 0xb6fff6a9...), real freeze event (tx 0x7df33be6...), closeout (tx 0x10241e21...), lender 98.49% / borrower excess 15.1e9 escrowed — matches Foundry expectations
- [x] Lending-cap model aligned to the REAL A-Pass tier scale (0-99: >=50 -> 2%, >=20 -> 5%, >=10 -> 8%) in contract + backend + tests
- [ ] Real aUSDC cash leg in the testnet E2E — the institution faucet pool ran dry at demo time; earlier real aUSDC delivery (tx 0x096cfcdf...) proves the path; swap ONE address to use aUSDC when the pool refills
- [ ] Real Travel Rule PDF via download_travel_rule (needs a withdraw tx hash)

## Phase 6 — Demo & video

- [x] 90-second demo script written (docs/demo-script.md)
- [ ] Demo recorded — after testnet contract deploy (user rule: video only when done)
- [x] One-page summary written (docs/ONE-PAGER.md: problem/solution/CVI·CVA points/chains)

## Phase 7 — Repo hygiene & submission

- [x] Granular commits, conventional prefixes (8 commits, all local)
- [x] Secrets safe: api-key only in gitignored backend/.env; .env.example has placeholders; verified .env not tracked
- [ ] PUBLIC GitHub repo created + pushed (SUBMISSION REQUIREMENT) — commit history during Aug 8-9 window required; ask user when to push
- [ ] Live demo URL or testnet deployment (recommended) — testnet deploy above
- [ ] Submission email to isaac@cleanverse.com by Aug 9 23:59 UTC: repo link, demo video, one-page summary, deployed chains
- [ ] NOTE: frontend shell derives from the copied kagezks baseline (React Bits Pro commercial license) — confirm coverage before public push
