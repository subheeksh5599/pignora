# Pignora — Demo video storyboard (USER flow, shot-by-shot)

Record at 1080p, screen + voiceover. Total ~110 seconds. Every number on
screen is REAL: identity reads the live Cleanverse API, every repo row has a
real MonadScan tx link, and the open lands a real transaction from YOUR
wallet.

ROLE: you are the USER (lender). Your connected MetaMask wallet is the
lender — it signs the open and the closeout. The credential event (freeze)
is the institution's action (relay-gated by the contract); on camera we
show it through the operator account, then the closeout happens from any
wallet (permissionless).

## SHOT 1 — Hook (0-8s)
SCREEN: white text on dark — "$4T a day moves through repo desks in TradFi.
Zero of it happens on-chain — because identity changes mid-term."
VOICE: "Repurchase agreements move four trillion dollars a day. They have
never worked on-chain, because a counterparty's verified identity can change
while the trade is still live."

## SHOT 2 — The desk, real identity (8-22s)
SCREEN: https://pignora-desk.vercel.app/dashboard — identity panel:
borrower 0x197F…7eE5, Status VERIFIED, Tier 50, Lending cap 2.0%, CV record
on-chain. Badge shows "sandbox".
VOICE: "This is the Pignora desk on Monad testnet. The borrower's Cleanverse
A-Pass is real — queried live, tier 50. The lending cap is priced by that
tier: more verification, higher cap. An unverified wallet cannot open a repo
at all."

## SHOT 3 — Connect as the user (22-35s)
SCREEN: click "Connect wallet" → MetaMask popup → approve → the header chip
shows YOUR wallet address (0xc143… or whatever you connect with). The desk
auto-funds it: real mints of testnet MON gas, cash, and BOND collateral.
VOICE: "I connect as the lender. The rail provisions my wallet on the
testnet — gas, cash, and collateral, real transactions — so the repo
lifecycle runs from MY wallet."

## SHOT 4 — Verify the counterparty (35-45s)
SCREEN: borrower wallet field has 0x197F…7eE5 → click "Verify" → identity
panel populates: VERIFIED, tier 50, cap 2.0%, cv record id.
VOICE: "Before I lend against him, I check his identity on the Cleanverse
rail. Tier 50, verified — the lending cap is 2 percent. That is the
counterparty pricing the trade."

## SHOT 5 — Open the repo (45-75s)
SCREEN: Open-a-repo form: collateral 1,000,000,000,000 BOND units, cash
950,000,000,000, fee 50 bps, term 7 days → click "Open repo" → MetaMask
popup 1: approve cash to the RepoDesk → MetaMask popup 2: sign openRepo →
WAIT ~30s (real tx mining) → the row appears: repo #14, status OPEN, cap
2.0%, and the tx link "open 0x…" (linked to MonadScan).
VOICE: "I open a seven-day repo against the tier-50 borrower. MetaMask asks
me twice: first to approve the cash, then to sign the open itself. I am the
lender — my wallet's cash gets escrowed on-chain, and the 105 percent
maintenance margin is enforced by the contract. The open is a real
transaction from my wallet. Here is the hash on the row, linked to
MonadScan."

## SHOT 6 — THE MOMENT: the credential event (75-95s)
SCREEN: switch MetaMask to the operator account (0x197F…7eE5) → click
"Freeze borrower credential" → MetaMask shows the EIP-712 signature request
(CredentialEvent: subject, status, tier, nonce, timestamp — domain bound to
the RepoDesk contract and the chain reported by the live API) → Sign → in
the same moment the identity panel flips to REJECTED and the repo row flips
to CLOSED OUT with a red "close 0x…" link.
VOICE: "Mid-term, the borrower's credential is frozen — this is the
institution's action, signed by the operator wallet: EIP-712 typed data,
bound to the RepoDesk contract, verified by the backend before it executes
anything. The moment the credential dies, the gate flips and the closeout
runs automatically. Not freeze-and-hope: the repo closes out on-chain in the
same instant."

## SHOT 7 — The settlement nobody else has (95-103s)
SCREEN: repo row → CLOSED OUT. Settlement: LENDER covered to the obligation,
borrower excess fail-closed to escrow until identity restores.
VOICE: "The closeout settles in defined numbers — the lender is covered to
the obligation, and the borrower's excess is locked in escrow until the
identity is restored. A frozen party can never receive a single unit. That
is the fail-closed property, on-chain."

## SHOT 8 — Evidence + audit (103-110s)
SCREEN: click "Audit" on the repo row → dialog: event ledger
(repo_opened → repo_closeout) + the audit artifact PDF.
VOICE: "Every leg is Travel Rule-attributed and appended to the audit pack —
the event ledger and the regulator artifact."

## SHOT 9 — Close (110-118s)
SCREEN: text — "Pignora — the repo desk that closes out when trust does.
Cleanverse Build: Trusted Assets. Live on Monad testnet."
VOICE: "Cleanverse is not bolted onto Pignora — identity IS the protocol.
When trust changes, the trade closes, on defined terms. Pignora."

## CHECKLIST BEFORE RECORDING
- Desk open at https://pignora-desk.vercel.app/dashboard, backend badge
  shows "sandbox"
- MetaMask on Monad testnet (chain 10143) — the signature domain is
  chain-bound, wrong network breaks the flow
- TWO accounts in MetaMask: your user wallet (first) + the operator account
  0x197F…7eE5 imported (avatar → Add account → Import account → paste the
  RELAY_KEY private key). Switch accounts via the avatar circle.
- Borrower 0x197F2ed9C82c8a50Ad9bddd849d16Ce9afb17eE5 is ACTIVE (identity
  panel shows VERIFIED tier 50). If REJECTED, reactivate it first.
- Your wallet is funded (auto on connect: gas + cash + BOND). If an open
  reverts TransferFailed, the funding may have run low — connect again.
- Positions may show earlier repos with real hashes — that is real contract
  history, leave it on screen (it proves live data)
- Open takes ~30s (real tx mining) — do NOT double-click
- Closeout on a HEALTHY repo is refused by the contract (NoMarginCall) —
  the freeze must come first. The freeze flips the row itself.
- Freeze signature must come from the OPERATOR account (0x197F…7eE5). If
  the header chip shows a red "≠ operator", switch accounts in MetaMask.
- The tx links (open 0x… / close 0x…) open MonadScan — hover one on camera
  for the chain proof
- Record per shot, stitch in any editor, upload unlisted to YouTube, paste
  the link into docs/SUBMISSION-EMAIL.md
