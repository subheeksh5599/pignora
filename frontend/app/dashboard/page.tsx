"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type AuditEvent, type Identity, type Repo } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ExternalLink, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";

const TIER3 = "0x1111111111111111111111111111111111111111";
const TIER2 = "0x2222222222222222222222222222222222222222";
const ANON = "0x9999999999999999999999999999999999999999";

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

  const openRepos = repos.filter((r) => r.status === "OPEN").length;
  const closedRepos = repos.length - openRepos;
  const totalCollateral = repos.reduce((sum, r) => sum + Number(r.collateralAmount) / 1e6, 0);

  return (
    <main className="min-h-screen bg-muted/40 pb-16">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Pignora</h1>
            <p className="text-xs text-muted-foreground">
              Compliant RWA repo rail, lending caps priced by verified identity
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={mode === "sandbox" ? "default" : "secondary"} className="gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Cleanverse {mode === "sandbox" ? "sandbox" : "mock"} mode
            </Badge>
            <Button variant="outline" size="sm" onClick={refresh} disabled={busy !== null}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* stats row */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Open repos</CardDescription>
              <CardTitle className="text-2xl">{openRepos}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Closed out</CardDescription>
              <CardTitle className="text-2xl">{closedRepos}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Collateral escrowed (BOND)</CardDescription>
              <CardTitle className="text-2xl">{totalCollateral.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>API</CardDescription>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className={`h-2 w-2 rounded-full ${mode === "sandbox" ? "bg-emerald-500" : "bg-amber-500"}`} />
                {mode || "…"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Counterparty identity <Badge variant="outline">CVI</Badge>
              </CardTitle>
              <CardDescription>
                A-Pass gate: verified identity, tier, and the lending cap it sets. Unverified wallets are rejected by the rail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="borrower-wallet" className="text-xs text-muted-foreground">
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
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-5">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={identity.verified ? "default" : "destructive"} className="mt-1">
                      {identity.verified ? "VERIFIED" : "REJECTED"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tier</p>
                    <p className="mt-1 font-semibold">{identity.tier}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lending cap</p>
                    <p className="mt-1 font-semibold">{(identity.haircutBps / 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CV record</p>
                    <p className="mt-1 truncate font-mono text-xs">{identity.cvRecordId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status code</p>
                    <p className="mt-1 font-mono text-xs">{identity.code}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  <ShieldOff className="h-4 w-4" />
                  No identity checked yet. Enter a wallet and verify.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open a repo</CardTitle>
              <CardDescription>
                The cash leg is capped by the borrower&apos;s tier: 50+ = 2%, 20+ = 5%, basic = 10%. Settlement in aUSDC, Travel Rule attributed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Borrower</Label>
                  <Select value={borrower} onValueChange={(v) => v && setBorrower(v)}>
                    <SelectTrigger className="font-mono text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TIER3}>sandbox fixture 0x1111… (tier 20)</SelectItem>
                      <SelectItem value={TIER2}>sandbox fixture 0x2222… (tier 20)</SelectItem>
                      <SelectItem value={ANON}>no A-Pass (must fail)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Lender</Label>
                  <Select value={lender} onValueChange={(v) => v && setLender(v)}>
                    <SelectTrigger className="font-mono text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TIER2}>sandbox fixture 0x2222… (tier 20)</SelectItem>
                      <SelectItem value={TIER3}>sandbox fixture 0x1111… (tier 20)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Collateral (BOND, units)</Label>
                  <Input value={collateral} onChange={(e) => setCollateral(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Cash (aUSDC, micro-units)</Label>
                  <Input value={cash} onChange={(e) => setCash(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Term (days)</Label>
                  <Input value={termDays} onChange={(e) => setTermDays(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Fee (bps)</Label>
                  <Input value={feeBps} onChange={(e) => setFeeBps(e.target.value)} className="font-mono text-xs" />
                </div>
              </div>
              <Button className="mt-4 w-full" onClick={openRepo} disabled={busy !== null}>
                {busy === "open" ? "Opening…" : "Open repo"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Positions</CardTitle>
                <CardDescription>
                  Freezing the borrower&apos;s A-Pass mid-term is the credential event; in sandbox it calls the real Cleanverse update_status endpoint and flips the on-chain gate.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={revokeBorrower} disabled={busy !== null} className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive">
                <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                Simulate credential freeze
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repo</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead className="text-right">Collateral</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">Cap</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No repos yet. Open one above.
                    </TableCell>
                  </TableRow>
                )}
                {repos.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">#{r.id}</TableCell>
                    <TableCell className="font-mono text-xs" title={r.borrower}>{short(r.borrower)}</TableCell>
                    <TableCell className="font-mono text-xs" title={r.lender}>{short(r.lender)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(r.collateralAmount)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(r.cashAmount)}</TableCell>
                    <TableCell className="text-right text-xs">{(r.haircutBps / 100).toFixed(1)}%</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "OPEN" ? "default" : "secondary"}>
                        {r.status === "OPEN" ? "OPEN" : "CLOSED OUT"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {r.status === "OPEN" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => closeout(r.id)}
                            disabled={busy !== null}
                          >
                            Closeout
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => showAudit(r.id)}
                          disabled={busy !== null}
                        >
                          <ExternalLink className="mr-1.5 h-3 w-3" />
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

        <footer className="pb-2 text-center text-[11px] text-muted-foreground">
          Pignora. Cleanverse Build: Trusted Assets. Sandbox mode: Cleanverse testnet identities and test funds only; no real assets.
        </footer>
      </div>

      <Dialog open={audit !== null} onOpenChange={(open) => !open && setAudit(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit pack for repo #{audit?.repoId ?? ""}</DialogTitle>
            <DialogDescription className="break-all font-mono text-xs">
              {audit?.artifact.name}
            </DialogDescription>
          </DialogHeader>
          <Separator />
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
