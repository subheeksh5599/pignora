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

- Hero with live backend status and a video of the real desk (screen
  captures of the live product: identity gate, repo open, credential
  freeze, closeout)
- Stat band (identity rail, cash leg, margin, cap)
- Mechanism: verify, price, escrow, close
- Policy table with live haircuts from the deployed backend `/policy`
- Closeout band (real settlement numbers from the testnet repo)
- Proof terminal: live `/health` response from the deployed backend
- Footer with MonadScan links for both contracts

## Hero video

`public/video/hero.mp4` is built from the project's real desk screenshots
(docs/media/1-4.png) with ffmpeg crossfades. Rebuild:

```bash
ffmpeg -y -loop 1 -t 3 -i 1.png -loop 1 -t 3 -i 2.png -loop 1 -t 3 -i 3.png \
  -loop 1 -t 3 -i 4.png -filter_complex \
  "[0:v]scale=1280:720,setsar=1,format=yuv420p[v0];[1:v]scale=1280:720,setsar=1,format=yuv420p[v1];[2:v]scale=1280:720,setsar=1,format=yuv420p[v2];[3:v]scale=1280:720,setsar=1,format=yuv420p[v3];[v0][v1]xfade=transition=fade:duration=0.7:offset=2.3[x1];[x1][v2]xfade=transition=fade:duration=0.7:offset=4.6[x2];[x2][v3]xfade=transition=fade:duration=0.7:offset=6.9[x3]" \
  -map "[x3]" -c:v libx264 -preset veryfast -crf 23 -movflags +faststart hero.mp4
```

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
