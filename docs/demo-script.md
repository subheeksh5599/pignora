# Pignora — Demo video storyboard (shot-by-shot)

Record at 1080p, screen + voiceover. Total ~100 seconds. No music, no cuts
longer than 2s. Every number on screen is REAL (tx hashes below are on
Monad testnet, chain 10143).

NARRATIVE: this video proves the two claims NO other project on the board can
make: (1) Pignora runs the actual institutional instrument — repo — and
(2) when a credential dies mid-term, the position CLOSES with a defined
settlement (fail-closed escrow), it does not freeze-and-hope.

## SHOT 1 — Hook (0-8s)
SCREEN: white text on dark — "$4T a day moves through repo desks in TradFi.
Zero of it happens on-chain — because identity changes mid-term."
VOICE: "Repurchase agreements move four trillion dollars a day. They have
never worked on-chain, because a counterparty's verified identity can change
while the trade is still live."

## SHOT 2 — The desk, real identity (8-25s)
SCREEN: https://pignora-desk.vercel.app/dashboard — identity panel after
auto-verify: Status VERIFIED, tier 50, Lending cap 2.0%, CV record 373.
VOICE: "This is the Pignora desk on Monad testnet. The borrower's Cleanverse
A-Pass is real — queried live, tier 50, cv record 373. The lending cap is
priced by that tier: more verification, higher cap. An unverified wallet
cannot open a repo at all."

## SHOT 3 — Open the repo (25-40s)
SCREEN: Open-repo form → collateral 1,000,000,000,000 BOND units, cash
950,000,000,000 aUSDC, fee 50 bps → click "Open repo" → row appears:
Repo #1, status OPEN, cap 2.0% (tier 50 pricing).
VOICE: "We open a seven-day repo: the borrower pledges a tokenized bond
against the aUSDC cash leg. The contract escrows both legs and enforces the
105% maintenance margin on-chain."

## SHOT 4 — THE MOMENT: credential freeze (40-60s)
SCREEN: click "Freeze borrower credential" → the identity panel flips to
REJECTED (status 2) and the repo row flips to CLOSED OUT in the same click.
The API returns a real update_status tx (reference freeze tx from the
settled testnet repo: 0x7df33be6172afcc4da0832b4c6291af0bd45511c32e40e1ae67d71df929d27e0).
VOICE: "Mid-term, the borrower's A-Pass is frozen — a real credential event
through the Cleanverse update_status endpoint, a real transaction. The
on-chain IdentityRegistry gate flips, and the margin call fires
automatically. This is not a freeze-and-hope protocol: the repo closes out,
on-chain, in the same moment as the event."

## SHOT 5 — The settlement nobody else has (60-80s)
SCREEN: Repo #1 row → status CLOSED OUT, reason borrower_2, no manual
closeout click (the credential event closed it). Settlement breakdown on
screen: LENDER 984,900,000,000 (98.49% of obligation) · BORROWER EXCESS
15,100,000,000 → FAIL-CLOSED TO ESCROW. Reference closeout tx from the
settled testnet repo: 0x10241e21e819c65878db6f03e4f21d5f93d848ae941dafc147cd0ff5cabe59ae.
VOICE: "The closeout settles in defined numbers: the lender is covered to
98.49 percent of the obligation, and the borrower's excess — 15.1 billion
micro-units — is locked in escrow until the identity is restored. A frozen
party can never receive a single unit. That is the fail-closed property,
and it is on-chain."

## SHOT 6 — Evidence + audit (80-95s)
SCREEN: audit panel (desk ?audit=1): event ledger opened → closeout.
Then the audit pack: JSONL event log + generated PDF.
VOICE: "Every leg is Travel Rule-attributed and appended to the audit pack —
the JSONL event ledger and the regulator artifact, hash-anchored on-chain."

## SHOT 7 — Close (95-105s)
SCREEN: text — "Pignora — the repo desk that closes out when trust does.
Cleanverse Build: Trusted Assets. Live on Monad testnet."
VOICE: "Cleanverse is not bolted onto Pignora — identity IS the protocol.
When trust changes, the trade closes, on defined terms. Pignora."

## CHECKLIST BEFORE RECORDING
- Desk open at https://pignora-desk.vercel.app/dashboard, backend reachable
  (badge shows "sandbox", not "mock")
- Borrower 0x1111…1111 is ACTIVE at the source (identity panel auto-verifies
  VERIFIED, tier 50, cap 2.0%). If it shows REJECTED, reactivate first:
  `curl -X POST https://backend-six-rho-86.vercel.app/identity/0x1111111111111111111111111111111111111111/status \
    -H "Content-Type: application/json" -d '{"status":"ACTIVE","tier":3}'`
- No OPEN repos from a previous take (backend starts clean; if a repo lingers,
  the freeze button closes it, which is fine but restart the page first)
- Freeze button fires a REAL update_status tx (watch the identity panel flip
  to REJECTED and the repo row flip to CLOSED OUT in the same click)
- The closeout lands in the same click as the event (reason borrower_2) — no
  manual Closeout click needed
- Record in one take per shot; stitch in any editor; upload unlisted to
  YouTube; paste the link into docs/SUBMISSION-EMAIL.md
