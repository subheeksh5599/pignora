/**
 * MetaMask wallet connect + EIP-712 signing for the Pignora desk.
 *
 * The desk is an operator rail: credential events (freeze/revoke/expire)
 * must be authorized by the operator wallet via MetaMask before the backend
 * executes them. Uses the injected provider directly (no wagmi/viem dep).
 */

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, cb: (accounts: string[]) => void) => void;
    };
  }
}

export interface SignTypedDataParams {
  domain: Record<string, unknown>;
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
}

function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not detected — install the MetaMask extension and reload");
  }
  return window.ethereum;
}

export async function connectWallet(): Promise<string> {
  const provider = getProvider();
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  const account = accounts?.[0];
  if (!account) throw new Error("no accounts returned by wallet");
  return account;
}

/** Sign typed data (EIP-712) with the connected wallet via eth_signTypedData_v4. */
export async function signTypedData(address: string, payload: SignTypedDataParams): Promise<string> {
  const provider = getProvider();
  const sig = (await provider.request({
    method: "eth_signTypedData_v4",
    params: [address, JSON.stringify(payload)],
  })) as string | undefined;
  if (!sig) throw new Error("wallet returned no signature");
  return sig;
}

/** Short address helper (re-exported here to avoid duplicating in the page). */
export function shortAddr(addr: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
