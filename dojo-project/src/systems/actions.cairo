#[starknet::interface]
pub trait IActions<T> {
    fn start_game(ref self: T, token_id: u64);
    fn place_block(ref self: T, token_id: u64, piece_id: u8, x: u8, y: u8);
}

#[dojo::contract]
pub mod actions {
    use blokaz::grid::{can_place, place_piece};
    use blokaz::models::{Game, GameSettings, ObjectiveState, PlayerStats};
    use blokaz::pieces::get_piece;
    use blokaz::utils::{next_random, pack_blocks, unpack_blocks};
    use core::num::traits::Zero;
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use game_components_minigame::extensions::objectives::objectives::ObjectivesComponent;
    use game_components_minigame::extensions::settings::settings::SettingsComponent;
    use game_components_minigame::interface::{IMinigame, IMinigameTokenData};
    use game_components_minigame::libs;
    use game_components_minigame::minigame::MinigameComponent;
    use openzeppelin_introspection::src5::SRC5Component;
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use super::IActions;

    component!(path: MinigameComponent, storage: minigame, event: MinigameEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: SettingsComponent, storage: settings, event: SettingsEvent);
    component!(path: ObjectivesComponent, storage: objectives, event: ObjectivesEvent);

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        MinigameEvent: MinigameComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        SettingsEvent: SettingsComponent::Event,
        #[flat]
        ObjectivesEvent: ObjectivesComponent::Event,
    }

    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    #[abi(embed_v0)]
    impl MinigameImpl = MinigameComponent::MinigameImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        minigame: MinigameComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        settings: SettingsComponent::Storage,
        #[substorage(v0)]
        objectives: ObjectivesComponent::Storage,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameStarted {
        #[key]
        pub player: ContractAddress,
        pub token_id: u64,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct BlockPlaced {
        #[key]
        pub token_id: u64,
        pub piece_id: u8,
        pub x: u8,
        pub y: u8,
        pub lines_cleared: u8,
    }

    #[abi(embed_v0)]
    impl MinigameTokenDataImpl of IMinigameTokenData<ContractState> {
        fn score(self: @ContractState, token_id: u64) -> u32 {
            let world = self.world_default();
            let game: Game = world.read_model(token_id);
            game.score
        }

        fn game_over(self: @ContractState, token_id: u64) -> bool {
            let world = self.world_default();
            let game: Game = world.read_model(token_id);
            game.is_over
        }
    }

    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn start_game(ref self: ContractState, token_id: u64) {
            let token_addr = IMinigame::token_address(@self);
            let mut settings_id: u32 = 0;
            if token_addr.is_non_zero() {
                libs::assert_token_ownership(token_addr, token_id);
                libs::pre_action(token_addr, token_id);
                settings_id =
                    game_components_minigame::extensions::settings::libs::get_settings_id(
                        token_addr, token_id,
                    );
            }

            let mut world = self.world_default();
            let player = get_caller_address();

            // Here we store the detected settings id into the Game session. We can use
            // settings id offline checking or fetching for specific logic like mode = 1 etc.
            let mut game_settings = GameSettings { settings_id, mode: 0 };
            world.write_model(@game_settings);

            let mut seed: u256 = core::pedersen::pedersen(
                token_id.into(), get_block_timestamp().into(),
            )
                .into();

            let b1 = next_random(ref seed);
            let b2 = next_random(ref seed);
            let b3 = next_random(ref seed);
            let available_blocks = pack_blocks(b1, b2, b3);

            let new_game = Game {
                token_id,
                player,
                seed,
                score: 0,
                grid: 0,
                combo: 0,
                blocks_placed: 0,
                available_blocks,
                is_over: false,
                mode: game_settings.mode,
            };

            world.write_model(@new_game);
            world.emit_event(@GameStarted { player, token_id });

            if token_addr.is_non_zero() {
                libs::post_action(token_addr, token_id);
            }
        }

        fn place_block(ref self: ContractState, token_id: u64, piece_id: u8, x: u8, y: u8) {
            let token_addr = IMinigame::token_address(@self);
            if token_addr.is_non_zero() {
                libs::assert_token_ownership(token_addr, token_id);
                libs::pre_action(token_addr, token_id);
            }

            let mut world = self.world_default();
            let player = get_caller_address();

            let mut game: Game = world.read_model(token_id);
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
            world.emit_event(@BlockPlaced { token_id, piece_id, x, y, lines_cleared });

            // EGS Objectives Sync
            if token_addr.is_non_zero() {
                let objective_ids =
                    game_components_minigame::extensions::objectives::libs::get_objective_ids(
                    token_addr, token_id,
                );
                let mut i = 0;
                // We mock an objective evaluation:
                // If ID is 1, let's say it's "Score > 100".
                // If ID is 2, let's say it's "Combo > 3".
                loop {
                    if i >= objective_ids.len() {
                        break;
                    }
                    let obj_id = *objective_ids.at(i);
                    let mut obj_state: ObjectiveState = world.read_model((token_id, obj_id));
                    if !obj_state.completed {
                        let mut completed = false;
                        if obj_id == 1 && game.score >= 100 {
                            completed = true;
                        } else if obj_id == 2 && game.combo >= 3 {
                            completed = true;
                        } else if obj_id == 3 && game.is_over {
                            completed = true;
                        }

                        if completed {
                            obj_state.completed = true;
                            world.write_model(@obj_state);
                        }
                    }
                    i += 1;
                }

                libs::post_action(token_addr, token_id);
            }
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"blokaz")
        }
    }
}
