# Pignora — Demo narration (USER cut, recorded)

Matches the recorded video exactly: user flow only. No operator account
switch, no explorer shown, no manual closeout. All numbers live.

## SHOT 1 — Hook (0-8s)
SCREEN: "$4T a day moves through repo desks in TradFi. Zero of it happens
on-chain — because identity changes mid-term."
VOICE: "Repurchase agreements move four trillion dollars a day. They have
never worked on-chain, because a counterparty's verified identity can change
while the trade is still live."

## SHOT 2 — The desk, live identity (8-22s)
SCREEN: desk loads, badge shows sandbox.
VOICE: "This is the Pignora desk on Monad testnet. Every number here is live
— the identity rail, the policy, the positions all read from the deployed
backend and the chain."

## SHOT 3 — Connect as the user (22-35s)
SCREEN: click "Connect wallet" → MetaMask popup → approve → wallet chip
shows your address.
VOICE: "I connect as the lender. The rail provisions my wallet on the
testnet — gas, cash, and collateral, real transactions — so everything from
here runs from MY wallet."

## SHOT 4 — Verify the counterparty (35-50s)
SCREEN: borrower field 0x197F…7eE5 → click "Verify" → panel populates:
VERIFIED, tier 50, cap 2.0%, CV record.
VOICE: "Before I lend against him, I check his identity on the Cleanverse
rail. Tier 50, verified — that prices the lending cap at 2 percent. More
verification, thinner cap. An unverified wallet cannot open a repo at all."

## SHOT 5 — Open the repo (50-90s)
SCREEN: form prefilled (collateral 1,000,000,000,000 BOND, cash
950,000,000,000, fee 50 bps, term 7 days) → "Open repo" → MetaMask popup 1:
approve cash → MetaMask popup 2: sign openRepo → wait ~30s (real mining) →
row appears: OPEN, cap 2.0%.
VOICE: "I open a seven-day repo against the tier-50 borrower. MetaMask asks
me twice — first to approve the cash, then to sign the open itself. I am the
lender, so my wallet's cash gets escrowed on-chain, and the 105 percent
maintenance margin is enforced by the contract. The transaction is real,
mined on Monad testnet, and recorded on the position."

## SHOT 6 — Close (90-100s)
SCREEN: the open repo row remains, status OPEN.
VOICE: "That is the rail: a real repo, priced by verified identity, escrowed
on-chain. When a credential event fires mid-term, this position closes out
automatically in defined numbers — the fail-closed property that makes repo
desks possible on-chain. Pignora."

## NOTES
- No operator account switch anywhere in this cut.
- No explorer link opened on camera (links exist on the desk and work; the
  cut just does not visit them).
- No manual closeout pressed — the video ends with the open repo in place,
  and the closeout is described as the automatic response to a credential
  event (true: executeCloseout is permissionless and auto-triggered by the
  credential flip).
