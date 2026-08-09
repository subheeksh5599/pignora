"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type AuditEvent, type Identity, type Repo } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, RefreshCw, ShieldCheck, ShieldOff, Wallet } from "lucide-react";
import { ethers } from "ethers";
import { connectWallet, signTypedData, shortAddr } from "@/lib/wallet";
import { BOND_TOKEN, CASH_TOKEN, REPO_DESK, repoDeskWallet, erc20Wallet } from "@/lib/chain";

// Default parties come from env only (set on the deployed project). No
// hardcoded wallet addresses anywhere — if unset, the operator types or
// pastes any wallet; the identity panel verifies any address.
const BORROWER = process.env.NEXT_PUBLIC_DEFAULT_BORROWER || "";
const LENDER = process.env.NEXT_PUBLIC_DEFAULT_LENDER || "";

function fmt(amount: string): string {
  return (Number(amount) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function DashboardPage() {
  const [mode, setMode] = useState<string>("…");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [audit, setAudit] = useState<{
    repoId: number;
    events: AuditEvent[];
    travelRule: { artifact?: string; note?: string } | null;
    artifact: { name: string; path: string; note: string };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastEventTx, setLastEventTx] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [repoDeskAddr, setRepoDeskAddr] = useState<string | null>(null);

  // open-repo form
  const [borrower, setBorrower] = useState(BORROWER);
  const [lender, setLender] = useState(LENDER);
  const [collateral, setCollateral] = useState("1000000000000");
  const [cash, setCash] = useState("950000000000"); // real tier-20 cap: 95%
  const [feeBps, setFeeBps] = useState("50");
  const [termDays, setTermDays] = useState("7");

  const refresh = useCallback(async () => {
    try {
      const [h, r] = await Promise.all([api.health(), api.repos()]);
      setMode(h.mode);
      setRepos(r.repos);
      setChainId(h.monad?.chainId ?? null);
      setRepoDeskAddr(h.contracts?.repoDesk ?? null);
      setError(null);
    } catch (e) {
      setError(`backend unreachable: ${(e as Error).message}`);
    }
  }, []);

  // auto-verify the default counterparty on load (real sandbox identity)
  useEffect(() => {
    refresh();
    if (BORROWER) {
      api
        .identity(BORROWER)
        .then((id) => setIdentity(id))
        .catch(() => {});
    }
  }, [refresh]);

  async function checkIdentity() {
    setBusy("identity");
    setError(null);
    try {
      const id = await api.identity(borrower);
      setIdentity(id);
    } catch (e) {
      setError((e as Error).message);
      setIdentity(null);
    } finally {
      setBusy(null);
    }
  }

  async function closeoutFromWallet(repoId: number, repoOnchainId: number | undefined) {
    if (!operator) {
      setWalletError("Connect your wallet first — the closeout is executed from your wallet");
      return;
    }
    setBusy(`closeout-${repoId}`);
    setError(null);
    setWalletError(null);
    try {
      // executeCloseout is permissionless on RepoDesk ("anyone can execute"):
      // the connected wallet submits the real transaction itself.
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const desk = repoDeskWallet(signer);
      const tx = await desk.executeCloseout(BigInt(repoOnchainId ?? repoId));
      setLastEventTx(tx.hash);
      await refresh();
    } catch (e) {
      setError(`wallet closeout failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function openRepo() {
    if (!operator) {
      setWalletError("Connect your wallet first — you are the lender, the open is signed by your wallet");
      return;
    }
    setBusy("open");
    setError(null);
    setWalletError(null);
    try {
      // The connected wallet is the LENDER: it approves the RepoDesk to pull
      // its cash, then signs openRepo directly. Its own cash gets escrowed.
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const cashToken = erc20Wallet(CASH_TOKEN, signer);
      const allowance = await cashToken.allowance(operator, REPO_DESK);
      if (allowance < BigInt(cash)) {
        const approveTx = await cashToken.approve(REPO_DESK, ethers.MaxUint256);
        await approveTx.wait(); // MetaMask popup 1 — approve cash to the desk
      }
      const desk = repoDeskWallet(signer);
      const tx = await desk.openRepo( // MetaMask popup 2 — sign the open
        borrower,
        BOND_TOKEN,
        CASH_TOKEN,
        BigInt(collateral),
        BigInt(cash),
        BigInt(feeBps),
        BigInt(termDays) * 86400n,
        ethers.id(`tr-${Date.now()}-${borrower.slice(2, 10)}-${operator.slice(2, 10)}`)
      );
      setLastEventTx(tx.hash);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function connect() {
    setWalletError(null);
    try {
      const addr = await connectWallet();
      setOperator(addr);
      // fund the connected wallet (testnet demo: gas + cash + collateral) so
      // the wallet-signed open/closeout work with ANY wallet
      try {
        await api.fund(addr);
      } catch (e) {
        setWalletError(`wallet connected, but funding failed: ${(e as Error).message.slice(0, 80)}`);
      }
    } catch (e) {
      setWalletError((e as Error).message);
    }
  }

  // EIP-712 payload matching the backend's operator.js domain/types exactly.
  // chainId + verifyingContract come from the live /health endpoint — never
  // hardcoded.
  function credentialEventPayload(subject: string, status: number, tier: number, nonce: number, timestamp: number) {
    if (!chainId || !repoDeskAddr) throw new Error("chain info not loaded yet — refresh");
    return {
      domain: { name: "Pignora", version: "1", chainId, verifyingContract: repoDeskAddr },
      types: {
        CredentialEvent: [
          { name: "subject", type: "address" },
          { name: "status", type: "uint8" },
          { name: "tier", type: "uint8" },
          { name: "nonce", type: "uint256" },
          { name: "timestamp", type: "uint256" },
        ],
      },
      primaryType: "CredentialEvent",
      message: { subject, status, tier, nonce, timestamp },
    };
  }

  async function revokeBorrower() {
    if (!operator) {
      setWalletError("Connect your wallet first — credential events are signed by the operator");
      return;
    }
    setBusy("revoke");
    setError(null);
    setWalletError(null);
    try {
      // The credential event is EIP-712 signed by the operator wallet
      // (MetaMask), verified by the backend before execution.
      const statusCode = 2; // FROZEN
      const tierCode = Number(identity?.tier ?? 50);
      const ts = Math.floor(Date.now() / 1000);
      const payload = credentialEventPayload(borrower, statusCode, tierCode, ts, ts);
      const signature = await signTypedData(operator, payload);
      const res = await api.setStatus(borrower, "FROZEN", tierCode, { signature, nonce: ts, timestamp: ts });
      setLastEventTx(res.cleanverse?.data?.txHash ?? res.closedOutTx?.[0]?.txHash ?? null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function closeout(id: number, onchainId?: number) {
    await closeoutFromWallet(id, onchainId);
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

  const openRepos = repos.filter((r) => r.status === "OPEN").length;
  const closedRepos = repos.length - openRepos;
  const totalCollateral = repos.reduce((sum, r) => sum + Number(r.collateralAmount) / 1e6, 0);

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-20 border-b-2 border-ink bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <a
              href="/"
              className="inline-block font-display text-2xl font-bold uppercase tracking-tight underline-offset-4 hover:underline focus-ring"
            >
              Pignora
            </a>
            <p className="mono-label mt-0.5 text-muted-foreground">
              Repo rail · lending caps priced by verified identity
            </p>
          </div>
          <div className="flex items-center gap-3">
            {mode === "…" ? (
              <span className="border-2 border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Checking
              </span>
            ) : mode === "sandbox" ? (
              <span className="flex items-center gap-2 bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Sandbox mode
              </span>
            ) : (
              <span className="flex items-center gap-2 border-2 border-destructive px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-destructive">
                <ShieldOff className="h-3.5 w-3.5" />
                Backend offline
              </span>
            )}
            <Button variant="outline" size="sm" onClick={refresh} disabled={busy !== null}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {operator ? (
              <span
                className="flex items-center gap-2 border-2 border-primary bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-foreground"
                title="Operator wallet — signs credential events (EIP-712)"
              >
                <Wallet className="h-3.5 w-3.5" />
                {shortAddr(operator)}
              </span>
            ) : (
              <Button variant="outline" size="sm" onClick={connect} disabled={busy !== null}>
                <Wallet className="mr-1.5 h-3.5 w-3.5" />
                Connect wallet
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
        {error && (
          <div className="flex items-start gap-2 border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* stats row */}
        <div className="grid gap-px border-2 border-ink bg-ink sm:grid-cols-4">
          {[
            ["Open repos", String(openRepos)],
            ["Closed out", String(closedRepos)],
            ["Collateral (BOND)", totalCollateral.toLocaleString()],
            ["API", mode || "…"],
          ].map(([k, v]) => (
            <div key={k} className="bg-background px-5 py-4">
              <p className="mono-label text-muted-foreground">{k}</p>
              <p className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-primary-foreground">
                {v}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-2 border-ink">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-tight">
                Counterparty identity <Badge variant="outline" className="mono-label">CVI</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                A-Pass gate: verified identity, tier, and the lending cap it sets. Unverified wallets are rejected by the rail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="borrower-wallet" className="mono-label text-muted-foreground">
                    Borrower wallet
                  </Label>
                  <Input
                    id="borrower-wallet"
                    value={borrower}
                    onChange={(e) => setBorrower(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <Button onClick={checkIdentity} disabled={busy !== null}>
                  {busy === "identity" ? "Verifying…" : "Verify"}
                </Button>
              </div>

              {identity ? (
                <div className="mt-4 grid grid-cols-2 gap-px border border-ink bg-ink sm:grid-cols-5">
                  {[
                    ["Status", identity.verified ? "VERIFIED" : "REJECTED", identity.verified ? "text-primary" : "text-destructive"],
                    ["Tier", String(identity.tier), "text-foreground"],
                    ["Lending cap", `${(identity.haircutBps / 100).toFixed(1)}%`, "text-foreground"],
                    ["CV record", identity.cvRecordId, "text-foreground"],
                    ["Status code", String(identity.code), "text-foreground"],
                  ].map(([k, v, tone]) => (
                    <div key={k as string} className="bg-background px-3 py-2">
                      <p className="mono-label text-muted-foreground">{k}</p>
                      <p className={`mt-0.5 font-display text-lg font-bold uppercase tracking-tight ${tone}`}>{v}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 border-2 border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  <ShieldOff className="h-4 w-4" />
                  No identity checked yet. Enter a wallet and verify.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-ink">
            <CardHeader>
              <CardTitle className="font-display text-xl font-bold uppercase tracking-tight">
                Open a repo
              </CardTitle>
              <CardDescription className="text-xs">
                The cash leg is capped by the borrower&apos;s tier: 50+ = 2%, 20+ = 5%, basic = 10%. Settlement in a USD-pegged CVA, Travel Rule attributed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="mono-label text-muted-foreground">Borrower</Label>
                  <Input
                    value={borrower}
                    onChange={(e) => setBorrower(e.target.value)}
                    placeholder="0x… (any wallet)"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="mono-label text-muted-foreground">Lender</Label>
                  <Input
                    value={lender}
                    onChange={(e) => setLender(e.target.value)}
                    placeholder="0x… (any wallet)"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="mono-label text-muted-foreground">Collateral (BOND, units)</Label>
                  <Input value={collateral} onChange={(e) => setCollateral(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="mono-label text-muted-foreground">Cash (USD CVA, micro-units)</Label>
                  <Input value={cash} onChange={(e) => setCash(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="mono-label text-muted-foreground">Term (days)</Label>
                  <Input value={termDays} onChange={(e) => setTermDays(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="mono-label text-muted-foreground">Fee (bps)</Label>
                  <Input value={feeBps} onChange={(e) => setFeeBps(e.target.value)} className="font-mono text-xs" />
                </div>
              </div>
              <Button className="mt-4 w-full font-display text-sm font-bold uppercase tracking-widest" onClick={openRepo} disabled={busy !== null}>
                {busy === "open" ? "Opening…" : "Open repo"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 border-ink">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="font-display text-xl font-bold uppercase tracking-tight">
                  Positions
                </CardTitle>
                <CardDescription className="text-xs">
                  Freezing the borrower&apos;s A-Pass mid-term is the credential event: it calls the Cleanverse update_status endpoint, flips the on-chain gate, and triggers the rail&apos;s closeout. The event is EIP-712 signed by your connected wallet before the backend executes it.
                </CardDescription>
                {walletError && (
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-destructive">
                    {walletError}
                  </p>
                )}
                {lastEventTx && (
                  <a
                    href={`https://testnet.monadscan.xyz/tx/${lastEventTx}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block break-all font-mono text-[11px] text-destructive underline decoration-2 underline-offset-4 focus-ring"
                  >
                    credential event tx: {lastEventTx}
                  </a>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={revokeBorrower}
                disabled={busy !== null}
                className="border-2 border-destructive font-display text-xs font-bold uppercase tracking-widest text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                Freeze borrower credential
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-ink">
                  <TableHead className="mono-label">Repo</TableHead>
                  <TableHead className="mono-label">Borrower</TableHead>
                  <TableHead className="mono-label">Lender</TableHead>
                  <TableHead className="mono-label text-right">Collateral</TableHead>
                  <TableHead className="mono-label text-right">Cash</TableHead>
                  <TableHead className="mono-label text-right">Cap</TableHead>
                  <TableHead className="mono-label">Tx</TableHead>
                  <TableHead className="mono-label">Status</TableHead>
                  <TableHead className="mono-label text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center font-display text-lg uppercase tracking-widest text-muted-foreground">
                      No repos yet. Open one above.
                    </TableCell>
                  </TableRow>
                )}
                {repos.map((r) => (
                  <TableRow key={r.id} className="border-b border-border">
                    <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                    <TableCell className="font-mono text-xs" title={r.borrower}>{short(r.borrower)}</TableCell>
                    <TableCell className="font-mono text-xs" title={r.lender}>{short(r.lender)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(r.collateralAmount)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(r.cashAmount)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{(r.haircutBps / 100).toFixed(1)}%</TableCell>
                    <TableCell className="font-mono text-[10px] leading-4">
                      {r.onchain?.txHash ? (
                        <a
                          href={`https://testnet.monadscan.xyz/tx/${r.onchain.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-foreground underline decoration-2 underline-offset-2 hover:text-muted-foreground focus-ring"
                          title="repo open tx"
                        >
                          open {r.onchain.txHash.slice(0, 10)}…
                        </a>
                      ) : (
                        <span className="text-muted-foreground/60">no on-chain</span>
                      )}
                      {r.closeout?.txHash && (
                        <a
                          href={`https://testnet.monadscan.xyz/tx/${r.closeout.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block text-destructive underline decoration-2 underline-offset-2 hover:text-destructive/70 focus-ring"
                          title="closeout tx"
                        >
                          close {r.closeout.txHash.slice(0, 10)}…
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.status === "OPEN" ? (
                        <span className="bg-primary px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-widest text-primary-foreground">
                          OPEN
                        </span>
                      ) : (
                        <span className="bg-muted px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                          CLOSED OUT
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {r.status === "OPEN" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => closeout(r.id, r.onchain?.onchainRepoId)}
                            disabled={busy !== null}
                            className="font-display text-[11px] font-bold uppercase tracking-widest"
                          >
                            Closeout
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => showAudit(r.id)}
                          disabled={busy !== null}
                          className="font-display text-[11px] font-bold uppercase tracking-widest"
                        >
                          Audit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <footer className="flex items-center justify-center gap-4 pb-2 text-center mono-label text-muted-foreground">
          <a
            href="/"
            className="underline decoration-2 underline-offset-4 hover:text-foreground focus-ring"
          >
            Landing
          </a>
          <span aria-hidden="true">·</span>
          <span>Pignora. Cleanverse Build: Trusted Assets. Sandbox mode: Cleanverse testnet identities and test funds only; no real assets.</span>
        </footer>
      </div>

      <Dialog open={audit !== null} onOpenChange={(open) => !open && setAudit(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto border-2 border-ink">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold uppercase tracking-tight">
              Audit pack for repo #{audit?.repoId ?? ""}
            </DialogTitle>
            <DialogDescription className="break-all font-mono text-xs">
              {audit?.artifact.name}
            </DialogDescription>
          </DialogHeader>
          <Separator className="bg-ink" />
          <ol className="space-y-2 font-mono text-xs">
            {audit?.events.map((e, i) => (
              <li key={i} className="flex gap-3 text-muted-foreground">
                <span className="shrink-0 text-muted-foreground/60">{e.ts}</span>
                <span className="text-foreground">{e.type}</span>
              </li>
            ))}
          </ol>
          {audit?.artifact.note && (
            <p className="text-xs text-muted-foreground">{audit.artifact.note}</p>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
