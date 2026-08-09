"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const GITHUB_URL = "https://github.com/subheeksh5599/pignora";
const DESK_URL = "/dashboard";

type Health = {
  ok: boolean;
  mode: string;
  chain: string;
  monad: { chainId: number; rpc: string };
  contracts: { repoDesk: string | null; registry: string | null };
  cleanverse: string;
};

function useHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .health()
      .then((h) => setHealth(h as Health))
      .catch((e) => setError((e as Error).message));
  }, []);
  return { health, error };
}

function usePolicy() {
  const [policy, setPolicy] = useState<{ haircuts: Record<string, string>; maintenanceMarginBps: number } | null>(null);
  useEffect(() => {
    api
      .policy()
      .then(setPolicy)
      .catch(() => {});
  }, []);
  return policy;
}

export default function App() {
  const { health, error } = useHealth();
  const policy = usePolicy();
  const [activeStep, setActiveStep] = useState(0);

  // Auto-advance the mechanism pipeline once it scrolls into view; pause
  // off-screen and respect reduced motion.
  const mechanismRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = mechanismRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setActiveStep(3);
      return;
    }
    let timer: ReturnType<typeof setInterval> | null = null;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          started = true;
          timer = setInterval(() => setActiveStep((s) => (s < 3 ? s + 1 : 3)), 1400);
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearInterval(timer);
    };
  }, []);

  const marginPct = policy ? (policy.maintenanceMarginBps / 100).toFixed(0) : null;
  const deepCap = policy?.haircuts?.["3"] ?? null;

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-to-content">
        Skip to content
      </a>

      {/* nav */}
      <header className="sticky top-0 z-50 border-b border-line bg-bone/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6" aria-label="Main">
          <a href="#top" className="font-display text-2xl font-bold uppercase tracking-tight focus-ring">
            Pignora
          </a>
          <div className="hidden items-center gap-8 text-xs text-muted md:flex">
            <a href="#mechanism" className="uppercase tracking-widest transition-colors hover:text-ink focus-ring">
              Mechanism
            </a>
            <a href="#policy" className="uppercase tracking-widest transition-colors hover:text-ink focus-ring">
              Policy
            </a>
            <a href="#proof" className="uppercase tracking-widest transition-colors hover:text-ink focus-ring">
              Proof
            </a>
            <a href={GITHUB_URL} className="uppercase tracking-widest transition-colors hover:text-ink focus-ring">
              Source
            </a>
          </div>
          <a
            href={DESK_URL}
            className="bg-signal px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink transition-transform hover:-translate-y-0.5 focus-ring"
          >
            Open the desk
          </a>
        </nav>
      </header>

      <main id="main">
        {/* hero */}
        <section id="top" className="mx-auto max-w-6xl px-6 pt-14 md:pt-20">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 bg-signal px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-hidden="true" />
              {health ? `${health.chain} testnet · ${health.mode}` : "checking live api"}
            </span>
            <span className="mono-label text-muted">Cleanverse Build · Trusted Assets</span>
          </div>

          <h1 className="mt-8 max-w-4xl font-display text-[clamp(3rem,9vw,7.5rem)] font-bold uppercase leading-[0.9] tracking-tight">
            The repo desk that closes out{" "}
            <span className="serif-it lowercase text-muted">when trust does</span>
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
            Pignora is a compliant repo rail for tokenized assets on Monad.
            Your Cleanverse A-Pass tier prices the lending cap, and a
            credential event mid-term triggers a defined, on-chain closeout.
            No freeze-and-hope.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={DESK_URL}
              className="bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-widest text-signal transition-transform hover:-translate-y-0.5 focus-ring"
            >
              Open the desk
            </a>
            <a
              href="#proof"
              className="border border-ink px-6 py-3 text-xs font-semibold uppercase tracking-widest transition-colors hover:bg-ink hover:text-signal focus-ring"
            >
              Verify live state
            </a>
          </div>
        </section>

        {/* stat band */}
        <section className="mt-16 border-y-2 border-ink bg-ink text-bone">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x-2 divide-bone/15 md:grid-cols-4">
            {[
              ["Identity rail", "CVI"],
              ["Cash leg", "aUSDC"],
              ["Margin", marginPct ? `${marginPct}%` : "105%"],
              ["Deep cap", deepCap ? deepCap : "tier-priced"],
            ].map(([k, v]) => (
              <div key={k} className="px-6 py-6">
                <p className="mono-label text-bone/50">{k}</p>
                <p className="mt-1 font-display text-3xl font-bold uppercase tracking-tight">{v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* mechanism */}
        <section id="mechanism" ref={mechanismRef} className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight md:text-6xl">
              Four moves,<br />
              <span className="serif-it lowercase text-muted">one rail</span>
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Identity is the pricing engine and the enforcement trigger, not
              a gate. The same bond, different terms, because of who you are
              verified to be.
            </p>
          </div>

          {/* mechanism: animated pipeline */}
          <div className="mt-12 border-2 border-ink bg-ink p-1.5">
            <div className="bg-bone p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="mono-label text-muted">Credential event</span>
                <span className="mono-label text-muted">Mid-term</span>
                <span className="mono-label text-muted">On-chain settlement</span>
              </div>
              <div className="mt-6">
                <div className="grid grid-cols-4 gap-1 md:gap-2">
                  {[
                    { label: "Verify", sub: "A-Pass gate" },
                    { label: "Price", sub: "tier cap" },
                    { label: "Escrow", sub: "both legs" },
                    { label: "Close", sub: "fail-closed" },
                  ].map((s, i) => (
                    <div key={s.label} className={`step-cell ${i === activeStep ? "step-on" : ""} ${i < activeStep ? "step-done" : ""}`}>
                      <span className="font-display text-xs font-bold uppercase tracking-widest text-ink/40">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-1 block font-display text-lg font-bold uppercase leading-none tracking-tight md:text-2xl">
                        {s.label}
                      </span>
                      <span className="mono-label mt-1 hidden text-muted md:block">{s.sub}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 h-2 bg-ink/10">
                  <div className="h-full bg-signal transition-all duration-700 ease-out" style={{ width: `${(activeStep + 1) * 25}%` }} />
                </div>
                <p className="mono-label mt-3 text-muted">
                  {activeStep < 3
                    ? `Step ${activeStep + 1} of 4: ${["identity gate", "tier-priced cap", "escrow both legs", "closeout on the event"][activeStep]}`
                    : "Closeout: lender covered, excess fail-closed to escrow until identity restores"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* policy: terminal table */}
        <section id="policy" className="border-y-2 border-ink bg-pitch text-bone">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="font-display text-4xl font-bold uppercase tracking-tight md:text-6xl">
                More verification,<br />
                <span className="serif-it lowercase text-signal">thinner haircut</span>
              </h2>
              <p className="max-w-sm text-sm leading-relaxed text-bone/60">
                The lending cap is a function of the counterparty A-Pass tier,
                enforced on-chain in the IdentityRegistry.
              </p>
            </div>

            <div className="mt-12 overflow-hidden border border-bone/25">
              <div className="grid grid-cols-2 border-b border-bone/25 bg-bone/5 px-5 py-3 md:grid-cols-4">
                <span className="mono-label text-bone/50">A-Pass tier</span>
                <span className="mono-label hidden text-bone/50 md:block">Verification</span>
                <span className="mono-label text-bone/50">Lending cap</span>
                <span className="mono-label hidden text-right text-bone/50 md:block">Enforced by</span>
              </div>
              {[
                { tier: "TIER 50+", depth: "Deep verification", bucket: "3", fallback: "2% cap" },
                { tier: "TIER 20+", depth: "Standard verification", bucket: "2", fallback: "5% cap" },
                { tier: "BASIC", depth: "Minimal verification", bucket: "1", fallback: "10% cap" },
              ].map((r) => {
                const liveVal = policy?.haircuts?.[r.bucket];
                return (
                  <div key={r.tier} className="grid grid-cols-2 border-b border-bone/25 px-5 py-5 last:border-b-0 md:grid-cols-4">
                    <span className="font-display text-xl font-bold uppercase tracking-tight">{r.tier}</span>
                    <span className="hidden text-xs text-bone/60 md:block">{r.depth}</span>
                    <span className="text-xs text-bone/60">
                      {liveVal ? `haircut ${liveVal}` : r.fallback}
                    </span>
                    <span className="mono-label hidden text-right text-bone/50 md:block">
                      {liveVal ? "live /policy" : "on-chain"}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mono-label mt-4 text-bone/40">
              Maintenance margin {marginPct ? `${marginPct}%` : "105%"} · enforced on-chain
            </p>
          </div>
        </section>

        {/* closeout band */}
        <section className="bg-danger text-ink">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="grid max-w-6xl grid-cols-2 gap-px bg-ink/15 md:grid-cols-4">
              {[
                ["Obligation covered", "98.49%"],
                ["Excess fail-closed", "15.1e9"],
                ["Closeout reason", "borrower_2"],
                ["Settlement", "defined"],
              ].map(([k, v]) => (
                <div key={k} className="px-6 py-8">
                  <p className="mono-label text-ink/70">{k}</p>
                  <p className="mt-1 font-display text-3xl font-bold uppercase tracking-tight">{v}</p>
                </div>
              ))}
            </div>
            <p className="mono-label mt-4 text-ink/70">
              The reference settlement, settled on Monad testnet with real
              A-Pass-verified parties. Closeout tx{" "}
              <a
                href="https://testnet.monadscan.xyz/tx/0x10241e21e819c65878db6f03e4f21d5f93d848ae941dafc147cd0ff5cabe59ae"
                className="font-semibold underline decoration-2 underline-offset-4 focus-ring"
              >
                0x10241e21…59ae
              </a>
            </p>
          </div>
        </section>

        {/* proof: live terminal */}
        <section id="proof" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <h2 className="font-display text-4xl font-bold uppercase tracking-tight md:text-6xl">
            Verify it<br />
            <span className="serif-it lowercase text-muted">yourself</span>
          </h2>

          <div className="mt-10 border-2 border-ink bg-ink p-5 text-bone md:p-7">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 mono-label text-bone/60">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden="true" />
                live /health
              </span>
              {error && <span className="mono-label text-danger">backend unreachable</span>}
            </div>
            <pre className="mt-4 overflow-x-auto font-mono text-xs leading-relaxed text-bone/80">
              {health ? JSON.stringify(health, null, 2) : "fetching…"}
            </pre>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`https://testnet.monadscan.xyz/address/${health?.contracts.repoDesk ?? ""}`}
              className="bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-signal transition-transform hover:-translate-y-0.5 focus-ring"
            >
              RepoDesk on MonadScan
            </a>
            <a
              href={`https://testnet.monadscan.xyz/address/${health?.contracts.registry ?? ""}`}
              className="border border-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors hover:bg-ink hover:text-signal focus-ring"
            >
              IdentityRegistry on MonadScan
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <span className="mono-label text-muted">
            Pignora · Cleanverse Build · Trusted Assets
          </span>
          <div className="flex gap-6 text-xs">
            <a href={DESK_URL} className="uppercase tracking-widest transition-colors hover:text-ink focus-ring">
              Desk
            </a>
            <a href={GITHUB_URL} className="uppercase tracking-widest transition-colors hover:text-ink focus-ring">
              Source
            </a>
            <a href="#top" className="uppercase tracking-widest transition-colors hover:text-ink focus-ring">
              Top
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
