// Grid logic for a 9x9 board represented as a single u128.
// Indexing: bit index = y * 9 + x.
// Top-Left (0,0) is bit 0. Bottom-Right (8,8) is bit 80.

// Using u128 is perfect since 9x9 = 81 bits < 128.

use blokaz::pieces::Piece;

// A row is 9 bits wide. Row zero is bits 0-8.
const FULL_ROW: u128 = 0b111111111_u128; // 511

// A column has 1s at indices 0, 9, 18, 27, 36, 45, 54, 63, 72.
// 2^0 + 2^9 + 2^18 + 2^27 + 2^36 + 2^45 + 2^54 + 2^63 + 2^72
// Which is 1 + 512 + 262144 + 134217728 + 68719476736 + ...
const COL_0: u128 = 0x100401004010040100_u128
    | 1; // Wait, let me compute this precisely dynamically or hardcode the exact val.
// Actually, starknet supports bit shifts nicely, we can calculate it dynamically at compile/runtime
// efficiently.

fn get_row_mask(y: u8) -> u128 {
    FULL_ROW * pow2_128(y * 9)
}

fn get_col_mask(x: u8) -> u128 {
    let mut mask = 0_u128;
    let mut i = 0_u8;
    while i < 9 {
        mask = mask | pow2_128(i * 9 + x);
        i += 1;
    }
    mask
}

// Convert a piece's compact bit layout into a 9x9 mapped mask at position x,y
pub fn place_piece_mask(piece: Piece, x: u8, y: u8) -> u128 {
    let mut mask = 0_u128;
    let mut py = 0_u8;
    while py < piece.height {
        let mut px = 0_u8;
        while px < piece.width {
            // piece bit index
            let piece_bit_idx = py * piece.width + px;
            // check if bit is set in layout
            let bit_set = (piece.layout / pow2_32(piece_bit_idx)) % 2 == 1;

            if bit_set {
                let board_bit_idx = (y + py) * 9 + (x + px);
                mask = mask | pow2_128(board_bit_idx);
            }
            px += 1;
        }
        py += 1;
    }
    mask
}

// Checks if placing a piece is valid (within bounds and no collision)
pub fn can_place(grid: u128, piece: Piece, x: u8, y: u8) -> bool {
    // 1. Check bounds
    if x + piece.width > 9 || y + piece.height > 9 {
        return false;
    }

    // 2. Check overlap
    let mask = place_piece_mask(piece, x, y);
    (grid & mask) == 0
}

pub fn has_valid_move(grid: u128, piece: Piece) -> bool {
    let mut y = 0_u8;
    let mut found = false;
    while y < 9 {
        let mut x = 0_u8;
        while x < 9 {
            if can_place(grid, piece, x, y) {
                found = true;
                break;
            }
            x += 1;
        }
        if found {
            break;
        }
        y += 1;
    }
    found
}

// Places piece and resolves clears. Returns (new_grid, lines_cleared).
pub fn place_piece(grid: u128, piece: Piece, x: u8, y: u8) -> (u128, u8) {
    let mask = place_piece_mask(piece, x, y);
    let new_grid = grid | mask;
    resolve_clears(new_grid)
}

// Clears completed rows and columns, returns (new_grid, lines_cleared)
pub fn resolve_clears(mut grid: u128) -> (u128, u8) {
    let mut lines_cleared = 0_u8;

    // Find rows to clear
    let mut rows_to_clear = 0_u128;
    let mut y = 0_u8;
    while y < 9 {
        let mask = get_row_mask(y);
        if (grid & mask) == mask {
            rows_to_clear = rows_to_clear | mask;
            lines_cleared += 1;
        }
        y += 1;
    }

    // Find cols to clear
    let mut cols_to_clear = 0_u128;
    let mut x = 0_u8;
    while x < 9 {
        let mask = get_col_mask(x);
        if (grid & mask) == mask {
            cols_to_clear = cols_to_clear | mask;
            lines_cleared += 1;
        }
        x += 1;
    }

    // Clear the lines
    // First figure out what to clear
    let to_clear = rows_to_clear | cols_to_clear;
    // XOR or apply bitwise NOT AND to remove the lines from grid
    // Unfortunately u128 doesn't have a not() trait by default sometimes in cairo.
    // So if a bit is 1 in `to_clear`, we want to make it 0 in `grid`.
    // We can do grid - to_clear (only if to_clear is fully inside grid, which is guaranteed by
    // logic).
    let new_grid = grid - to_clear;

    (new_grid, lines_cleared)
}

// Utility for pow2
pub fn pow2_128(exp: u8) -> u128 {
    let mut res = 1_u128;
    let mut i = 0_u8;
    while i < exp {
        res *= 2_u128;
        i += 1;
    }
    res
}

pub fn pow2_32(exp: u8) -> u32 {
    let mut res = 1_u32;
    let mut i = 0_u8;
    while i < exp {
        res *= 2_u32;
        i += 1;
    }
    res
}
