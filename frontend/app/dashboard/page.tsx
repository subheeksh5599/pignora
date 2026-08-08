"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type AuditEvent, type Identity, type Repo } from "@/lib/api";

const TIER3 = "0x1111111111111111111111111111111111111111";
const TIER2 = "0x2222222222222222222222222222222222222222";
const ANON = "0x9999999999999999999999999999999999999999";

function fmt(amount: string): string {
  return (Number(amount) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "OPEN"
      ? "bg-emerald-100 text-emerald-800"
      : status === "CLOSED_OUT"
        ? "bg-rose-100 text-rose-800"
        : "bg-neutral-100 text-neutral-700";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{status}</span>;
}

export default function DashboardPage() {
  const [mode, setMode] = useState<string>("…");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [audit, setAudit] = useState<{ events: AuditEvent[]; travelRule: { artifact: string; note?: string } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // open-repo form
  const [borrower, setBorrower] = useState(TIER3);
  const [lender, setLender] = useState(TIER2);
  const [collateral, setCollateral] = useState("1000000000000");
  const [cash, setCash] = useState("950000000000"); // real tier-20 cap: 95%
  const [feeBps, setFeeBps] = useState("50");
  const [termDays, setTermDays] = useState("7");

  const refresh = useCallback(async () => {
    try {
      const [h, r] = await Promise.all([api.health(), api.repos()]);
      setMode(h.mode);
      setRepos(r.repos);
      setError(null);
    } catch (e) {
      setError(`backend unreachable: ${(e as Error).message}`);
    }
  }, []);

  // auto-verify the default counterparty on load (real sandbox identity)
  useEffect(() => {
    refresh();
    api
      .identity(TIER3)
      .then((id) => setIdentity(id))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  async function checkIdentity() {
    setBusy("identity");
    setError(null);
    try {
      const id = await api.identity(borrower);
      setIdentity(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function openRepo() {
    setBusy("open");
    setError(null);
    try {
      await api.openRepo({
        borrower,
        lender,
        collateralToken: "BOND",
        cashToken: "aUSDC",
        collateralAmount: collateral,
        cashAmount: cash,
        feeBps: Number(feeBps),
        termDays: Number(termDays),
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function revokeBorrower() {
    setBusy("revoke");
    setError(null);
    try {
      // sandbox: FROZEN maps to the REAL Cleanverse update_status credential event
      await api.setStatus(borrower, "FROZEN", 3);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function closeout(id: number) {
    setBusy(`closeout-${id}`);
    setError(null);
    try {
      await api.closeout(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function showAudit(id: number) {
    setBusy(`audit-${id}`);
    setError(null);
    try {
      setAudit(await api.audit(id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // Deep-linkable audit view: /dashboard?audit=<repoId> opens the pack on load.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("audit");
    if (id) showAudit(Number(id));
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-white/80 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Pignora</h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              Compliant RWA repo rail — lending caps priced by verified identity, automatic closeout on credential events
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
              Cleanverse {mode === "sandbox" ? "sandbox" : "mock"} mode
            </span>
            <button
              onClick={refresh}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
        )}

        <section className="rounded-xl border border-[var(--border)] bg-white p-6">
          <h2 className="text-sm font-semibold">1 · Counterparty identity (CVI)</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            A-Pass gate: verified identity, tier, and the lending cap it sets. Unverified wallets are rejected by the rail.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex-1 text-xs">
              <span className="mb-1 block font-medium text-neutral-600">Borrower wallet</span>
              <input
                value={borrower}
                onChange={(e) => setBorrower(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-xs"
              />
            </label>
            <button
              onClick={checkIdentity}
              disabled={busy !== null}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              Verify
            </button>
          </div>
          {identity && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-neutral-50 p-3 text-xs sm:grid-cols-5">
              <div>
                <div className="text-neutral-500">Status</div>
                <div className="font-medium">{identity.status}</div>
              </div>
              <div>
                <div className="text-neutral-500">Tier</div>
                <div className="font-medium">{identity.tier}</div>
              </div>
              <div>
                <div className="text-neutral-500">Verified</div>
                <div className="font-medium">{identity.verified ? "yes" : "no"}</div>
              </div>
              <div>
                <div className="text-neutral-500">Lending cap</div>
                <div className="font-medium">{(identity.haircutBps / 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-neutral-500">CV record</div>
                <div className="truncate font-mono">{identity.cvRecordId}</div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-6">
          <h2 className="text-sm font-semibold">2 · Open a repo</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            The cash leg is capped by the borrower&apos;s tier lending cap: tier 3 = 2%, tier 2 = 5%, tier 1 = 10%. Settlement
            is in aUSDC; every leg is Travel Rule-attributed.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-xs">
              <span className="mb-1 block font-medium text-neutral-600">Borrower</span>
              <select value={borrower} onChange={(e) => setBorrower(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-xs">
                <option value={TIER3}>sandbox fixture 0x1111… (tier 20)</option>
                <option value={TIER2}>sandbox fixture 0x2222… (tier 20)</option>
                <option value={ANON}>no A-Pass (must fail)</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-medium text-neutral-600">Lender</span>
              <select value={lender} onChange={(e) => setLender(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-xs">
                <option value={TIER2}>sandbox fixture 0x2222… (tier 20)</option>
                <option value={TIER3}>sandbox fixture 0x1111… (tier 20)</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-medium text-neutral-600">Term (days)</span>
              <input value={termDays} onChange={(e) => setTermDays(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-xs" />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-medium text-neutral-600">Collateral (BOND, units)</span>
              <input value={collateral} onChange={(e) => setCollateral(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-xs" />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-medium text-neutral-600">Cash (aUSDC, micro-units)</span>
              <input value={cash} onChange={(e) => setCash(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-xs" />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-medium text-neutral-600">Fee (bps)</span>
              <input value={feeBps} onChange={(e) => setFeeBps(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 font-mono text-xs" />
            </label>
          </div>
          <button
            onClick={openRepo}
            disabled={busy !== null}
            className="mt-4 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === "open" ? "Opening…" : "Open repo"}
          </button>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">3 · Positions</h2>
            <button
              onClick={revokeBorrower}
              disabled={busy !== null}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              Simulate credential freeze (borrower)
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Freezing the borrower&apos;s A-Pass mid-term is the credential event — in sandbox mode it calls the real
            Cleanverse update_status endpoint and flips the on-chain gate, which triggers the rail&apos;s closeout.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-neutral-500">
                  <th className="py-2 pr-3 font-medium">Repo</th>
                  <th className="py-2 pr-3 font-medium">Borrower</th>
                  <th className="py-2 pr-3 font-medium">Lender</th>
                  <th className="py-2 pr-3 font-medium">Collateral</th>
                  <th className="py-2 pr-3 font-medium">Cash</th>
                  <th className="py-2 pr-3 font-medium">Lending cap</th>
                  <th className="py-2 pr-3 font-medium">Fee</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {repos.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-neutral-400">
                      No repos yet — open one above.
                    </td>
                  </tr>
                )}
                {repos.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-3 font-mono">#{r.id}</td>
                    <td className="max-w-[9rem] truncate py-2 pr-3 font-mono">{r.borrower.slice(0, 10)}…</td>
                    <td className="max-w-[9rem] truncate py-2 pr-3 font-mono">{r.lender.slice(0, 10)}…</td>
                    <td className="py-2 pr-3 font-mono">{fmt(r.collateralAmount)}</td>
                    <td className="py-2 pr-3 font-mono">{fmt(r.cashAmount)}</td>
                    <td className="py-2 pr-3">{(r.haircutBps / 100).toFixed(1)}%</td>
                    <td className="py-2 pr-3 font-mono">{r.feeBps} bps</td>
                    <td className="py-2 pr-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="py-2 pr-3">
                      {r.status === "OPEN" && (
                        <button
                          onClick={() => closeout(r.id)}
                          disabled={busy !== null}
                          className="rounded-md border border-[var(--border)] px-2 py-1 font-medium hover:bg-neutral-50 disabled:opacity-50"
                        >
                          Closeout
                        </button>
                      )}
                      <button
                        onClick={() => showAudit(r.id)}
                        disabled={busy !== null}
                        className="ml-2 rounded-md border border-[var(--border)] px-2 py-1 font-medium hover:bg-neutral-50 disabled:opacity-50"
                      >
                        Audit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {audit && (
            <div className="mt-4 rounded-lg bg-neutral-50 p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Audit pack — repo #{audit.travelRule ? "" : ""}events</span>
                <span className="font-mono text-neutral-500">{audit.travelRule.artifact}</span>
              </div>
              <ul className="mt-2 space-y-1 font-mono">
                {audit.events.map((e, i) => (
                  <li key={i} className="text-neutral-600">
                    {e.ts} — {e.type}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <footer className="pb-6 text-center text-[11px] text-neutral-400">
          Pignora — Cleanverse Build: Trusted Assets. Sandbox mode: Cleanverse testnet identities and test funds only; no real assets.
        </footer>
      </div>
    </main>
  );
}
