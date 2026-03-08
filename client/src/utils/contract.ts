// Contract addresses — Sepolia testnet
export const BLOKAZ_ADDRESS =
  "0x020fe9632d6fb839b877bf0899d61df0e160dd021caa81b9a2c36ebb8c9bd720";

export const DENSHOKAN_TOKEN_ADDRESS =
  "0x0142712722e62a38f9c40fcc904610e1a14c70125876ecaaf25d803556734467";

export const GAME_REGISTRY_ADDRESS =
  "0x040f1ed9880611bb7273bf51fd67123ebbba04c282036e2f81314061f6f9b1a1";

// Game ID in the Denshokan registry (confirmed via game_id_from_address)
export const BLOKAZ_GAME_ID = 13;

// Unpack the u32 available_blocks into 3 piece IDs (u8 each)
// Pack format: b1 | (b2 << 8) | (b3 << 16)
export function unpackBlocks(packed: number): [number, number, number] {
  const b1 = packed & 0xff;
  const b2 = (packed >> 8) & 0xff;
  const b3 = (packed >> 16) & 0xff;
  return [b1, b2, b3];
}

// Decode u128 grid bitmask to a boolean 9x9 grid
// bit index = y * 9 + x
export function decodeBitGrid(gridValue: bigint): bigint {
  return gridValue;
}
