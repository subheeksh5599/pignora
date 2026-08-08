# Pignora landing

A scroll-through-3D-world landing for Pignora, the compliant repo rail for
tokenized assets on Monad. Live at https://pignora-five.vercel.app.

## Stack

- Vite + React + TypeScript
- Three.js (local npm module, no CDN): one real-time scene, scroll-conducted
  camera, no orbit controls, no wheel hijacking
- HD PNG texture set under `public/textures/` (ledger paper, vault glyphs
  carrying the deployed RepoDesk address, mosaic tiles, closeout document)
- Self-hosted fonts: Gambarino (display), Sentient (body), JetBrains Mono (labels)

## The world

A kinetic repo-rail sculpture: a faceted IdentityRegistry core plated with
the deployed contract address, an instanced bead shell of verified
identities, three tier rings (the lending caps), six evidence nodes (the
audit events), and a ledger-paper floor.

Six chapters (Desk, Verify, Price, Escrow, Closeout, Proof) each ~118vh.
Scroll progress is the only conductor: it maps to camera orbit, camera
distance, world rotation, ring scale, core emphasis, and the active chapter.
Native reversible scrolling; the Proof chapter renders a live `/health`
response from the deployed backend.

## Art directions

Three light modes (sage, bone, mist) via a persistent switch. Each changes
the field, materials, lighting, and page palette, not just an accent.

## Accessibility and performance

- `prefers-reduced-motion`: no WebGL, a static CSS sculpture, fully readable
  stacked chapters
- WebGL unavailable: CSS-only fallback sculpture, story stays readable
- devicePixelRatio capped at 2, resize handled, rAF paused when hidden,
  all geometry/material/texture/renderer resources disposed on teardown
- No shadow maps (low-end 2-core iGPU target); depth comes from the HD
  textures and materials
- Zero em/en dashes in copy; every number that can be live is live

## Run

```bash
npm install
npm run dev      # local dev
npm run build    # production build to dist/
```

Set `VITE_API_URL` to point at a different backend (defaults to the deployed
one: https://backend-six-rho-86.vercel.app).

## Deploy

```bash
vercel deploy --prod --yes
```
