use core::hash::{HashStateExTrait, HashStateTrait};
use core::poseidon::PoseidonTrait;

// Linear Congruential Generator or Poseidon. We use Poseidon for PRNG.
pub fn next_random(ref seed: u256) -> u8 {
    let mut state = PoseidonTrait::new();
    // In Cairo, we hash the lower and upper 128 bits of u256
    let low: u128 = seed.low;
    let high: u128 = seed.high;
    let low_felt: felt252 = low.into();
    let high_felt: felt252 = high.into();
    state = state.update_with(low_felt);
    state = state.update_with(high_felt);
    let next: felt252 = state.finalize();

    // Update the seed
    seed = next.into();

    // Return a piece ID between 1 and 11
    let val: u256 = seed;
    let piece_id = (val % 11) + 1;
    piece_id.try_into().unwrap()
}

pub fn pack_blocks(b1: u8, b2: u8, b3: u8) -> u32 {
    let b1_32: u32 = b1.into();
    let b2_32: u32 = b2.into();
    let b3_32: u32 = b3.into();
    // b1 in least significant byte, b2 next, b3 next
    (b3_32 * 65536_u32) + (b2_32 * 256_u32) + b1_32
}

pub fn unpack_blocks(mut packed: u32) -> (u8, u8, u8) {
    let b1: u8 = (packed % 256_u32).try_into().unwrap();
    packed /= 256_u32;
    let b2: u8 = (packed % 256_u32).try_into().unwrap();
    packed /= 256_u32;
    let b3: u8 = (packed % 256_u32).try_into().unwrap();
    (b1, b2, b3)
}
