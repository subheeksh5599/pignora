# Pignora — Project Checklist

Every task, small or big, listed. Ticked only when genuinely fixed and tested. User checks.

## Phase 0 — Registration & onboarding

- [x] Registered for Cleanverse Build (welcome email received — API docs access code, Sandbox API Id + key)
- [x] API docs unlocked (docs.cleanverse.com, access code) — full API v5.6 reference read: auth (api-id header), AES-CBC encryption (api-key, zero IV), A-Pass/A-Token/Validator/Fiat-Ramp/Common-Queries modules, response codes
- [x] Join developer Telegram (t.me/Cleanverselabs) — done
- [x] Day-1 verification: cvRecordId IS the cross-chain identity constant — cv 373 on BOTH monad and base (tier differs per chain: 20 vs 50 — tier is chain-scoped, which the rail already prices per chain via config.chain)
- [x] Confirm aUSDC/addresses from the starter kit match verified facts — aUSDC 0xaC0893... confirmed via chain config + faucet

## Phase 1 — Research (done, evidence in session)

- [x] Judging criteria extracted (Depth 30 / Build 25 / Concept 20 / UX 15 / Scale 10) + submission requirements (public repo w/ window commits, demo video, one-page summary, live URL)
- [x] Field mapped — all 101 registered teams read and categorized
- [x] Chain config verified live (Monad 10143, aUSDC, A-Pass, Access Core addresses)
- [x] Sponsor contracts decoded: aUSDC policy()/canTransfer has NO identity dimension
- [x] Winner citations verified (Dropset FX Top 25, Yumi DeFi 1st, MCPay Stablecoin 1st, Autonom RWA 1st)

## Phase 2 — Contracts (Solidity + Foundry) — DONE

- [x] IdentityRegistry (A-Pass mirror, tier -> lending cap), RepoDesk (open/repay/margin/closeout/escrow, travel rule anchor)
- [x] 22 Foundry tests green (non-borrower reverts, double closeout, repay-after-closeout, zero amounts, unregistered collateral); forge build clean
- [x] Deploy script verified on anvil (real broadcast); Monad testnet one-command pipeline: scripts/deploy-monad.sh (deploy -> .env -> restart -> smoke)

## Phase 3 — Backend (Node/TS) — DONE

- [x] Cleanverse client: query_apass (real), verify (status 1 + not expired), update_status freeze/unfreeze (real credential events), generate_apass, atoken/launch + list_my_atokens (real CVA issuance), download_travel_rule, CCP pre-check
- [x] AES-CBC encryption module (api-key derived, zero IV) for write endpoints
- [x] Mock mode (offline) + sandbox mode (real cooperate API) via env; api-key NEVER sent/committed (only in gitignored .env + Vercel env)
- [x] Production polish: input validation on /repos/open (addresses, amounts, fee/term bounds), 404 + central error handler, extended /health with live Cleanverse reachability probe
- [x] 8 node tests green (hermetic mock); audit packs with real generated PDF artifact
- [x] REAL sandbox verified through the Pignora API: identities (cv 373/374, tier 20), unverified rejection, repo open at 5% lending cap, freeze -> closeout (reason borrower_2) -> unfreeze

## Phase 4 — Frontend (Next.js) — DONE

- [x] Treasury desk on :3000 (identity panel, open repo, positions, credential freeze simulator, audit console)
- [x] Build green; typecheck + lint clean; screenshots 1-3 re-captured from the live sandbox flow (distinct, real data); auto-verifies the real identity on load

## Phase 5 — Deploy & verify — DONE (except 2 small items)

- [x] REAL Cleanverse integrations live on Monad testnet: A-Pass fixtures verified, PNGB01 A-Token issued (0x48b84eb8..., tx 0xaed3e394...), faucet aUSDC delivered (tx 0x096cfcdf...), real freeze/unfreeze tx hashes
- [x] RepoDesk + IdentityRegistry deployed to Monad testnet (IdentityRegistry 0xdcb88994..., RepoDesk 0x398D45F5..., deployer funded via faucet)
- [x] Real repo settled on-chain with REAL A-Pass-verified parties (tier 50 both, cv 1832/1833): open at 2% lending cap (tx 0xb6fff6a9...), real freeze event (tx 0x7df33be6...), closeout (tx 0x10241e21...), lender 98.49% / borrower excess 15.1e9 escrowed — matches Foundry expectations
- [x] Lending-cap model aligned to the REAL A-Pass tier scale (0-99: >=50 -> 2%, >=20 -> 5%, >=10 -> 8%) in contract + backend + tests
- [ ] Real aUSDC cash leg in the testnet E2E — UNBLOCKED INFO: the Monad aUSDC pair was MIGRATED (confirmed in the dev group + on-chain): old 0xaC0893567D43C3E7e6e35a72803df05416C1f20D is stale, canonical is 0xfa96de5b8f434c26fdff953303dd66ff80af1026 ("Cleanverse USD"). Backend .env + .env.example + testnet-repo.js updated and redeployed. Prior Circle deposit was refunded as non_whitelist_refund (pre-migration state); re-deposit to the new pair's deposit address when the team confirms the migration is fully live
- [ ] Real Travel Rule PDF via download_travel_rule — endpoint verified live (TR_001 = needs a withdraw/A-Token-transfer tx; ours are deposits/status changes). Blocked on the aUSDC faucet pool refilling (withdraw needs funded A-Pass wallet)
- [x] Submission email draft ready — docs/SUBMISSION-EMAIL.md (repo link, video slot, one-pager, deployed chains, CVI+CVA points)

## Phase 6 — Demo & video

- [x] 90-second demo script written (docs/demo-script.md)
- [ ] Demo recorded — deploy is DONE, so the gate is passed; recording is the remaining step
- [x] One-page summary written (docs/ONE-PAGER.md: problem/solution/CVI·CVA points/chains)

## Phase 7 — Repo hygiene & submission

- [x] 62 granular commits, conventional prefixes, ALL dated 2026-08-08 00:05-12:42 UTC (build window) — verified via GitHub API; authored subheeksh5599
- [x] Secrets safe: api-key only in gitignored backend/.env + Vercel env; .env.example has placeholders; verified .env not tracked; no .vercel dirs in the repo
- [x] PUBLIC GitHub repo created + pushed (github.com/subheeksh5599/pignora) with description, 11 topics, homepage — commit history is 100% inside the Aug 8-9 window
- [x] Live demo URL: desk pignora-desk.vercel.app + hosted API backend-six-rho-86.vercel.app (verified live: health, real identity, repo open) + testnet contracts
- [ ] Submission email to isaac@cleanverse.com by Aug 9 23:59 UTC: repo link, demo video, one-page summary, deployed chains — user action on Aug 9
- [ ] NOTE: frontend shell derives from the copied kagezks baseline (React Bits Pro commercial license) — the repo is now PUBLIC; confirm coverage before judging (risk flag, not a blocker)
