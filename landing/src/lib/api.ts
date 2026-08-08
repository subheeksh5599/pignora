export type Health = {
  ok: boolean;
  mode: string;
  chain: string;
  monad: { chainId: number; rpc: string };
  contracts: { repoDesk: string | null; registry: string | null };
  cleanverse: string;
};

export type Identity = {
  address: string;
  verified: boolean;
  code: number;
  tier: number;
  status: string;
  expiry: number;
  cvRecordId: string;
  haircutBps: number;
  mode: string;
};

export type Repo = {
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
  mode: string;
  closeout?: { reason: string; executedAt: string; collateralToLender: string; escrowed: string };
};

export type Policy = { haircuts: Record<string, string>; maintenanceMarginBps: number; note: string };

const API_BASE: string = import.meta.env.VITE_API_URL ?? "https://backend-six-rho-86.vercel.app";

async function call<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  base: API_BASE,
  health: () => call<Health>("/health"),
  identity: (address: string) => call<Identity>(`/identity/${address}`),
  policy: () => call<Policy>("/policy"),
  repos: () => call<{ repos: Repo[] }>("/repos"),
};
