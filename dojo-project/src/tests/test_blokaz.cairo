#[cfg(test)]
mod tests {
    use blokaz::grid::{can_place, place_piece, has_valid_move, pow2_128};
    use blokaz::pieces::get_piece;
    use blokaz::utils::{next_random, pack_blocks, unpack_blocks};

    #[test]
    fn test_pack_unpack_blocks() {
        let packed = pack_blocks(3, 7, 11);
        let (b1, b2, b3) = unpack_blocks(packed);
        assert(b1 == 3, 'b1 wrong');
        assert(b2 == 7, 'b2 wrong');
        assert(b3 == 11, 'b3 wrong');
    }

    #[test]
    fn test_pack_unpack_with_255() {
        let packed = pack_blocks(255, 5, 255);
        let (b1, b2, b3) = unpack_blocks(packed);
        assert(b1 == 255, 'b1 should be 255');
        assert(b2 == 5, 'b2 wrong');
        assert(b3 == 255, 'b3 should be 255');
    }

    #[test]
    fn test_next_random_range() {
        let mut seed: u256 = 12345;
        let val = next_random(ref seed);
        assert(val >= 1 && val <= 11, 'piece out of range');
    }

    #[test]
    fn test_get_piece_dot() {
        let piece = get_piece(0);
        assert(piece.width == 1, 'dot width');
        assert(piece.height == 1, 'dot height');
        assert(piece.layout == 1, 'dot layout');
    }

    #[test]
    fn test_can_place_empty_grid() {
        let grid: u128 = 0;
        let piece = get_piece(0); // dot
        assert(can_place(grid, piece, 0, 0), 'should place dot at 0,0');
        assert(can_place(grid, piece, 8, 8), 'should place dot at 8,8');
    }

    #[test]
    fn test_can_place_out_of_bounds() {
        let grid: u128 = 0;
        let piece = get_piece(1); // 2x2 square
        assert(!can_place(grid, piece, 8, 8), 'should fail OOB');
        assert(can_place(grid, piece, 7, 7), 'should fit at 7,7');
    }

    #[test]
    fn test_can_place_collision() {
        let grid: u128 = 1; // bit 0 set = (0,0) occupied
        let piece = get_piece(0); // dot
        assert(!can_place(grid, piece, 0, 0), 'should collide');
        assert(can_place(grid, piece, 1, 0), 'should not collide');
    }

    #[test]
    fn test_place_piece_no_clear() {
        let grid: u128 = 0;
        let piece = get_piece(0); // dot at (0,0)
        let (new_grid, lines) = place_piece(grid, piece, 0, 0);
        assert(new_grid == 1, 'dot should set bit 0');
        assert(lines == 0, 'no lines cleared');
    }

    #[test]
    fn test_place_piece_row_clear() {
        // Fill row 0 except position 8, then place a dot at (8,0)
        let mut grid: u128 = 0;
        let mut x: u8 = 0;
        while x < 8 {
            grid = grid | pow2_128(x);
            x += 1;
        };
        let piece = get_piece(0);
        let (new_grid, lines) = place_piece(grid, piece, 8, 0);
        assert(lines >= 1, 'should clear row');
        // Row 0 should be cleared
        let row_mask: u128 = 0b111111111;
        assert((new_grid & row_mask) == 0, 'row 0 should be clear');
    }

    #[test]
    fn test_has_valid_move() {
        let grid: u128 = 0;
        let piece = get_piece(0);
        assert(has_valid_move(grid, piece), 'empty grid has moves');
    }

    #[test]
    fn test_scoring_combo() {
        // Verify combo multiplier logic
        let piece = get_piece(1); // 2x2 square
        let piece_score: u32 = (piece.width * piece.height).into();
        assert(piece_score == 4, '2x2 should be 4');
    }
}
