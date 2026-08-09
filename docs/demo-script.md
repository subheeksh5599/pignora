# Pignora — Demo video storyboard (shot-by-shot)

Record at 1080p, screen + voiceover. Total ~115 seconds. No music, no cuts
longer than 2s. Every number on screen is REAL (all txs land on Monad
testnet, chain 10143, and every repo row links to MonadScan).

NARRATIVE: this video proves the two claims NO other project on the board can
make: (1) Pignora runs the actual institutional instrument — repo — and
(2) when a credential dies mid-term, the position CLOSES with a defined
settlement (fail-closed escrow), it does not freeze-and-hope. Every action
is signed by the operator's MetaMask wallet — open, closeout, and the
credential event all come from a real wallet, not the backend.

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

## SHOT 3 — Connect the wallet (25-40s)
SCREEN: header → click "Connect wallet" → MetaMask popup → approve → the
header shows the connected wallet (0x…). The backend funds it automatically
on connect: real mints of testnet MON gas, cash, and bond collateral.
VOICE: "I connect my wallet. The desk provisions it on the testnet — gas,
cash, and collateral, all real transactions — so the repo lifecycle runs
from MY wallet, not a backend key."

## SHOT 4 — Open the repo, wallet-signed (40-70s)
SCREEN: Open-repo form: borrower 0x197F…7eE5 (the A-Pass holder), collateral
1,000,000,000,000 BOND units, cash 950,000,000,000, fee 50 bps, term 7 days
→ click "Open repo" → MetaMask shows the RepoDesk.openRepo transaction →
approve → WAIT ~30s (real tx mining) → the row appears: status OPEN, cap
2.0%, and a tx link "open 0x…" (linked to MonadScan).
VOICE: "I open a seven-day repo against the tier-50 borrower. MetaMask is
asking me to sign the openRepo call — I am the lender, my wallet's cash gets
escrowed on-chain, and the 105% maintenance margin is enforced by the
contract. The open is a real transaction from my wallet, hash on the row,
linked to MonadScan."

## SHOT 5 — THE MOMENT: signed credential freeze (70-90s)
SCREEN: click "Freeze borrower credential" → MetaMask shows the EIP-712
signature request (domain: Pignora, the RepoDesk contract from the live
health endpoint: CredentialEvent subject/status/tier/nonce/timestamp) →
click Sign → in the same moment: the identity panel flips to REJECTED, the
repo row flips to CLOSED OUT, and a red "close 0x…" tx link appears. The
freeze fires TWO real txs: the Cleanverse update_status event and the
on-chain IdentityRegistry gate flip, then the auto-closeout executes on
RepoDesk.
VOICE: "Mid-term, the borrower's A-Pass is frozen. MetaMask is asking me to
sign the credential event — EIP-712 typed data, bound to the RepoDesk
contract and this chain, reported live by the API. I sign, and the backend
verifies my signature before it executes anything. The gate flips, the
closeout runs automatically — no manual close. Not freeze-and-hope: the
repo closes out, on-chain, in the same moment as the event."

## SHOT 6 — The settlement nobody else has (90-100s)
SCREEN: Repo row → status CLOSED OUT, reason borrower_2 (the credential
event closed it). Settlement breakdown on screen: LENDER 984,900,000,000
(98.49% of obligation) · BORROWER EXCESS 15,100,000,000 → FAIL-CLOSED TO
ESCROW.
VOICE: "The closeout settles in defined numbers: the lender is covered to
98.49 percent of the obligation, and the borrower's excess — 15.1 billion
micro-units — is locked in escrow until the identity is restored. A frozen
party can never receive a single unit. That is the fail-closed property,
and it is on-chain."

## SHOT 7 — Evidence + audit (100-108s)
SCREEN: click "Audit" on the repo row → dialog shows the event ledger
(repo_opened → repo_closeout) and the audit artifact repo-…-audit.pdf.
VOICE: "Every leg is Travel Rule-attributed and appended to the audit pack —
the JSONL event ledger and the regulator artifact, hash-anchored on-chain."

## SHOT 8 — Close (108-118s)
SCREEN: text — "Pignora — the repo desk that closes out when trust does.
Cleanverse Build: Trusted Assets. Live on Monad testnet."
VOICE: "Cleanverse is not bolted onto Pignora — identity IS the protocol.
When trust changes, the trade closes, on defined terms. Pignora."

## CHECKLIST BEFORE RECORDING
- Desk open at https://pignora-desk.vercel.app/dashboard, backend badge
  shows "sandbox" (not "mock")
- MetaMask installed and on Monad testnet (chain 10143) — the signature
  domain is chain-bound, so the wrong network breaks the flow
- MetaMask must hold the OPERATOR key (the RELAY_KEY wallet 0x197F…7eE5).
  Import the private key into MetaMask before recording; the desk requires
  signatures from exactly this wallet for the credential event, and the
  wallet must be funded (auto-funded on connect — real mints)
- Borrower 0x197F2ed9C82c8a50Ad9bddd849d16Ce9afb17eE5 is ACTIVE (identity
  panel auto-verifies VERIFIED, tier 50, cap 2.0%). If it shows REJECTED,
  reactivate via the desk's wallet-signed call
- The positions table shows earlier on-chain repos with real hashes — that
  is real contract history, leave it on screen (it proves live data)
- Open takes ~30s (real tx mining) — do NOT double-click; wait for the row
- The freeze fires the closeout in the same click (reason borrower_2) — no
  manual Closeout click needed
- The tx links (open 0x… / close 0x…) are clickable to MonadScan — hover or
  click one on camera if you want the chain proof visible
- Record in one take per shot; stitch in any editor; upload unlisted to
  YouTube; paste the link into docs/SUBMISSION-EMAIL.md
