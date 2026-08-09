/**
 * Deployed RepoDesk addresses + ABI for wallet-driven transactions.
 * The connected MetaMask wallet is the LENDER: it signs openRepo and
 * executeCloseout directly (both are msg.sender-based / permissionless),
 * so the settlement happens from YOUR wallet, not the backend.
 */
import { ethers } from "ethers";

export const REPO_DESK = "0x398D45F56F759Cd4b4cf0be07C2C4AADf7327edA";
export const IDENTITY_REGISTRY = "0xdcb889940B95FF9625d76a735DaCdFEB979aD4C2";
export const BOND_TOKEN = "0x13211b8f5983BFDcd2a14D8467631254C3af5A89"; // MockBond (collateral)
export const CASH_TOKEN = "0xa66155a4c3fF24C0300aFA66DE6ff8D5f7310AEA"; // free-transfer USD CVA stand-in
export const CHAIN_ID = 10143;
export const EXPLORER = "https://testnet.monadscan.xyz";

export const REPO_DESK_ABI = [
  {
    type: "function",
    name: "openRepo",
    inputs: [
      { name: "borrower", type: "address" },
      { name: "collateralToken", type: "address" },
      { name: "cashToken", type: "address" },
      { name: "collateralAmount", type: "uint256" },
      { name: "cashAmount", type: "uint256" },
      { name: "feeBps", type: "uint256" },
      { name: "term", type: "uint64" },
      { name: "travelRule", type: "bytes32" },
    ],
    outputs: [{ name: "repoId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeCloseout",
    inputs: [{ name: "repoId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getRepo",
    inputs: [{ name: "repoId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "borrower", type: "address" },
          { name: "lender", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "cashToken", type: "address" },
          { name: "collateralAmount", type: "uint256" },
          { name: "cashAmount", type: "uint256" },
          { name: "feeBps", type: "uint256" },
          { name: "collateralValue", type: "uint256" },
          { name: "termEnd", type: "uint64" },
          { name: "marginDeadline", type: "uint64" },
          { name: "closed", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "repoCounter",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const satisfies ethers.InterfaceAbi;

/**
 * Typed wallet driver for RepoDesk. Returns callable methods so TypeScript
 * sees openRepo / executeCloseout as real functions (not possibly-undefined).
 */
export function repoDeskWallet(signer: ethers.Signer) {
  const desk = new ethers.Contract(REPO_DESK, REPO_DESK_ABI, signer);
  return {
    openRepo: (
      borrower: string,
      collateralToken: string,
      cashToken: string,
      collateralAmount: bigint,
      cashAmount: bigint,
      feeBps: bigint,
      term: bigint,
      travelRule: string
    ) => desk.openRepo!(borrower, collateralToken, cashToken, collateralAmount, cashAmount, feeBps, term, travelRule),
    executeCloseout: (repoId: bigint) => desk.executeCloseout!(repoId),
  };
}

const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
];

/** Typed ERC20 driver for the cash token (approve + allowance). */
export function erc20Wallet(token: string, signer: ethers.Signer) {
  const c = new ethers.Contract(token, ERC20_ABI, signer);
  return {
    approve: (spender: string, amount: bigint) => c.approve!(spender, amount),
    allowance: (owner: string, spender: string) => c.allowance!(owner, spender),
  };
}
