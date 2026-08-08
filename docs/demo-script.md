# Pignora — 90-second demo script

Click steps + narration. Record only when the Monad testnet deploy is live
(user rule: video only when fully done). Local-only doc.

## Setup (before recording)

- Backend running in sandbox mode (real Cleanverse API + Monad testnet)
- Borrower wallet (tier-3, bank-verified A-Pass) and lender wallet funded with aUSDC
- Desk open at https://pignora-desk.vercel.app/dashboard (hosted, sandbox mode visible — no mock badge)

## Script

### 0:00–0:10 — The problem, in one line
Narrate: "Repo is how institutions fund themselves — trillions a day. On-chain
repo needs one thing DeFi doesn't have: verified hands on both sides, and a
rail that reacts when trust breaks."

### 0:10–0:30 — Identity prices the deal (CVI)
Click: Verify on the borrower address.
Screen: A-Pass panel — ACTIVE, tier 3, lending cap 2.0%.
Narrate: "The borrower's A-Pass tier prices the lending cap. Deep verification,
thin lending cap — 2%. A tier-1 counterparty would pay 10%. Identity is the
pricing engine, not a checkbox."

### 0:30–0:50 — Open the repo (CVA settlement)
Fill: collateral 1,000,000 BOND, cash 980,000 aUSDC (98% LTV at 2% lending cap),
fee 50 bps, term 7 days.
Click: Open repo.
Screen: row appears — lending cap 2.0%, status OPEN.
Narrate: "Repo opened: bond pledged, aUSDC lent, travel rule anchored on-chain.
Both legs settle in verified assets."

### 0:50–1:10 — The credential event (the moment)
Click: Simulate credential revocation (borrower).
Screen: borrower's A-Pass flips to REVOKED in the registry.
Narrate: "Mid-term, the borrower's identity is revoked. In a traditional repo
this is a lawyer call. Here it's a protocol event."

### 1:10–1:30 — Compliant closeout
Click: Closeout on the repo row.
Screen: status CLOSED_OUT — lender receives obligation-covered collateral,
borrower's excess fails closed to escrow.
Narrate: "The rail closes out automatically: the lender is whole, the excess
is escrowed until the borrower is verified again. No frozen mess, no
discretion — the outcome was written when the repo opened."

### 1:30–1:40 — Audit pack
Click: Audit (or use /dashboard?audit=<id>).
Screen: audit pack — event ledger + travel rule artifact + PDF.
Narrate: "Every leg is attributed and exportable. That's the audit a
compliance officer actually wants."

### 1:40–1:50 — Close
"Verified assets, priced and enforced by verified identity — repo, on-chain,
pilotable tomorrow. Pignora."

## Notes

- Keep the closeout narration tight — it's the differentiator no other team
  has (identity events driving protocol state).
- The unverified-wallet rejection (step 3 of the earlier demo) can be a
  cold-open if time allows: try to open a repo with an anonymous wallet,
  watch the rail refuse, then proceed.
- No mocked identities or balances on screen; sandbox-mode badge is honest.
