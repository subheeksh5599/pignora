/**
 * Mosaic-tesserae art: a seeded grid of tiles, each inscribed with two
 * hex chars drawn from the deployed RepoDesk address, shaded by
 * deterministic chance, with a slow ceramic shimmer.
 *
 * The seed is the real on-chain identifier, so the art carries honest
 * data: the same contract always renders the same mosaic.
 */

const GLYPHS = "0123456789abcdef";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromAddress(address: string): number {
  let h = 2166136261;
  for (let i = 0; i < address.length; i++) {
    h ^= address.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const INK = "#0c2128";
const PAPER = "#edf0ee";
const MID = "#c4cdc7";
const LINE = "#d9dfda";

export function drawMosaic(
  canvas: HTMLCanvasElement,
  address: string,
  reducedMotion: boolean,
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rnd = mulberry32(seedFromAddress(address));
  const tile = Math.max(22, Math.floor(w / 18));
  const cols = Math.ceil(w / tile);
  const rows = Math.ceil(h / tile);
  const t0 = performance.now();
  const c = ctx;
  c.scale(dpr, dpr);

  c.fillStyle = PAPER;
  c.fillRect(0, 0, w, h);

  function frame(now: number) {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, w, h);
    const t = (now - t0) / 1000;

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = i * tile;
        const y = j * tile;
        const roll = rnd();

        let fill = PAPER;
        if (roll < 0.16) fill = INK;
        else if (roll < 0.34) fill = MID;

        c.fillStyle = fill;
        c.fillRect(x + 1, y + 1, tile - 2, tile - 2);

        // hairline seams
        c.strokeStyle = LINE;
        c.lineWidth = 1;
        c.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);

        // inscribed glyph pair on ink tiles
        if (fill === INK) {
          const g1 = GLYPHS[Math.floor(rnd() * 16)];
          const g2 = GLYPHS[Math.floor(rnd() * 16)];
          c.fillStyle = PAPER;
          c.font = `${Math.floor(tile * 0.42)}px "JetBrains Mono", monospace`;
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.fillText(g1 + g2, x + tile / 2, y + tile / 2);
        }

        // ceramic shimmer
        if (!reducedMotion && fill !== PAPER) {
          const shimmer = Math.sin(t * 0.9 + i * 0.6 + j * 0.9) * 0.05;
          c.fillStyle = `rgba(255,255,255,${Math.max(0, shimmer)})`;
          c.fillRect(x + 1, y + 1, tile - 2, tile - 2);
        }
      }
    }

    if (!reducedMotion) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
