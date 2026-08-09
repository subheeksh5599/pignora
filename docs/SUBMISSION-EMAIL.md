# Pignora — Submission email (draft)

To: isaac@cleanverse.com
Subject: Cleanverse Build submission — Pignora (repo rail for RWA on Monad)

---

Hi Isaac,

Submitting Pignora for the Cleanverse Build: Trusted Assets hackathon.

The one-liner: a repo desk for tokenized assets on Monad, where the lending
cap is priced by the counterparty's A-Pass tier and a credential event
mid-term closes the position out on-chain — not freeze-and-hope.

What's there:

- Repo: https://github.com/subheeksh5599/pignora
- Live desk: https://pignora-desk.vercel.app/dashboard (landing is the same
  URL, the desk is /dashboard)
- Demo video: https://youtu.be/PASTE_VIDEO_LINK_HERE
- One-page summary: https://github.com/subheeksh5599/pignora/blob/main/docs/ONE-PAGER.md

How it works in one pass:

1. The lender connects their wallet on the desk. The rail provisions it on
   the testnet (gas, cash, collateral — real transactions) and registers it
   as a verified counterparty on-chain.
2. Before lending, the desk checks the borrower's A-Pass live (tier 50 in
   the demo prices the lending cap at 2%).
3. Opening a repo is two wallet signatures: approve the cash, then sign the
   open. The RepoDesk escrows both legs, 105% maintenance margin enforced
   on-chain.
4. If the borrower's credential is frozen mid-term (the credential event,
   EIP-712 signed by the operator wallet), the identity gate flips and the
   closeout runs: the lender is covered to the obligation, the borrower's
   excess fails closed to escrow until the identity is restored.
5. Every leg carries Travel Rule attribution and lands in an append-only
   audit pack with a PDF artifact.

What's on-chain (all Monad testnet, chain 10143):

- RepoDesk 0x398D45F56F759Cd4b4cf0be07C2C4AADf7327edA
- IdentityRegistry 0xdcb889940B95FF9625d76a735DaCdFEB979aD4C2
- Every position on the desk links its real open and closeout transactions.

The honest caveats:

- Settlement cash is a USD-pegged CVA stand-in (free-transfer) because the
  aUSDC A-Token only transfers between registered vaults; registering the
  RepoDesk as a vault is the remaining step to settle in real aUSDC.
- Identity checks and credential events use the sandbox Cleanverse API (the
  hackathon credential); no real assets involved, as the sandbox requires.

Happy to walk through anything. Thanks for running this.

Best,
Subheeksh
