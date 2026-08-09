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

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-to-content">Skip to content</a>

      {/* nav */}
      <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6" aria-label="Main">
          <a href="#top" className="text-[15px] font-semibold tracking-tight focus-ring">
            Pignora
          </a>
          <div className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#mechanism" className="transition-colors hover:text-ink focus-ring">Mechanism</a>
            <a href="#policy" className="transition-colors hover:text-ink focus-ring">Policy</a>
            <a href="#verify" className="transition-colors hover:text-ink focus-ring">Verify</a>
            <a href={GITHUB_URL} className="transition-colors hover:text-ink focus-ring">Source</a>
          </div>
          <a
            href={DESK_URL}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent focus-ring"
          >
            Open the desk
          </a>
        </nav>
      </header>

      <main id="main">
        {/* hero */}
        <section id="top" className="mx-auto max-w-5xl px-6 pb-20 pt-20 md:pt-28">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${health?.mode === "sandbox" ? "bg-accent" : "bg-muted"}`}
              aria-hidden="true"
            />
            <p className="mono-label text-muted">
              {health ? `${health.chain} testnet · ${health.mode} mode` : "checking live API"}
            </p>
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
            A compliant repo rail for tokenized assets on Monad.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            Pignora prices the lending cap by Cleanverse A-Pass identity tier
            and closes out automatically when a credential event hits mid-term.
            Settlement in aUSDC, Travel Rule attribution on every leg, audit
            pack with a real PDF.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href={DESK_URL}
              className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent focus-ring"
            >
              Open the desk
            </a>
            <a
              href="#verify"
              className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface focus-ring"
            >
              Verify live state
            </a>
          </div>
          <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-8 text-sm sm:grid-cols-4">
            {[
              ["Chain", "Monad testnet"],
              ["Identity", "Cleanverse CVI"],
              ["Cash leg", "aUSDC"],
              ["Margin", "105%"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="mono-label text-muted">{k}</dt>
                <dd className="mt-1 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* mechanism */}
        <section id="mechanism" className="border-y border-line bg-surface">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-2xl font-semibold tracking-tight">Mechanism</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Four moves from verification to closeout. Identity is the
              pricing engine and the enforcement trigger, not a gate.
            </p>
            <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
              {[
                {
                  n: "01",
                  title: "Verify",
                  body: "Cleanverse A-Pass check on both counterparties before a repo can open. Unverified wallets cannot borrow.",
                },
                {
                  n: "02",
                  title: "Price",
                  body: "The tier sets the lending cap: tier 50+ at 2%, tier 20+ at 5%, the rest at 10%. The same bond, different terms.",
                },
                {
                  n: "03",
                  title: "Escrow",
                  body: "Collateral and the aUSDC cash leg lock in the RepoDesk until repayment, holding a 105% margin on-chain.",
                },
                {
                  n: "04",
                  title: "Close",
                  body: "A freeze, revocation, or expiry mid-term flips the gate and settles the repo: lender covered, excess fail-closed to escrow.",
                },
              ].map((s) => (
                <li key={s.n} className="bg-white p-6">
                  <span className="mono-label text-muted">{s.n}</span>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* policy */}
        <section id="policy" className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-tight">Policy</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            The lending cap is a function of the counterparty A-Pass tier,
            enforced on-chain in the IdentityRegistry.
          </p>
          <div className="mt-10 overflow-hidden rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface">
                <tr>
                  <th className="px-5 py-3 font-medium">A-Pass tier</th>
                  <th className="px-5 py-3 font-medium">Verification depth</th>
                  <th className="px-5 py-3 font-medium">Lending cap</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Enforced by</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tier: "Tier 50+", depth: "Deep verification", bucket: "3", fallback: "2% cap" },
                  { tier: "Tier 20+", depth: "Standard verification", bucket: "2", fallback: "5% cap" },
                  { tier: "Basic", depth: "Minimal verification", bucket: "1", fallback: "10% cap" },
                ].map((r) => {
                  const live = haircuts?.[r.bucket];
                  return (
                    <tr key={r.tier} className="border-b border-line last:border-b-0">
                      <td className="px-5 py-4 font-medium">{r.tier}</td>
                      <td className="px-5 py-4 text-muted">{r.depth}</td>
                      <td className="px-5 py-4">
                        <span className="font-medium">
                          {live ? `haircut ${live}` : r.fallback}
                        </span>
                        <span className="ml-2 mono-label text-muted">
                          {live ? "live from /policy" : "contract default"}
                        </span>
                      </td>
                      <td className="hidden px-5 py-4 text-muted sm:table-cell">IdentityRegistry</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mono-label mt-4 text-muted">
            Maintenance margin 105% · enforced on-chain
          </p>
        </section>

        {/* verify */}
        <section id="verify" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-2xl font-semibold tracking-tight">Verify</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              The desk talks to a live API. This is the real response from the
              deployed backend, not a screenshot.
            </p>
            <div className="mt-10 overflow-hidden rounded-lg border border-line bg-[#0a0a0a] text-[#f5f5f5]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <div className="flex items-center gap-2" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#b4472c]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                </div>
                <p className="mono-label text-white/50">pignora api · live</p>
              </div>
              <pre className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed text-white/90">
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
            <p className="mt-4 text-sm text-muted">
              Contracts deployed on Monad testnet.{" "}
              <a
                href={`https://testnet.monadscan.xyz/address/${REPO_DESK}`}
                className="font-medium text-ink underline decoration-line underline-offset-4 hover:text-accent focus-ring"
              >
                RepoDesk on MonadScan
              </a>{" "}
              ·{" "}
              <a
                href={`https://testnet.monadscan.xyz/address/${REGISTRY}`}
                className="font-medium text-ink underline decoration-line underline-offset-4 hover:text-accent focus-ring"
              >
                IdentityRegistry on MonadScan
              </a>
            </p>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <p className="mono-label text-muted">Pignora · Cleanverse Build · Trusted Assets</p>
          <div className="flex flex-wrap gap-6 text-sm text-muted">
            <a href={DESK_URL} className="hover:text-ink focus-ring">Desk</a>
            <a href={GITHUB_URL} className="hover:text-ink focus-ring">Source</a>
            <a href="#top" className="hover:text-ink focus-ring">Top</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
