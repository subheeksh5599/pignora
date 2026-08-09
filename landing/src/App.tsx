import { useEffect, useState } from "react";
import { api, type Health } from "./lib/api";

const DESK_URL = "https://pignora-desk.vercel.app";
const GITHUB_URL = "https://github.com/subheeksh5599/pignora";
const REPO_DESK = "0x398D45F56F759Cd4b4cf0be07C2C4AADf7327edA";
const REGISTRY = "0xdcb889940B95FF9625d76a735DaCdFEB979aD4C2";

function useHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e) => setError((e as Error).message));
  }, []);
  return { health, error };
}

function usePolicy() {
  const [haircuts, setHaircuts] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    api
      .policy()
      .then((p) => setHaircuts(p.haircuts))
      .catch(() => {});
  }, []);
  return haircuts;
}

export default function App() {
  const { health, error } = useHealth();
  const haircuts = usePolicy();

  const live = health?.mode === "sandbox";

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-to-content">Skip to content</a>

      {/* nav */}
      <header className="sticky top-0 z-50 border-b border-line bg-bone/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6" aria-label="Main">
          <a href="#top" className="font-display text-2xl font-bold uppercase tracking-tight focus-ring">
            Pignora
          </a>
          <div className="hidden items-center gap-8 text-xs text-muted md:flex">
            <a href="#mechanism" className="uppercase tracking-widest transition-colors hover:text-ink focus-ring">Mechanism</a>
            <a href="#policy" className="uppercase tracking-widest transition-colors hover:text-ink focus-ring">Policy</a>
            <a href="#proof" className="uppercase tracking-widest transition-colors hover:text-ink focus-ring">Proof</a>
            <a href={GITHUB_URL} className="uppercase tracking-widest transition-colors hover:text-ink focus-ring">Source</a>
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
        {/* hero with video */}
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

          {/* hero video: the real desk, in motion */}
          <div className="mt-12 border-2 border-ink bg-ink">
            <video
              className="aspect-video w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              poster="/video/hero-poster.jpg"
              aria-label="The Pignora desk: identity gate, repo open, credential freeze, closeout"
            >
              <source src="/video/hero.mp4" type="video/mp4" />
            </video>
            <div className="flex items-center justify-between border-t-2 border-ink bg-signal px-4 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest">The desk, live</span>
              <span className="text-[11px] font-semibold uppercase tracking-widest">Monad testnet · sandbox</span>
            </div>
          </div>
        </section>

        {/* stat band */}
        <section className="mt-16 border-y-2 border-ink bg-ink text-bone">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x-2 divide-bone/15 md:grid-cols-4">
            {[
              ["Identity rail", "CVI"],
              ["Cash leg", "aUSDC"],
              ["Margin", "105%"],
              ["Cap", live ? "2%" : "tier-priced"],
            ].map(([k, v]) => (
              <div key={k} className="px-6 py-6">
                <p className="mono-label text-bone/50">{k}</p>
                <p className="mt-1 font-display text-3xl font-bold uppercase tracking-tight text-signal">
                  {v}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* mechanism */}
        <section id="mechanism" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
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

          <ol className="mt-14 grid gap-px border-2 border-ink bg-ink md:grid-cols-4">
            {[
              {
                n: "01",
                title: "Verify",
                body: "Cleanverse A-Pass check on both counterparties before a repo can open. Unverified wallets cannot borrow.",
              },
              {
                n: "02",
                title: "Price",
                body: "The tier sets the lending cap: tier 50+ at 2%, tier 20+ at 5%, the rest at 10%.",
              },
              {
                n: "03",
                title: "Escrow",
                body: "Collateral and the aUSDC cash leg lock in the RepoDesk until repayment, 105% margin on-chain.",
              },
              {
                n: "04",
                title: "Close",
                body: "A freeze, revocation, or expiry mid-term flips the gate and settles the repo in defined numbers.",
              },
            ].map((s) => (
              <li key={s.n} className="bg-bone p-6">
                <span className="font-display text-5xl font-bold uppercase text-ink/20">{s.n}</span>
                <h3 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight">{s.title}</h3>
                <p className="mt-3 text-xs leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
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
                const liveVal = haircuts?.[r.bucket];
                return (
                  <div key={r.tier} className="grid grid-cols-2 border-b border-bone/25 px-5 py-5 last:border-b-0 md:grid-cols-4">
                    <span className="font-display text-xl font-bold uppercase tracking-tight">{r.tier}</span>
                    <span className="hidden text-xs text-bone/50 md:block">{r.depth}</span>
                    <span className="font-display text-xl font-bold uppercase tracking-tight text-signal">
                      {liveVal ? `haircut ${liveVal}` : r.fallback}
                    </span>
                    <span className="mono-label hidden text-right text-bone/50 md:block">
                      {liveVal ? "live /policy" : "on-chain"}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mono-label mt-4 text-bone/40">Maintenance margin 105% · enforced on-chain</p>
          </div>
        </section>

        {/* closeout band */}
        <section className="bg-danger text-ink">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-ink/15 md:grid-cols-4">
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
        </section>

        {/* proof: live terminal */}
        <section id="proof" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <h2 className="font-display text-4xl font-bold uppercase tracking-tight md:text-6xl">
            Verify it<br />
            <span className="serif-it lowercase text-muted">yourself</span>
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            The desk talks to a live API. This is the real response from the
            deployed backend, not a screenshot.
          </p>

          <div className="mt-10 border-2 border-ink bg-ink text-bone">
            <div className="flex items-center justify-between border-b border-bone/15 px-5 py-3">
              <div className="flex items-center gap-2" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                <span className="h-2.5 w-2.5 rounded-full bg-signal" />
                <span className="h-2.5 w-2.5 rounded-full bg-bone/30" />
              </div>
              <p className="mono-label text-bone/50">pignora api · live</p>
            </div>
            <pre className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed text-bone/90">
{`$ curl -s ${api.base}/health`}
{health
  ? `{
  "ok": ${health.ok},
  "mode": "${health.mode}",
  "chain": "${health.chain}",
  "monad": { "chainId": ${health.monad.chainId} },
  "contracts": {
    "repoDesk": "${health.contracts.repoDesk ?? REPO_DESK}",
    "registry": "${health.contracts.registry ?? REGISTRY}"
  },
  "cleanverse": "${health.cleanverse}"
}`
  : error
    ? `error: ${error}`
    : "fetching live state..."}
            </pre>
          </div>

          <p className="mt-5 text-xs text-muted">
            Contracts deployed on Monad testnet.{" "}
            <a
              href={`https://testnet.monadscan.xyz/address/${REPO_DESK}`}
              className="font-semibold uppercase tracking-wider underline decoration-2 underline-offset-4 hover:text-ink focus-ring"
            >
              RepoDesk on MonadScan
            </a>{" "}
            ·{" "}
            <a
              href={`https://testnet.monadscan.xyz/address/${REGISTRY}`}
              className="font-semibold uppercase tracking-wider underline decoration-2 underline-offset-4 hover:text-ink focus-ring"
            >
              IdentityRegistry on MonadScan
            </a>
          </p>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t-2 border-ink bg-ink text-bone">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <p className="mono-label text-bone/50">Pignora · Cleanverse Build · Trusted Assets</p>
          <div className="flex flex-wrap gap-6 text-[11px] uppercase tracking-widest text-bone/70">
            <a href={DESK_URL} className="hover:text-signal focus-ring">Desk</a>
            <a href={GITHUB_URL} className="hover:text-signal focus-ring">Source</a>
            <a href="#top" className="hover:text-signal focus-ring">Top</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
