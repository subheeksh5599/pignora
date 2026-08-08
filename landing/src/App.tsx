import { useCallback, useEffect, useRef, useState } from "react";
import { PignoraWorld, type PresetName } from "./lib/world";
import { api, type Health } from "./lib/api";

const DESK_URL = "https://pignora-desk.vercel.app";
const REPO_DESK = "0x398D45F56F759Cd4b4cf0be07C2C4AADf7327edA";

const CHAPTERS = [
  {
    id: "desk",
    kicker: "The desk",
    title: "The repo desk that closes out when trust does.",
    body: "Repo moves trillions a day in TradFi. Pignora brings it on-chain for verified institutions: your Cleanverse A-Pass tier prices the lending cap, and a credential event mid-term triggers a defined, on-chain closeout.",
    coords: [["Instrument", "Repo"], ["Settlement", "aUSDC"]],
  },
  {
    id: "verify",
    kicker: "Verify",
    title: "Identity is the pricing engine.",
    body: "Every counterparty is checked against the Cleanverse A-Pass before a repo can open. Unverified wallets cannot borrow at all. The tier is mirrored on-chain into the IdentityRegistry, where it prices and gates every action.",
    coords: [["Rail", "CVI"], ["Gate", "On-chain"]],
  },
  {
    id: "price",
    kicker: "Price",
    title: "More verification, thinner haircut.",
    body: "A-Pass tiers run 0 to 99. Tier 50 and above lends at a 2 percent cap, tier 20 at 5 percent, the rest at 10 percent. The same bond, different terms, because of who you are verified to be.",
    coords: [["Tier 50+", "2%"], ["Tier 20+", "5%"], ["Basic", "10%"]],
  },
  {
    id: "escrow",
    kicker: "Escrow",
    title: "Both legs lock on-chain.",
    body: "The RepoDesk escrows collateral and the aUSDC cash leg until repayment, holding a 105 percent maintenance margin on-chain. Every repo carries a Travel Rule attribution anchor.",
    coords: [["Margin", "105%"], ["Attribution", "Travel Rule"]],
  },
  {
    id: "closeout",
    kicker: "Closeout",
    title: "A credential event closes the trade.",
    body: "Freeze, revocation, or expiry mid-term flips the on-chain gate. The margin call fires automatically and the position settles in defined numbers: lender covered, borrower excess fail-closed to escrow until identity is restored.",
    coords: [["Lender", "98.49%"], ["Excess", "Fail-closed"]],
  },
  {
    id: "proof",
    kicker: "Proof",
    title: "Verify it yourself.",
    body: "The desk talks to a live API on Monad testnet. These are real responses from the deployed backend, not screenshots.",
    coords: [["Chain", "10143"], ["Mode", "Live"]],
  },
];

const STYLES: { name: PresetName; label: string }[] = [
  { name: "sage", label: "Sage" },
  { name: "bone", label: "Bone" },
  { name: "mist", label: "Mist" },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

export default function App() {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<PignoraWorld | null>(null);
  const chaptersRef = useRef<HTMLElement[]>([]);
  const currentRef = useRef<HTMLSpanElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const [preset, setPreset] = useState<PresetName>("sage");
  const [progressDeg, setProgressDeg] = useState("000.0");
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const chapterRef = useRef(0);

  // boot the world
  useEffect(() => {
    if (reduced || !canvasRef.current) return;
    const world = new PignoraWorld(canvasRef.current, reduced);
    worldRef.current = world;
    // init() adds the is-webgl class itself on success; the CSS fallback
    // stays visible when WebGL is unavailable or reduced motion is set.
    world.init();
    const onScroll = () => {
      if (!world) return;
      world.updateScroll();
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      const index = Math.min(CHAPTERS.length - 1, Math.floor(p * CHAPTERS.length));
      chapterRef.current = index;
      chaptersRef.current.forEach((el, i) => el.classList.toggle("is-active", i === index));
      if (currentRef.current) currentRef.current.textContent = String(index + 1).padStart(2, "0");
      if (coordRef.current) coordRef.current.textContent = (p * 360).toFixed(1).padStart(5, "0") + "°";
      setProgressDeg((p * 360).toFixed(1).padStart(5, "0"));
    };
    const onResize = () => world.resize();
    const onVis = () => world.setVisible(document.visibilityState === "visible");
    const onHide = () => world.teardown();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide, { once: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      world.teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // live health read for the proof terminal
  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e) => setHealthError((e as Error).message));
  }, []);

  const applyPreset = useCallback((name: PresetName) => {
    setPreset(name);
    document.body.dataset.style = name;
    worldRef.current?.applyPreset(name);
  }, []);

  // register chapter elements
  const registerChapter = useCallback((el: HTMLElement | null, index: number) => {
    if (el) chaptersRef.current[index] = el;
  }, []);

  const terminalLines: string[] = [];
  terminalLines.push("$ curl -s " + api.base + "/health");
  if (health) {
    terminalLines.push("{");
    terminalLines.push(`  "ok": ${health.ok},`);
    terminalLines.push(`  "mode": "${health.mode}",`);
    terminalLines.push(`  "chain": "${health.chain}",`);
    terminalLines.push(`  "monad": { "chainId": ${health.monad.chainId} },`);
    terminalLines.push(`  "contracts": {`);
    terminalLines.push(`    "repoDesk": "${health.contracts.repoDesk ?? REPO_DESK}",`);
    terminalLines.push(`    "registry": "${health.contracts.registry ?? ""}"`);
    terminalLines.push(`  },`);
    terminalLines.push(`  "cleanverse": "${health.cleanverse}"`);
    terminalLines.push("}");
  } else if (healthError) {
    terminalLines.push(`error: ${healthError}`);
  } else {
    terminalLines.push("fetching live state...");
  }

  return (
    <div className="app">
      <a href="#proof" className="skip-to-content">Skip to content</a>

      {/* fixed 3D world */}
      <div className="world" aria-hidden="true">
        <div className="fallback" />
        <canvas id="scene" ref={canvasRef} />
      </div>

      {/* topbar */}
      <header className="topbar">
        <a className="brand" href="#desk">Pignora</a>
        <span className="mode">Repo rail · Monad testnet</span>
        <span className="chapter-count"><b ref={currentRef}>01</b> / {String(CHAPTERS.length).padStart(2, "0")}</span>
      </header>

      {/* art direction switch */}
      <aside className="style-switch" aria-label="Art direction">
        <span className="style-label">Art direction</span>
        {STYLES.map((s, i) => (
          <button
            key={s.name}
            className="style-button"
            type="button"
            data-preset={s.name}
            data-index={String(i + 1).padStart(2, "0")}
            aria-pressed={preset === s.name}
            onClick={() => applyPreset(s.name)}
          >
            {s.label}
          </button>
        ))}
      </aside>

      {/* progress meter */}
      <div className="meter" aria-hidden="true">
        <span>Scroll the rail</span>
        <span className="meter-line"><i /></span>
        <span ref={coordRef}>{progressDeg}°</span>
      </div>

      {/* chapters */}
      <main className="chapters">
        {CHAPTERS.map((c, i) => (
          <section key={c.id} id={c.id} className="chapter" ref={(el) => registerChapter(el, i)}>
            <div className="copy">
              <span className="eyebrow">{String(i + 1).padStart(2, "0")} / {c.kicker}</span>
              {i === 0 ? <h1>{c.title}</h1> : <h2>{c.title}</h2>}
              <p>{c.body}</p>
              <div className="coords">
                {c.coords.map(([k, v]) => (
                  <span key={k}>{k} <b>{v}</b></span>
                ))}
              </div>
              {i === CHAPTERS.length - 1 && (
                <>
                  <div className="terminal">
                    <pre>{terminalLines.join("\n")}</pre>
                  </div>
                  <a className="cta" href={DESK_URL}>Open the desk ↗</a>
                </>
              )}
            </div>
          </section>
        ))}
      </main>

      <footer className="foot">
        <span>Pignora · Cleanverse Build · Trusted Assets</span>
        <span>Native scroll · reversible · reduced-motion ready</span>
      </footer>

      <noscript><p className="noscript">The complete story remains readable, but the real-time 3D world requires JavaScript.</p></noscript>
    </div>
  );
}
