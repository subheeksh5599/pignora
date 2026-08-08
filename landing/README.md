# Pignora landing

Marketing landing for Pignora, the compliant repo rail for tokenized assets
on Monad. Live at https://pignora-five.vercel.app.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- GSAP ScrollTrigger (via `@gsap/react`)
- Self-hosted fonts: Gambarino (display), Sentient (body), JetBrains Mono (labels)

## Sections

- Hero with mosaic-tesserae canvas art seeded from the deployed RepoDesk
  contract address (same address always renders the same mosaic)
- Mechanism: verify, price, escrow, close
- Live policy table (haircuts read from the deployed backend `/policy`)
- Reference settlement numbers from the real testnet closeout
- Comparison: DeFi lending vs the rail
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

Every number on the page that can be live is live. The policy table and the
verify terminal fetch the deployed backend; the settlement band uses the real
reference settlement from the testnet repo. No mock data.

## Deploy

```bash
vercel deploy --prod --yes
```
