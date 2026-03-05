#[starknet::interface]
pub trait IActions<T> {
    fn start_game(ref self: T);
    fn place_block(ref self: T, game_id: u32, piece_id: u8, x: u8, y: u8);
}

#[dojo::contract]
pub mod actions {
    use blokaz::grid::{can_place, place_piece};
    use blokaz::models::{Game, GameCounter, PlayerStats};
    use blokaz::pieces::get_piece;
    use blokaz::utils::{next_random, pack_blocks, unpack_blocks};
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use super::IActions;

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameStarted {
        #[key]
        pub player: ContractAddress,
        pub game_id: u32,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct BlockPlaced {
        #[key]
        pub game_id: u32,
        pub piece_id: u8,
        pub x: u8,
        pub y: u8,
        pub lines_cleared: u8,
    }

    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn start_game(ref self: ContractState) {
            let mut world = self.world_default();
            let player = get_caller_address();

            // Retrieve or initialize GameCounter
            let mut counter: GameCounter = world.read_model(1);
            let next_id = counter.current_val + 1;
            counter.current_val = next_id;
            counter.id = 1;

            let game_id = next_id;

            // Generate seed: simple combination for now
            let mut seed: u256 = get_block_timestamp().into() + next_id.into();

            let b1 = next_random(ref seed);
            let b2 = next_random(ref seed);
            let b3 = next_random(ref seed);
            let available_blocks = pack_blocks(b1, b2, b3);

            let new_game = Game {
                id: game_id,
                player,
                seed,
                score: 0,
                grid: 0,
                combo: 0,
                blocks_placed: 0,
                available_blocks,
                is_over: false,
                mode: 0,
            };

            world.write_model(@counter);
            world.write_model(@new_game);
            world.emit_event(@GameStarted { player, game_id });
        }

        fn place_block(ref self: ContractState, game_id: u32, piece_id: u8, x: u8, y: u8) {
            let mut world = self.world_default();
            let player = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(!game.is_over, 'Game is already over');
            assert(game.player == player, 'Not your game');

            // Hand Management: Validate piece is in hand
            let (mut b1, mut b2, mut b3) = unpack_blocks(game.available_blocks);
            let mut found_in_hand = false;

            if b1 == piece_id {
                b1 = 255;
                found_in_hand = true;
            } else if b2 == piece_id {
                b2 = 255;
                found_in_hand = true;
            } else if b3 == piece_id {
                b3 = 255;
                found_in_hand = true;
            }
            assert(found_in_hand, 'Piece not in hand');

            // Placement check
            let piece = get_piece(piece_id);
            assert(can_place(game.grid, piece, x, y), 'Invalid placement');

            let (new_grid, lines_cleared) = place_piece(game.grid, piece, x, y);

            game.grid = new_grid;
            game.blocks_placed += 1;

            // Advanced Scoring & Combos
            if lines_cleared > 0 {
                game.combo += 1;
            } else {
                game.combo = 0;
            }

            let piece_score = piece.width * piece.height;
            let combo_multiplier = if game.combo > 0 {
                game.combo
            } else {
                1
            };
            let line_score = lines_cleared * 10 * combo_multiplier;
            game.score += piece_score.into() + line_score.into();

            // Refill Hand if empty
            if b1 == 255 && b2 == 255 && b3 == 255 {
                b1 = next_random(ref game.seed);
                b2 = next_random(ref game.seed);
                b3 = next_random(ref game.seed);
            }

            game.available_blocks = pack_blocks(b1, b2, b3);

            // Game Over Detection
            let mut any_valid = false;
            if b1 != 255 && blokaz::grid::has_valid_move(game.grid, get_piece(b1)) {
                any_valid = true;
            }
            if !any_valid && b2 != 255 && blokaz::grid::has_valid_move(game.grid, get_piece(b2)) {
                any_valid = true;
            }
            if !any_valid && b3 != 255 && blokaz::grid::has_valid_move(game.grid, get_piece(b3)) {
                any_valid = true;
            }

            let mut stats: PlayerStats = world.read_model(player);
            let mut stats_updated = false;

            if game.score > stats.high_score_classic {
                stats.high_score_classic = game.score;
                stats_updated = true;
            }

            if !any_valid {
                game.is_over = true;
                stats.games_played += 1;
                stats.total_score += game.score.into();
                stats_updated = true;
            }

            if stats_updated {
                world.write_model(@stats);
            }

            world.write_model(@game);
            world.emit_event(@BlockPlaced { game_id, piece_id, x, y, lines_cleared });
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"blokaz")
        }
    }
}
