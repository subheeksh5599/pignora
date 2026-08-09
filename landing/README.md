# Pignora landing

Marketing site for Pignora, the compliant repo rail for tokenized assets on
Monad. Live at https://pignora-five.vercel.app.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Self-hosted fonts: Oswald (display), Instrument Serif (italic accents),
  IBM Plex Mono (labels/data)
- Film grain overlay via inline SVG turbulence

## Sections

- Hero with live backend status
- Stat band (identity rail, cash leg, margin, cap)
- Mechanism: animated 4-step pipeline (verify, price, escrow, close) that
  plays on scroll
- Policy table with live haircuts from the deployed backend `/policy`
- Closeout band (real settlement numbers from the testnet repo)
- Proof terminal: live `/health` response from the deployed backend
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
table, and proof terminal fetch the deployed backend. No mock data.

## Deploy

```bash
vercel deploy --prod --yes
```
