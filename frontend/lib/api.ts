"use client";

/** Backend client (Pignora API on :8787). */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export type IdentityStatus = "ACTIVE" | "FROZEN" | "REVOKED" | "EXPIRED" | "UNVERIFIED";

export interface Identity {
  address: string;
  verified: boolean;
  code: number;
  tier: number;
  status: IdentityStatus;
  expiry: number;
  cvRecordId: string;
  haircutBps: number;
  mode: string;
}

export interface Repo {
  id: number;
  borrower: string;
  lender: string;
  collateralToken: string;
  cashToken: string;
  collateralAmount: string;
  cashAmount: string;
  feeBps: number;
  haircutBps: number;
  tier: number;
  termDays: number;
  status: string;
  travelRule: string;
  createdAt: string;
  closeout?: {
    reason: string;
    executedAt: string;
    collateralToLender: string;
    escrowed: string;
  };
}

export interface AuditEvent {
  ts: string;
  type: string;
  repoId: number | null;
  [k: string]: unknown;
}

async function call<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

export const api = {
  health: () =>
    call<{
      ok: boolean;
      mode: string;
      chain: string;
      monad: { chainId: number; rpc: string };
      contracts: { repoDesk: string | null; registry: string | null };
      cleanverse: string;
    }>("/health"),
  identity: (address: string) => call<Identity>(`/identity/${address}`),
  setStatus: (address: string, status: IdentityStatus, tier?: number) =>
    call<{ ok: boolean }>(`/identity/${address}/status`, {
      method: "POST",
      body: JSON.stringify({ status, tier }),
    }),
  policy: () => call<{ haircuts: Record<string, string>; maintenanceMarginBps: number; note: string }>("/policy"),
  repos: () => call<{ repos: Repo[] }>("/repos"),
  openRepo: (body: Record<string, unknown>) =>
    call<{ repo: Repo }>("/repos/open", { method: "POST", body: JSON.stringify(body) }),
  closeout: (id: number) => call<{ repo: Repo }>(`/repos/${id}/closeout`, { method: "POST" }),
  audit: (id: number) =>
    call<{
      repoId: number;
      events: AuditEvent[];
      travelRule: { artifact?: string; note?: string } | null;
      artifact: { name: string; path: string; note: string };
    }>(`/repos/${id}/audit`),
};
