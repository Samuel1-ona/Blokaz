#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Blokaz Initialization Script — Starknet Sepolia
# =============================================================================
# Run this AFTER you have already declared and deployed the contract.
# It calls the initializer function with properly encoded calldata.
#
# Usage:
#   export CONTRACT_ADDRESS=0x...
#   export DENSHOKAN_TOKEN=0x...
#   export GAME_CREATOR=0x...
#   ./deploy.sh
#
# Optional:
#   STARKNET_ACCOUNT  - sncast account name (default: "blokaz-deployer")
#   STARKNET_RPC      - RPC URL (default: Sepolia public endpoint)
# =============================================================================

ACCOUNT="${STARKNET_ACCOUNT:-blokaz-deployer}"
RPC="${STARKNET_RPC:-https://free-rpc.nethermind.io/sepolia-juno/v0_7}"
CONTRACT_ADDRESS="${CONTRACT_ADDRESS:-}"
DENSHOKAN_TOKEN="${DENSHOKAN_TOKEN:-}"
GAME_CREATOR="${GAME_CREATOR:-}"

# --- Validation ---
if [[ -z "$CONTRACT_ADDRESS" ]]; then
  echo "ERROR: CONTRACT_ADDRESS is required."
  echo "  export CONTRACT_ADDRESS=0x..."
  exit 1
fi

if [[ -z "$DENSHOKAN_TOKEN" ]]; then
  echo "ERROR: DENSHOKAN_TOKEN is required."
  echo "  export DENSHOKAN_TOKEN=0x..."
  exit 1
fi

if [[ -z "$GAME_CREATOR" ]]; then
  echo "ERROR: GAME_CREATOR is required (your wallet address)."
  echo "  export GAME_CREATOR=0x..."
  exit 1
fi

# --- Helper: Encode a string as ByteArray calldata ---
# ByteArray = { data: Array<bytes31>, pending_word: felt252, pending_word_len: usize }
# For calldata: [data_len, ...data_chunks, pending_word, pending_word_len]
encode_bytearray() {
  local str="$1"
  local len=${#str}
  local full_chunks=$((len / 31))
  local remaining=$((len % 31))
  local calldata=""

  # Number of full 31-byte chunks
  calldata="$full_chunks"

  # Each full chunk as hex
  local i=0
  while [[ $i -lt $full_chunks ]]; do
    local chunk="${str:$((i * 31)):31}"
    local hex="0x$(printf '%s' "$chunk" | xxd -p | tr -d '\n')"
    calldata="$calldata $hex"
    i=$((i + 1))
  done

  # Pending word (remaining bytes)
  if [[ $remaining -gt 0 ]]; then
    local pending="${str:$((full_chunks * 31)):$remaining}"
    local hex="0x$(printf '%s' "$pending" | xxd -p | tr -d '\n')"
    calldata="$calldata $hex $remaining"
  else
    calldata="$calldata 0x0 0"
  fi

  echo "$calldata"
}

echo "========================================"
echo "  Blokaz Initialization — Starknet Sepolia"
echo "========================================"
echo "Account:          $ACCOUNT"
echo "RPC:              $RPC"
echo "Contract:         $CONTRACT_ADDRESS"
echo "Game Creator:     $GAME_CREATOR"
echo "Denshokan Token:  $DENSHOKAN_TOKEN"
echo ""

# Encode game metadata as ByteArray calldata
GAME_NAME=$(encode_bytearray "Blokaz")
GAME_DESC=$(encode_bytearray "Onchain block puzzle game")
GAME_DEV=$(encode_bytearray "Blokaz Team")
GAME_PUB=$(encode_bytearray "Blokaz")
GAME_GENRE=$(encode_bytearray "Puzzle")
GAME_IMAGE=$(encode_bytearray "")

# Calldata layout:
#   game_creator (ContractAddress)
#   game_name (ByteArray)
#   game_description (ByteArray)
#   game_developer (ByteArray)
#   game_publisher (ByteArray)
#   game_genre (ByteArray)
#   game_image (ByteArray)
#   game_color (Option<ByteArray>) = None = 0
#   client_url (Option<ByteArray>) = None = 0
#   renderer_address (Option<ContractAddress>) = None = 0
#   settings_address (Option<ContractAddress>) = None = 0
#   objectives_address (Option<ContractAddress>) = None = 0
#   minigame_token_address (ContractAddress)

CALLDATA="$GAME_CREATOR \
$GAME_NAME \
$GAME_DESC \
$GAME_DEV \
$GAME_PUB \
$GAME_GENRE \
$GAME_IMAGE \
0 \
0 \
0 \
0 \
0 \
$DENSHOKAN_TOKEN"

echo "Calling initializer..."
echo "  Calldata: $CALLDATA"
echo ""

sncast --account "$ACCOUNT" --url "$RPC" \
  invoke \
  --contract-address "$CONTRACT_ADDRESS" \
  --function initializer \
  --calldata $CALLDATA

echo ""
echo "========================================"
echo "  Initialization Complete!"
echo "========================================"
echo ""
echo "  Next step: Update BLOKAZ_CONTRACT_ADDRESS in"
echo "  client/src/providers/StarknetProvider.tsx with:"
echo "  $CONTRACT_ADDRESS"
echo "========================================"
