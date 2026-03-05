use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Game {
    #[key]
    pub id: u32,
    pub player: ContractAddress,
    pub seed: u256,
    pub score: u32,
    pub grid: u128,
    pub combo: u8,
    pub blocks_placed: u8,
    pub available_blocks: u32,
    pub is_over: bool,
    pub mode: u8,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct GameCounter {
    #[key]
    pub id: u32,
    pub current_val: u32,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PlayerStats {
    #[key]
    pub player: ContractAddress,
    pub high_score_classic: u32,
    pub games_played: u32,
    pub total_score: u128,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct DailyChallenge {
    #[key]
    pub day_id: u32,
    pub seed: u256,
    pub participants_count: u32,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct DailyLeaderboard {
    #[key]
    pub day_id: u32,
    #[key]
    pub player: ContractAddress,
    pub score: u32,
}
