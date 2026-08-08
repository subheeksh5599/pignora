#!/usr/bin/env bash
# ============================================================================
# Pignora — Monad testnet deploy pipeline (production path)
#
# Usage:
#   export PRIVATE_KEY=<funded deployer key>   # Monad testnet MON gas required
#   bash scripts/deploy-monad.sh
#
# What it does:
#   1. Deploys IdentityRegistry + RepoDesk (+ local stand-ins) to Monad testnet
#   2. Sets the registry relay to the deployer EOA
#   3. Writes the deployed addresses into backend/.env
#   4. Restarts the backend in sandbox mode and runs a live smoke check
#
# Prerequisites: forge in PATH, backend deps installed, funded PRIVATE_KEY.
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."
CONTRACTS_DIR="$(pwd)/contracts"
BACKEND_DIR="$(pwd)/backend"
ENV_FILE="$BACKEND_DIR/.env"
RPC="${MONAD_RPC:-https://monad-testnet.g.alchemy.com/v2/_ztkT79iUO-dFpkTNDBFB}"
CHAIN_ID="${MONAD_CHAIN_ID:-10143}"

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "ERROR: PRIVATE_KEY is not set (needs MON gas on Monad testnet)" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found — cp backend/.env.example backend/.env first" >&2
  exit 1
fi

echo "==> Deploying to Monad testnet (chain $CHAIN_ID)"
cd "$CONTRACTS_DIR"
OUT=$(PRIVATE_KEY="$PRIVATE_KEY" forge script script/Deploy.s.sol \
  --rpc-url "$RPC" --chain-id "$CHAIN_ID" --broadcast 2>&1)

REGISTRY=$(echo "$OUT" | grep -oP 'IdentityRegistry: \K0x[0-9a-fA-F]{40}' | tail -1)
DESK=$(echo "$OUT" | grep -oP 'RepoDesk: \K0x[0-9a-fA-F]{40}' | tail -1)
echo "==> IdentityRegistry: $REGISTRY"
echo "==> RepoDesk:         $DESK"

if [[ -z "$REGISTRY" || -z "$DESK" ]]; then
  echo "ERROR: deploy output did not contain contract addresses:" >&2
  echo "$OUT" | tail -20 >&2
  exit 1
fi

echo "==> Writing addresses into backend/.env"
sed -i "s|^REPO_DESK_ADDRESS=.*|REPO_DESK_ADDRESS=$DESK|" "$ENV_FILE"
sed -i "s|^IDENTITY_REGISTRY_ADDRESS=.*|IDENTITY_REGISTRY_ADDRESS=$REGISTRY|" "$ENV_FILE"

echo "==> Restarting backend (sandbox mode)"
pkill -f "node src/server.js" 2>/dev/null || true
sleep 1
cd "$BACKEND_DIR"
nohup node src/server.js > /tmp/pignora-backend.log 2>&1 &
sleep 3

echo "==> Smoke check"
curl -s http://localhost:8787/health | python3 -m json.tool
echo "==> Done. Desk: http://localhost:3000/dashboard (real identities on Monad testnet)"
