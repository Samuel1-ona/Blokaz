#!/bin/bash

# Deploy & Initialize Blokaz Game
# Declares, deploys, and initializes the Blokaz contract
# with the Denshokan token system.
#
# Prerequisites:
#   - sncast account configured in snfoundry.toml [sncast.sepolia]
#   - Funded account
#   - DENSHOKAN_ADDRESS, GAME_CREATOR set in .env
#
# Usage:
#   ./initialize.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
    echo "Loaded .env"
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

PROFILE="${PROFILE:-sepolia}"

# Validate
for var in DENSHOKAN_ADDRESS GAME_CREATOR; do
    if [ -z "${!var:-}" ]; then
        print_error "$var not set. Add it to .env"
        exit 1
    fi
done

print_info "Game Creator:     $GAME_CREATOR"
print_info "Denshokan Token:  $DENSHOKAN_ADDRESS"

# ============================
# BUILD
# ============================

print_info "Building contracts..."
cd "$SCRIPT_DIR"
scarb build

ARTIFACT="$SCRIPT_DIR/target/dev/blokaz_Blokaz.contract_class.json"
if [ ! -f "$ARTIFACT" ]; then
    print_error "Blokaz contract artifact not found at $ARTIFACT"
    echo "Available artifacts:"
    ls -1 "$SCRIPT_DIR"/target/dev/*.contract_class.json 2>/dev/null || echo "  (none)"
    exit 1
fi
print_info "Using artifact: $(basename "$ARTIFACT")"

# ============================
# DECLARE
# ============================

print_info "Declaring Blokaz contract..."

DECLARE_OUTPUT=$(sncast --profile "$PROFILE" --wait \
    declare \
    --contract-name Blokaz \
    --package blokaz 2>&1) || {
    if echo "$DECLARE_OUTPUT" | grep -q "already declared"; then
        print_warning "Contract already declared"
        CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -oE '0x[0-9a-fA-F]+' | head -1)
    else
        print_error "Failed to declare contract"
        echo "$DECLARE_OUTPUT"
        exit 1
    fi
}

if [ -z "${CLASS_HASH:-}" ]; then
    CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -oE 'class_hash: 0x[0-9a-fA-F]+' | grep -oE '0x[0-9a-fA-F]+' || \
                 echo "$DECLARE_OUTPUT" | grep -oE '0x[0-9a-fA-F]+' | tail -1)
fi

if [ -z "${CLASS_HASH:-}" ]; then
    print_error "Failed to extract class hash"
    echo "$DECLARE_OUTPUT"
    exit 1
fi

print_info "Class hash: $CLASS_HASH"

# ============================
# DEPLOY
# ============================

print_info "Deploying Blokaz contract..."

DEPLOY_OUTPUT=$(sncast --profile "$PROFILE" --wait \
    deploy \
    --class-hash "$CLASS_HASH" 2>&1) || {
    print_error "Failed to deploy contract"
    echo "$DEPLOY_OUTPUT"
    exit 1
}

CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE 'contract_address: 0x[0-9a-fA-F]+' | grep -oE '0x[0-9a-fA-F]+' || \
                   echo "$DEPLOY_OUTPUT" | grep -oE '0x[0-9a-fA-F]{64}' | head -1)

if [ -z "$CONTRACT_ADDRESS" ]; then
    print_error "Failed to extract deployed address"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

print_info "Deployed at: $CONTRACT_ADDRESS"

# ============================
# INITIALIZE
# ============================

# Encode a string to ByteArray calldata (raw felt serialization)
# ByteArray = num_31byte_chunks [chunks...] pending_word pending_len
encode_bytearray() {
    local str="$1"
    local len=${#str}
    if [ "$len" -eq 0 ]; then
        echo "0 0x0 0"
        return
    fi
    local hex=$(printf '%s' "$str" | xxd -p | tr -d '\n')
    if [ "$len" -le 31 ]; then
        echo "0 0x$hex $len"
    else
        local full_chunks=$((len / 31))
        local pending_len=$((len % 31))
        local result="$full_chunks"
        local i=0
        while [ "$i" -lt "$full_chunks" ]; do
            local chunk_hex=${hex:$((i * 62)):62}
            result="$result 0x$chunk_hex"
            i=$((i + 1))
        done
        if [ "$pending_len" -gt 0 ]; then
            local pending_hex=${hex:$((full_chunks * 62))}
            result="$result 0x$pending_hex $pending_len"
        else
            result="$result 0x0 0"
        fi
        echo "$result"
    fi
}

NAME_CD=$(encode_bytearray "Blokaz")
DESC_CD=$(encode_bytearray "Onchain block puzzle game")
DEV_CD=$(encode_bytearray "Blokaz Team")
PUB_CD=$(encode_bytearray "Blokaz")
GENRE_CD=$(encode_bytearray "Puzzle")
IMAGE_CD=$(encode_bytearray "")

print_info "Calling initializer..."

sncast --profile "$PROFILE" --wait \
    invoke \
    --contract-address "$CONTRACT_ADDRESS" \
    --function "initializer" \
    --calldata \
        $GAME_CREATOR \
        $NAME_CD \
        $DESC_CD \
        $DEV_CD \
        $PUB_CD \
        $GENRE_CD \
        $IMAGE_CD \
        1 \
        1 \
        1 \
        1 \
        1 \
        $DENSHOKAN_ADDRESS \
        1 \
        1 \
        1 || {
    print_error "Failed to initialize Blokaz"
    exit 1
}

# ============================
# SUMMARY
# ============================

echo ""
print_info "=== BLOKAZ DEPLOYED & INITIALIZED ==="
echo ""
echo "Class Hash: $CLASS_HASH"
echo "Contract:   $CONTRACT_ADDRESS"
echo "Denshokan:  $DENSHOKAN_ADDRESS"
echo "Creator:    $GAME_CREATOR"
echo ""
print_info "Update BLOKAZ_ADDRESS in client/src/utils/contract.ts with:"
echo "  $CONTRACT_ADDRESS"
