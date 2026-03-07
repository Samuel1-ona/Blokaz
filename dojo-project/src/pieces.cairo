#[derive(Copy, Drop, Serde)]
pub struct Piece {
    pub id: u8,
    pub width: u8,
    pub height: u8,
    // Maximum 5x5 piece size represented as a 25-bit integer
    pub layout: u32,
}

// Bit layout format for a 5x5 piece (e.g., width 3, height 3):
// row 0: 00000000000000000000xxxxx
// We pack bits row by row starting from least significant bit or most significant.
// Let's standardise:
// LSB is top-left (0,0).
// Bit index = y * width + x

pub fn get_piece(id: u8) -> Piece {
    match id {
        0 => Piece { id: 0, width: 1, height: 1, layout: 0b1 }, // Dot
        1 => Piece { id: 1, width: 2, height: 2, layout: 0b1111 }, // 2x2 Square
        2 => Piece { id: 2, width: 3, height: 3, layout: 0b111111111 }, // 3x3 Square
        3 => Piece { id: 3, width: 2, height: 1, layout: 0b11 }, // Horizontal 2
        4 => Piece { id: 4, width: 3, height: 1, layout: 0b111 }, // Horizontal 3
        5 => Piece { id: 5, width: 4, height: 1, layout: 0b1111 }, // Horizontal 4
        6 => Piece { id: 6, width: 5, height: 1, layout: 0b11111 }, // Horizontal 5
        7 => Piece {
            id: 7, width: 1, height: 2, layout: 0b11,
        }, // Vertical 2 (layout same as horiz when considering width x height)
        8 => Piece { id: 8, width: 1, height: 3, layout: 0b111 }, // Vertical 3
        9 => Piece { id: 9, width: 1, height: 4, layout: 0b1111 }, // Vertical 4
        10 => Piece { id: 10, width: 1, height: 5, layout: 0b11111 }, // Vertical 5
        // Small L shapes (2x2)
        11 => Piece {
            id: 11, width: 2, height: 2, layout: 0b1101,
        }, // L Top-Right (top row: 1, bottom row: 11) -> wait, standard width x height indexing
        // 0,0=1 (LSB)  1,0=0
        // 0,1=1        1,1=1
        // 0b1101 = 13 (binary: 1101 -> bit 0=1, bit 1=0, bit 2=1, bit 3=1)

        _ => Piece { id: 0, width: 1, height: 1, layout: 0b1 } // Default fallback
    }
}
