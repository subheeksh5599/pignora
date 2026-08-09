#!/usr/bin/env bash
# ============================================================================
# Pignora — one-command local stack (clone-and-run)
#
#   ./scripts/dev-up.sh
#
# Starts the FULL Pignora stack on a local anvil chain (chain id 31337):
#   1. anvil (if not running)                     — ephemeral local chain
#   2. forge deploy (Deploy.s.sol)               — IdentityRegistry + RepoDesk
#   3. seed identities + tokens                  — A-Passes mirrored on-chain
#   4. backend on :8787 (sandbox, local chain)   — real contract txs
#   5. frontend dev server on :3000              — landing + desk
#
# No Cleanverse credentials, no hardcoded addresses, no real funds:
# every repo open / freeze / closeout is a REAL transaction on the local
# chain (real hashes, real events). Swap MONAD_RPC / PRIVATE_KEY env vars
# to point the same stack at Monad testnet.
#
# Prerequisites: forge, node >= 20, backend + frontend deps installed.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
RPC="${MONAD_RPC:-http://127.0.0.1:8545}"
CHAIN_ID="${MONAD_CHAIN_ID:-31337}"
ENV_FILE="$BACKEND/.env"
BOOTSTRAP_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" # anvil default
LENDER_KEY="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"   # anvil key #2

log() { echo -e "\n\033[1;32m== ${1}\033[0m"; }

# 1. anvil -------------------------------------------------------------------
if ! curl -s -X POST "$RPC" -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' >/dev/null 2>&1; then
  log "starting anvil on $RPC"
  anvil --port "${RPC##*:}" --chain-id "$CHAIN_ID" >/tmp/pignora-anvil.log 2>&1 &
  ANVIL_PID=$!
  for i in $(seq 1 20); do
    curl -s -X POST "$RPC" -H "Content-Type: application/json" \
      --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' >/dev/null 2>&1 && break
    sleep 0.5
  done
  echo "anvil pid $ANVIL_PID (log: /tmp/pignora-anvil.log)"
else
  echo "anvil already running on $RPC"
fi

# 2. deploy ------------------------------------------------------------------
log "deploying contracts"
DEPLOY_OUT=$(cd "$ROOT/contracts" && PRIVATE_KEY=$BOOTSTRAP_KEY forge script script/Deploy.s.sol \
  --rpc-url "$RPC" --broadcast 2>&1)
echo "$DEPLOY_OUT" | grep -E "IdentityRegistry:|RepoDesk:|MockUSD|MockBond:" | sed 's/^/  /'
REGISTRY=$(echo "$DEPLOY_OUT" | grep -oE "IdentityRegistry: 0x[0-9a-fA-F]{40}" | grep -oE "0x[0-9a-fA-F]{40}")
DESK=$(echo "$DEPLOY_OUT" | grep -oE "RepoDesk: 0x[0-9a-fA-F]{40}" | grep -oE "0x[0-9a-fA-F]{40}")
USD=$(echo "$DEPLOY_OUT" | grep -oE "MockUSD \(aUSDC stand-in\): 0x[0-9a-fA-F]{40}" | grep -oE "0x[0-9a-fA-F]{40}")
BOND=$(echo "$DEPLOY_OUT" | grep -oE "MockBond: 0x[0-9a-fA-F]{40}" | grep -oE "0x[0-9a-fA-F]{40}")
[ -n "$REGISTRY" ] && [ -n "$DESK" ] || { echo "deploy failed"; exit 1; }

# 3. seed identities + tokens -------------------------------------------------
log "seeding identities and tokens (on-chain)"
cd "$BACKEND"
RELAY_KEY=$BOOTSTRAP_KEY LENDER_KEY=$LENDER_KEY MONAD_RPC=$RPC MONAD_CHAIN_ID=$CHAIN_ID \
IDENTITY_REGISTRY_ADDRESS=$REGISTRY REPO_DESK_ADDRESS=$DESK MOCK_USD_ADDRESS=$USD BOND_ADDRESS=$BOND \
node scripts/sandbox-e2e.js | tail -8

# 4. backend ------------------------------------------------------------------
log "writing backend/.env and starting backend on :8787"
cat > "$ENV_FILE" <<EOF
MODE=sandbox
MONAD_RPC=$RPC
MONAD_CHAIN_ID=$CHAIN_ID
IDENTITY_REGISTRY_ADDRESS=$REGISTRY
REPO_DESK_ADDRESS=$DESK
MOCK_USD_ADDRESS=$USD
BOND_ADDRESS=$BOND
RELAY_KEY=$BOOTSTRAP_KEY
LENDER_KEY=$LENDER_KEY
AUSDC_ADDRESS=0xaC0893567D43C3E7e6e35a72803df05416C1f20D
EOF
if curl -s http://127.0.0.1:8787/health >/dev/null 2>&1; then
  echo "backend already running on :8787 (restart it to pick up new .env)"
else
  (cd "$BACKEND" && node src/server.js >/tmp/pignora-backend.log 2>&1 &)
  for i in $(seq 1 20); do
    curl -s http://127.0.0.1:8787/health >/dev/null 2>&1 && break
    sleep 0.5
  done
fi
curl -s http://127.0.0.1:8787/health | head -c 120; echo

# 5. frontend ------------------------------------------------------------------
log "starting frontend on :3000"
(cd "$FRONTEND" && NEXT_PUBLIC_API_URL=http://127.0.0.1:8787 npm run dev >/tmp/pignora-frontend.log 2>&1 &)
for i in $(seq 1 30); do
  curl -s http://127.0.0.1:3000 >/dev/null 2>&1 && break
  sleep 1
done

log "Pignora is up"
echo "  desk:      http://localhost:3000/dashboard"
echo "  landing:   http://localhost:3000/"
echo "  api:       http://127.0.0.1:8787 (/health /policy /identity/:addr /repos)"
echo "  chain:     anvil $RPC (chain id $CHAIN_ID)"
echo "  logs:      /tmp/pignora-{anvil,backend,frontend}.log"
echo
echo "  Open a repo with borrower=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (anvil #0)"
echo "  and lender=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (anvil #1) — both"
echo "  are seeded with A-Passes; every action is a real local-chain tx."
