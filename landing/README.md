# Pignora landing

Professional marketing site for Pignora, the compliant repo rail for
tokenized assets on Monad. Live at https://pignora-five.vercel.app.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Self-hosted fonts: Inter Variable (body), JetBrains Mono (labels/code)

## Sections

- Hero with live backend status (chain + mode read from the deployed API)
- Mechanism: verify, price, escrow, close
- Policy table with live haircuts from the deployed backend `/policy`
- Verify terminal: live `/health` response from the deployed backend
- Footer with MonadScan links for both contracts

## Run

```bash
npm install
npm run dev      # local dev
npm run build    # production build to dist/
```

Set `VITE_API_URL` to point at a different backend (defaults to the deployed
one: https://backend-six-rho-86.vercel.app).

## Live data

Every number on the page that can be live is live. The hero status, policy
table, and verify terminal fetch the deployed backend. No mock data.

## Deploy

```bash
vercel deploy --prod --yes
```
