import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { api, type Health } from "./lib/api";
import { drawMosaic } from "./lib/art";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const REPO_DESK = "0x398D45F56F759Cd4b4cf0be07C2C4AADf7327edA";
const REGISTRY = "0xdcb889940B95FF9625d76a735DaCdFEB979aD4C2";
const DESK_URL = "https://pignora-desk.vercel.app";
const GITHUB_URL = "https://github.com/subheeksh5599/pignora";
const MONADSCAN_DESK = `https://testnet.monadscan.xyz/address/${REPO_DESK}`;

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

/* ------------------------------------------------------------ nav */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b hairline bg-paper/90 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6" aria-label="Main">
        <a href="#top" className="display text-xl tracking-tight focus-ring">
          Pignora
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#mechanism" className="mono-label text-ink-soft transition-colors hover:text-ink focus-ring">
            Mechanism
          </a>
          <a href="#policy" className="mono-label text-ink-soft transition-colors hover:text-ink focus-ring">
            Policy
          </a>
          <a href="#verify" className="mono-label text-ink-soft transition-colors hover:text-ink focus-ring">
            Verify
          </a>
        </div>
        <a
          href={DESK_URL}
          className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition-all duration-200 hover:bg-ink-soft focus-ring"
        >
          Open the desk
        </a>
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------ hero */

function Hero({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [health, setHealth] = useState<Health | null>(null);

  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        gsap.from("[data-hero-line]", {
          y: 40,
          opacity: 0,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.12,
          delay: 0.15,
        });
        gsap.from("[data-hero-meta]", {
          y: 20,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          delay: 0.6,
        });
        gsap.from("[data-hero-art]", {
          opacity: 0,
          scale: 0.98,
          duration: 1.4,
          ease: "power2.out",
          delay: 0.3,
        });
      }, rootRef);
      return () => ctx.revert();
    },
    { scope: rootRef },
  );

  useEffect(() => {
    if (canvasRef.current) drawMosaic(canvasRef.current, REPO_DESK, reduced);
  }, [reduced]);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <section ref={rootRef} id="top" className="relative overflow-hidden pt-16">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.15fr_0.85fr] md:pb-28 md:pt-24">
        <div>
          <p data-hero-meta className="mono-label mb-8 flex items-center gap-3 text-ink-soft">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal" aria-hidden="true" />
            Repo on-chain, priced by verified identity
          </p>
          <h1 className="display text-[clamp(2.6rem,6vw,5rem)]">
            <span data-hero-line className="block">The repo desk</span>
            <span data-hero-line className="block">that closes out</span>
            <span data-hero-line className="block">when trust does.</span>
          </h1>
          <p data-hero-line className="mt-8 max-w-md text-lg leading-relaxed text-ink-soft">
            Pignora is a compliant repo rail for tokenized assets on Monad. Your
            Cleanverse A-Pass tier prices the lending cap, and a credential
            event mid-term triggers a defined, on-chain closeout. No
            freeze-and-hope.
          </p>
          <div data-hero-line className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href={DESK_URL}
              className="rounded-full bg-ink px-7 py-3 text-sm font-medium text-paper transition-all duration-200 hover:bg-ink-soft focus-ring"
            >
              Open the desk
            </a>
            <a
              href="#mechanism"
              className="rounded-full border hairline px-7 py-3 text-sm font-medium text-ink transition-colors duration-200 hover:bg-paper-deep focus-ring"
            >
              Read the mechanism
            </a>
          </div>
          <div data-hero-meta className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <p className="mono-label text-ink-soft">Chain</p>
              <p className="mt-1 text-sm text-ink">Monad testnet · 10143</p>
            </div>
            <div>
              <p className="mono-label text-ink-soft">Identity rail</p>
              <p className="mt-1 text-sm text-ink">Cleanverse CVI · CVA</p>
            </div>
            <div>
              <p className="mono-label text-ink-soft">Cash leg</p>
              <p className="mt-1 text-sm text-ink">aUSDC, Travel Rule attributed</p>
            </div>
            <div>
              <p className="mono-label text-ink-soft">API mode</p>
              <p className="mt-1 text-sm text-ink">
                {health ? health.mode : "checking live API"}
              </p>
            </div>
          </div>
        </div>

        <div data-hero-art className="relative">
          <div className="dot-grid absolute -right-10 -top-10 h-40 w-40 opacity-60" aria-hidden="true" />
          <canvas
            ref={canvasRef}
            className="h-[320px] w-full border hairline md:h-[460px]"
            aria-label="Mosaic rendered from the deployed RepoDesk contract address"
            role="img"
          />
          <div className="mt-4 flex items-center justify-between">
            <p className="mono-label text-ink-soft">RepoDesk · Monad testnet</p>
            <a
              href={MONADSCAN_DESK}
              className="mono-label underline decoration-line underline-offset-4 transition-colors hover:text-ink-soft focus-ring"
            >
              View on MonadScan
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- marquee */

const MARQUEE_ITEMS = [
  "Identity prices the cap",
  "Credential events close the trade",
  "Settles in aUSDC",
  "Travel Rule on every leg",
  "Fail-closed escrow",
  "Append-only audit pack",
];

function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="overflow-hidden border-y hairline bg-paper-deep/60 py-4" aria-hidden="true">
      <div className="flex w-max animate-[marquee_30s_linear_infinite] items-center gap-10 pr-10">
        {items.map((item, i) => (
          <span key={i} className="mono-label whitespace-nowrap text-ink-soft">
            {item} <span className="ml-10 text-ink/30">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------- mechanism */

const STEPS = [
  {
    word: "Verify",
    title: "Identity is the pricing engine",
    body: "Every counterparty is checked against the Cleanverse A-Pass before a repo can open. Unverified wallets cannot borrow at all; the tier itself is read on-chain into the IdentityRegistry.",
  },
  {
    word: "Price",
    title: "The tier sets the lending cap",
    body: "A-Pass tiers run 0 to 99. Deeper verification buys a thinner haircut: tier 50 and above lends at a 2 percent cap, tier 20 at 5 percent, the rest at 10 percent. The same bond, different terms, because of who you are verified to be.",
  },
  {
    word: "Escrow",
    title: "Both legs lock on-chain",
    body: "The RepoDesk escrows collateral and the aUSDC cash leg until repayment, holding a 105 percent maintenance margin on-chain. Every repo carries a Travel Rule attribution anchor.",
  },
  {
    word: "Close",
    title: "A credential event closes the trade",
    body: "Freeze, revocation, or expiry mid-term flips the on-chain gate. The margin call fires automatically and the position settles in defined numbers: lender covered, borrower excess fail-closed to escrow until identity is restored.",
  },
];

function Mechanism({ reduced }: { reduced: boolean }) {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        STEPS.forEach((_, i) => {
          gsap.from(`[data-step="${i}"]`, {
            opacity: 0,
            y: 48,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: `[data-step="${i}"]`,
              start: "top 78%",
            },
          });
        });
        gsap.from("[data-mech-word]", {
          opacity: 0.14,
          duration: 0.6,
          stagger: 0.35,
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 70%",
            end: "bottom 30%",
            scrub: 0.6,
          },
        });
      }, rootRef);
      return () => ctx.revert();
    },
    { scope: rootRef, dependencies: [reduced] },
  );

  return (
    <section ref={rootRef} id="mechanism" className="mx-auto max-w-6xl px-6 py-24 md:py-36">
      <div className="mb-16 flex flex-col gap-4 md:mb-24 md:flex-row md:items-end md:justify-between">
        <h2 className="display text-[clamp(2rem,4.5vw,3.4rem)]">Four moves,<br />one rail.</h2>
        <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
          The lifecycle of a Pignora repo, from verification to closeout.
        </p>
      </div>

      <div className="mb-16 grid gap-4 md:grid-cols-4" aria-hidden="true">
        {STEPS.map((s) => (
          <span
            key={s.word}
            data-mech-word
            className="display text-[clamp(3rem,7vw,5.5rem)] text-ink"
          >
            {s.word}
          </span>
        ))}
      </div>

      <div className="border-t hairline">
        {STEPS.map((s, i) => (
          <div
            key={s.word}
            data-step={i}
            className="grid gap-4 border-b hairline py-10 md:grid-cols-[0.4fr_1fr_1.4fr] md:gap-10 md:py-14"
          >
            <p className="mono-label pt-1 text-ink-soft">Step {i + 1}</p>
            <h3 className="display text-2xl md:text-3xl">{s.title}</h3>
            <p className="text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- policy */

function Policy({ reduced }: { reduced: boolean }) {
  const rootRef = useRef<HTMLElement>(null);
  const [haircuts, setHaircuts] = useState<Record<string, string> | null>(null);
  const [margin, setMargin] = useState<number | null>(null);

  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        gsap.from("[data-policy-head]", {
          opacity: 0,
          y: 40,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-policy-head]", start: "top 82%" },
        });
        gsap.from("[data-policy-row]", {
          opacity: 0,
          x: -24,
          duration: 0.8,
          ease: "power2.out",
          stagger: 0.1,
          scrollTrigger: { trigger: "[data-policy-table]", start: "top 80%" },
        });
      }, rootRef);
      return () => ctx.revert();
    },
    { scope: rootRef, dependencies: [reduced] },
  );

  useEffect(() => {
    api
      .policy()
      .then((p) => {
        setHaircuts(p.haircuts);
        setMargin(p.maintenanceMarginBps);
      })
      .catch(() => {});
  }, []);

  const rows = [
    { tier: "Tier 50+", label: "Deep verification", bucket: "3", fallback: "2% cap" },
    { tier: "Tier 20+", label: "Standard verification", bucket: "2", fallback: "5% cap" },
    { tier: "Tier 10+", label: "Basic verification", bucket: "1", fallback: "8% cap" },
  ];

  return (
    <section ref={rootRef} id="policy" className="border-y hairline bg-paper-deep/50">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-36">
        <div data-policy-head className="mb-14 grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
          <h2 className="display text-[clamp(2rem,4.5vw,3.4rem)]">
            More verification,<br />thinner haircut.
          </h2>
          <div className="max-w-sm">
            <p className="text-[15px] leading-relaxed text-ink-soft">
              The lending cap is not a governance vote. It is a function of the
              counterparty A-Pass tier, enforced on-chain in the IdentityRegistry.
            </p>
            <p className="mono-label mt-6 text-ink-soft">
              Maintenance margin {margin ? `${(margin / 100).toFixed(2)}%` : "105%"}
            </p>
          </div>
        </div>

        <div data-policy-table className="border hairline">
          <div className="grid grid-cols-2 border-b hairline bg-paper-deep/70 px-6 py-4 md:grid-cols-4">
            <p className="mono-label text-ink-soft">A-Pass tier</p>
            <p className="mono-label hidden text-ink-soft md:block">Verification depth</p>
            <p className="mono-label text-ink-soft">Lending cap</p>
            <p className="mono-label hidden text-right text-ink-soft md:block">Enforced by</p>
          </div>
          {rows.map((r) => {
            const live = haircuts?.[r.bucket];
            return (
              <div
                key={r.tier}
                data-policy-row=""
                className="grid grid-cols-2 border-b hairline px-6 py-6 last:border-b-0 md:grid-cols-4 md:items-center"
              >
                <p className="display text-xl md:text-2xl">{r.tier}</p>
                <p className="hidden text-sm text-ink-soft md:block">{r.label}</p>
                <p className="text-sm">
                  {live ? `haircut ${live}` : r.fallback}
                  <span className="mt-1 block text-xs text-ink-soft">
                    {live ? "live from /policy" : "contract default"}
                  </span>
                </p>
                <p className="hidden text-right text-sm text-ink-soft md:block">
                  IdentityRegistry
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- verify */

function Verify({ reduced }: { reduced: boolean }) {
  const rootRef = useRef<HTMLElement>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        gsap.from("[data-verify-head]", {
          opacity: 0,
          y: 40,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-verify-head]", start: "top 82%" },
        });
        gsap.from("[data-verify-term]", {
          opacity: 0,
          y: 48,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-verify-term]", start: "top 80%" },
        });
      }, rootRef);
      return () => ctx.revert();
    },
    { scope: rootRef, dependencies: [reduced] },
  );

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e) => setHealthError((e as Error).message));
  }, []);

  const lines: string[] = [];
  lines.push("$ curl -s " + api.base + "/health");
  if (health) {
    lines.push(`{`);
    lines.push(`  "ok": ${health.ok},`);
    lines.push(`  "mode": "${health.mode}",`);
    lines.push(`  "chain": "${health.chain}",`);
    lines.push(`  "monad": { "chainId": ${health.monad.chainId} },`);
    lines.push(`  "contracts": {`);
    lines.push(`    "repoDesk": "${health.contracts.repoDesk ?? ""}",`);
    lines.push(`    "registry": "${health.contracts.registry ?? ""}"`);
    lines.push(`  },`);
    lines.push(`  "cleanverse": "${health.cleanverse}"`);
    lines.push(`}`);
  } else if (healthError) {
    lines.push(`error: ${healthError}`);
  } else {
    lines.push(`fetching live state...`);
  }

  return (
    <section ref={rootRef} id="verify" className="mx-auto max-w-6xl px-6 py-24 md:py-36">
      <div data-verify-head className="mb-14 grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
        <h2 className="display text-[clamp(2rem,4.5vw,3.4rem)]">
          Verify it<br />yourself.
        </h2>
        <p className="max-w-sm text-[15px] leading-relaxed text-ink-soft">
          The desk talks to a live API. These are real responses from the
          deployed backend, not screenshots.
        </p>
      </div>

      <div data-verify-term className="border hairline bg-ink text-paper">
        <div className="flex items-center justify-between border-b border-paper/15 px-5 py-3">
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-signal" />
            <span className="h-2.5 w-2.5 rounded-full bg-paper/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-paper/30" />
          </div>
          <p className="mono-label text-paper/60">pignora api · live</p>
        </div>
        <pre className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed text-paper/90">
          {lines.join("\n")}
        </pre>
        <div className="border-t border-paper/15 px-5 py-3">
          <p className="mono-label text-paper/60">
            live from {api.base.replace("https://", "")}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------ settlement */

const SETTLEMENT_FACTS = [
  {
    label: "Obligation covered",
    value: "98.49%",
    note: "lender recovered at closeout",
  },
  {
    label: "Excess fail-closed",
    value: "15.1e9",
    note: "borrower units escrowed",
  },
  {
    label: "Lending cap",
    value: "2%",
    note: "haircut at tier 50, real A-Pass",
  },
  {
    label: "Closeout reason",
    value: "borrower_2",
    note: "freeze fired the gate",
  },
];

function Settlement({ reduced }: { reduced: boolean }) {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        gsap.from("[data-settle-head]", {
          opacity: 0,
          y: 40,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-settle-head]", start: "top 82%" },
        });
        gsap.from("[data-settle-card]", {
          opacity: 0,
          y: 32,
          duration: 0.8,
          ease: "power2.out",
          stagger: 0.12,
          scrollTrigger: { trigger: "[data-settle-grid]", start: "top 80%" },
        });
      }, rootRef);
      return () => ctx.revert();
    },
    { scope: rootRef, dependencies: [reduced] },
  );

  return (
    <section ref={rootRef} className="border-y hairline bg-paper-deep/50">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-36">
        <div data-settle-head className="mb-14 grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
          <h2 className="display text-[clamp(2rem,4.5vw,3.4rem)]">
            The closeout<br />in defined numbers.
          </h2>
          <p className="max-w-sm text-[15px] leading-relaxed text-ink-soft">
            The reference settlement, settled on Monad testnet with real
            A-Pass-verified counterparties. No freeze-and-hope: the position
            closed in the same block as the credential event.
          </p>
        </div>

        <div data-settle-grid className="grid gap-px border hairline bg-line md:grid-cols-4">
          {SETTLEMENT_FACTS.map((f) => (
            <div key={f.label} data-settle-card="" className="bg-paper px-6 py-8">
              <p className="display text-4xl md:text-[2.6rem]">{f.value}</p>
              <p className="mono-label mt-4 text-ink-soft">{f.label}</p>
              <p className="mt-1 text-sm text-ink-soft">{f.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="mono-label text-ink-soft">Monad testnet · chain 10143</p>
          <a
            href={MONADSCAN_DESK}
            className="mono-label underline decoration-line underline-offset-4 transition-colors hover:text-ink-soft focus-ring"
          >
            RepoDesk 0x398D45F5...7edA on MonadScan
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------ comparison */

const COMPARE_ROWS = [
  {
    aspect: "Counterparty",
    naive: "Anonymous wallet",
    pignora: "Cleanverse A-Pass verified, tier read on-chain",
  },
  {
    aspect: "Lending cap",
    naive: "Fixed over-collateralization for everyone",
    pignora: "Priced by identity tier: 2% to 10% haircut",
  },
  {
    aspect: "Identity changes mid-term",
    naive: "Discretionary, slow, off-chain",
    pignora: "On-chain gate flips, margin call fires automatically",
  },
  {
    aspect: "Settlement",
    naive: "Freeze and hope",
    pignora: "Compliant closeout, fail-closed escrow",
  },
  {
    aspect: "Audit",
    naive: "Backend logs you cannot verify",
    pignora: "Append-only pack with a real PDF artifact",
  },
];

function Comparison({ reduced }: { reduced: boolean }) {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        gsap.from("[data-compare-head]", {
          opacity: 0,
          y: 40,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-compare-head]", start: "top 82%" },
        });
        gsap.from("[data-compare-row]", {
          opacity: 0,
          x: -24,
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.08,
          scrollTrigger: { trigger: "[data-compare-table]", start: "top 80%" },
        });
      }, rootRef);
      return () => ctx.revert();
    },
    { scope: rootRef, dependencies: [reduced] },
  );

  return (
    <section ref={rootRef} id="compare" className="mx-auto max-w-6xl px-6 py-24 md:py-36">
      <div data-compare-head className="mb-14 grid gap-6 md:grid-cols-[1fr_1fr] md:items-end">
        <h2 className="display text-[clamp(2rem,4.5vw,3.4rem)]">
          Repo, versus<br />lending without identity.
        </h2>
        <p className="max-w-sm text-[15px] leading-relaxed text-ink-soft">
          DeFi lending works around identity. Pignora makes identity the
          contract itself.
        </p>
      </div>

      <div data-compare-table className="border hairline">
        <div className="grid grid-cols-[0.9fr_1fr_1.2fr] border-b hairline bg-paper-deep/70 px-6 py-4">
          <p className="mono-label text-ink-soft">What</p>
          <p className="mono-label text-ink-soft">DeFi lending today</p>
          <p className="mono-label text-ink-soft">Pignora</p>
        </div>
        {COMPARE_ROWS.map((row) => (
          <div
            key={row.aspect}
            data-compare-row=""
            className="grid grid-cols-[0.9fr_1fr_1.2fr] border-b hairline px-6 py-6 last:border-b-0"
          >
            <p className="mono-label pt-1 text-ink-soft">{row.aspect}</p>
            <p className="pr-6 text-sm leading-relaxed text-ink-soft">{row.naive}</p>
            <p className="text-sm leading-relaxed text-ink">{row.pignora}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ footer */

function Footer() {
  return (
    <footer className="border-t hairline">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="display text-2xl">Pignora</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
              A compliant repo rail for tokenized assets on Monad. Cleanverse
              Build: Trusted Assets · Track 1 (RWA).
            </p>
          </div>
          <div>
            <p className="mono-label mb-4 text-ink-soft">Product</p>
            <ul className="space-y-2.5 text-sm">
              <li><a href={DESK_URL} className="focus-ring hover:underline">Live desk</a></li>
              <li><a href="#mechanism" className="focus-ring hover:underline">Mechanism</a></li>
              <li><a href="#policy" className="focus-ring hover:underline">Policy</a></li>
              <li><a href="#verify" className="focus-ring hover:underline">Verify</a></li>
            </ul>
          </div>
          <div>
            <p className="mono-label mb-4 text-ink-soft">On-chain</p>
            <ul className="space-y-2.5 text-sm">
              <li><a href={MONADSCAN_DESK} className="focus-ring hover:underline">RepoDesk on MonadScan</a></li>
              <li>
                <a
                  href={`https://testnet.monadscan.xyz/address/${REGISTRY}`}
                  className="focus-ring hover:underline"
                >
                  IdentityRegistry on MonadScan
                </a>
              </li>
              <li><a href={GITHUB_URL} className="focus-ring hover:underline">Source on GitHub</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t hairline pt-6 md:flex-row md:items-center md:justify-between">
          <p className="mono-label text-ink-soft">Monad testnet · chain 10143</p>
          <p className="mono-label text-ink-soft">Built for Cleanverse Build</p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------- app */

export default function App() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        gsap.from("[data-reveal]", {
          opacity: 0,
          y: 32,
          duration: 0.9,
          ease: "power2.out",
          scrollTrigger: { trigger: "[data-reveal]", start: "top 85%" },
        });
      }, rootRef);
      return () => ctx.revert();
    },
    { scope: rootRef, dependencies: [reduced] },
  );

  return (
    <div ref={rootRef} className="min-h-screen overflow-x-hidden">
      <a href="#top" className="skip-to-content">Skip to content</a>
      <Nav />
      <main>
        <Hero reduced={reduced} />
        <Marquee />
        <Mechanism reduced={reduced} />
        <Policy reduced={reduced} />
        <Settlement reduced={reduced} />
        <Comparison reduced={reduced} />
        <Verify reduced={reduced} />
      </main>
      <Footer />
    </div>
  );
}
