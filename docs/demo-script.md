# Pignora — Demo video storyboard (shot-by-shot)

Record at 1080p, screen + voiceover. Total ~100 seconds. No music, no cuts
longer than 2s. Every number on screen is REAL (all txs land on Monad
testnet, chain 10143, and every repo row links to MonadScan).

NARRATIVE: this video proves the two claims NO other project on the board can
make: (1) Pignora runs the actual institutional instrument — repo — and
(2) when a credential dies mid-term, the position CLOSES with a defined
settlement (fail-closed escrow), it does not freeze-and-hope. Every click in
this video fires a REAL on-chain transaction with a REAL hash on screen.

## SHOT 1 — Hook (0-8s)
SCREEN: white text on dark — "$4T a day moves through repo desks in TradFi.
Zero of it happens on-chain — because identity changes mid-term."
VOICE: "Repurchase agreements move four trillion dollars a day. They have
never worked on-chain, because a counterparty's verified identity can change
while the trade is still live."

## SHOT 2 — The desk, real identity (8-25s)
SCREEN: https://pignora-desk.vercel.app/dashboard — identity panel after
auto-verify: Status VERIFIED, tier 50, Lending cap 2.0%, CV record 1832.
VOICE: "This is the Pignora desk on Monad testnet. The borrower's Cleanverse
A-Pass is real — queried live, tier 50, cv record 1832. The lending cap is
priced by that tier: more verification, higher cap. An unverified wallet
cannot open a repo at all."

## SHOT 3 — Open the repo (25-55s)
SCREEN: Open-repo form is PRE-FILLED with the real parties (borrower
0x197F…7eE5, lender 0x12D1…930C), collateral 1,000,000,000,000 BOND units,
cash 950,000,000,000, fee 50 bps, term 7 days → click "Open repo" →
WAIT ~30s (real tx mining) → the row appears: status OPEN, cap 2.0%, and a
tx link "open 0x…" (linked to MonadScan, title "repo open tx").
VOICE: "We open a seven-day repo: the borrower pledges a tokenized bond
against the cash leg. The contract escrows both legs on-chain and enforces
the 105% maintenance margin. This open itself is a transaction — you can see
the hash on the row, linked to MonadScan."

## SHOT 4 — THE MOMENT: credential freeze (55-75s)
SCREEN: click "Freeze borrower credential" → in the SAME click: the identity
panel flips to REJECTED, the repo row flips to CLOSED OUT, and a red "close
0x…" tx link appears on the row. The freeze fires TWO real txs: the
Cleanverse update_status event and the on-chain IdentityRegistry gate flip,
then the auto-closeout executes on RepoDesk.
VOICE: "Mid-term, the borrower's A-Pass is frozen — a real credential event,
a real transaction. The on-chain IdentityRegistry gate flips, and the
closeout executes automatically — no manual close. This is not a
freeze-and-hope protocol: the repo closes out, on-chain, in the same moment
as the event."

## SHOT 5 — The settlement nobody else has (75-90s)
SCREEN: Repo row → status CLOSED OUT, reason borrower_2 (the credential
event closed it — no manual closeout click). Settlement breakdown on
screen: LENDER 984,900,000,000 (98.49% of obligation) · BORROWER EXCESS
15,100,000,000 → FAIL-CLOSED TO ESCROW.
VOICE: "The closeout settles in defined numbers: the lender is covered to
98.49 percent of the obligation, and the borrower's excess — 15.1 billion
micro-units — is locked in escrow until the identity is restored. A frozen
party can never receive a single unit. That is the fail-closed property,
and it is on-chain."

## SHOT 6 — Evidence + audit (90-100s)
SCREEN: click "Audit" on the repo row → dialog shows the event ledger
(repo_opened → repo_closeout) and the audit artifact repo-…-audit.pdf.
VOICE: "Every leg is Travel Rule-attributed and appended to the audit pack —
the JSONL event ledger and the regulator artifact, hash-anchored on-chain."

## SHOT 7 — Close (100-110s)
SCREEN: text — "Pignora — the repo desk that closes out when trust does.
Cleanverse Build: Trusted Assets. Live on Monad testnet."
VOICE: "Cleanverse is not bolted onto Pignora — identity IS the protocol.
When trust changes, the trade closes, on defined terms. Pignora."

## CHECKLIST BEFORE RECORDING
- Desk open at https://pignora-desk.vercel.app/dashboard, backend badge
  shows "sandbox" (not "mock")
- Borrower 0x197F2ed9C82c8a50Ad9bddd849d16Ce9afb17eE5 is ACTIVE (identity
  panel auto-verifies VERIFIED, tier 50, cap 2.0%). If it shows REJECTED,
  reactivate first:
  `curl -s -X POST https://backend-six-rho-86.vercel.app/identity/0x197F2ed9C82c8a50Ad9bddd849d16Ce9afb17eE5/status -H "Content-Type: application/json" -d '{"status":"ACTIVE","tier":50}'`
- The positions table shows earlier on-chain repos with real hashes — that
  is real contract history, leave it on screen (it proves live data)
- Open takes ~30s (real tx mining) — do NOT double-click; wait for the row
- Freeze fires the closeout in the same click (reason borrower_2) — no
  manual Closeout click needed
- The tx links (open 0x… / close 0x…) are clickable to MonadScan — hover or
  click one on camera if you want the chain proof visible
- Record in one take per shot; stitch in any editor; upload unlisted to
  YouTube; paste the link into docs/SUBMISSION-EMAIL.md
