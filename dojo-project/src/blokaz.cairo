use starknet::ContractAddress;

#[starknet::interface]
pub trait IBlokaz<TContractState> {
    fn start_game(ref self: TContractState, token_id: u64);
    fn place_block(ref self: TContractState, token_id: u64, piece_id: u8, x: u8, y: u8);
    fn delete_block(ref self: TContractState, token_id: u64, x: u8, y: u8);
    fn grid(self: @TContractState, token_id: u64) -> u128;
    fn combo(self: @TContractState, token_id: u64) -> u8;
    fn blocks_placed(self: @TContractState, token_id: u64) -> u8;
    fn available_blocks(self: @TContractState, token_id: u64) -> u32;
    fn seed(self: @TContractState, token_id: u64) -> u256;
}

#[starknet::interface]
pub trait IBlokazInit<TContractState> {
    fn initializer(
        ref self: TContractState,
        game_creator: ContractAddress,
        game_name: ByteArray,
        game_description: ByteArray,
        game_developer: ByteArray,
        game_publisher: ByteArray,
        game_genre: ByteArray,
        game_image: ByteArray,
        game_color: Option<ByteArray>,
        client_url: Option<ByteArray>,
        renderer_address: Option<ContractAddress>,
        settings_address: Option<ContractAddress>,
        objectives_address: Option<ContractAddress>,
        minigame_token_address: ContractAddress,
    );
}

#[starknet::contract]
pub mod Blokaz {
    use blokaz::grid::{can_place, has_valid_move, place_piece};
    use blokaz::pieces::get_piece;
    use blokaz::utils::{next_random, pack_blocks, unpack_blocks};
    use game_components_minigame::extensions::objectives::interface::{
        IMinigameObjectives, IMinigameObjectivesDetails,
    };
    use game_components_minigame::extensions::objectives::objectives::ObjectivesComponent;
    use game_components_minigame::extensions::objectives::structs::GameObjective;
    use game_components_minigame::extensions::settings::interface::{
        IMinigameSettings, IMinigameSettingsDetails,
    };
    use game_components_minigame::extensions::settings::settings::SettingsComponent;
    use game_components_minigame::extensions::settings::structs::{GameSetting, GameSettingDetails};
    use game_components_minigame::interface::{IMinigameDetails, IMinigameTokenData};
    use game_components_minigame::minigame::MinigameComponent;
    use game_components_minigame::structs::GameDetail;
    use openzeppelin_introspection::src5::SRC5Component;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp, get_contract_address};

    // Components
    component!(path: MinigameComponent, storage: minigame, event: MinigameEvent);
    component!(path: ObjectivesComponent, storage: objectives, event: ObjectivesEvent);
    component!(path: SettingsComponent, storage: settings, event: SettingsEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[abi(embed_v0)]
    impl MinigameImpl = MinigameComponent::MinigameImpl<ContractState>;
    impl MinigameInternalImpl = MinigameComponent::InternalImpl<ContractState>;
    impl ObjectivesInternalImpl = ObjectivesComponent::InternalImpl<ContractState>;
    impl SettingsInternalImpl = SettingsComponent::InternalImpl<ContractState>;

    #[abi(embed_v0)]
    impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    // Storage — all game state keyed by token_id
    #[storage]
    struct Storage {
        #[substorage(v0)]
        minigame: MinigameComponent::Storage,
        #[substorage(v0)]
        objectives: ObjectivesComponent::Storage,
        #[substorage(v0)]
        settings: SettingsComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        // Game state
        grids: Map<u64, u128>,
        scores: Map<u64, u32>,
        combos: Map<u64, u8>,
        blocks_placed: Map<u64, u8>,
        available_blocks: Map<u64, u32>,
        seeds: Map<u64, u256>,
        game_overs: Map<u64, bool>,
        // Settings
        settings_count: u32,
        settings_data: Map<u32, (ByteArray, ByteArray, bool)>,
        // Objectives
        objective_count: u32,
        objective_data: Map<u32, (u32, bool)>,
    }

    // Events
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        MinigameEvent: MinigameComponent::Event,
        #[flat]
        ObjectivesEvent: ObjectivesComponent::Event,
        #[flat]
        SettingsEvent: SettingsComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    // ======================================================================
    // IMinigameTokenData — required by EGS
    // ======================================================================

    #[abi(embed_v0)]
    impl TokenDataImpl of IMinigameTokenData<ContractState> {
        fn score(self: @ContractState, token_id: u64) -> u32 {
            self.scores.entry(token_id).read()
        }

        fn game_over(self: @ContractState, token_id: u64) -> bool {
            self.game_overs.entry(token_id).read()
        }
    }

    // ======================================================================
    // IMinigameDetails — game metadata for token display
    // ======================================================================

    #[abi(embed_v0)]
    impl DetailsImpl of IMinigameDetails<ContractState> {
        fn token_name(self: @ContractState, token_id: u64) -> ByteArray {
            "Blokaz"
        }

        fn token_description(self: @ContractState, token_id: u64) -> ByteArray {
            let score = self.scores.entry(token_id).read();
            let placed = self.blocks_placed.entry(token_id).read();
            let is_over = self.game_overs.entry(token_id).read();
            let status: ByteArray = if is_over {
                "Game Over"
            } else {
                "Playing"
            };
            format!(
                "Blokaz - an onchain block puzzle. Score: {}, Blocks placed: {}, Status: {}",
                score,
                placed,
                status,
            )
        }

        fn game_details(self: @ContractState, token_id: u64) -> Span<GameDetail> {
            let score = self.scores.entry(token_id).read();
            let combo = self.combos.entry(token_id).read();
            let placed = self.blocks_placed.entry(token_id).read();
            let is_over = self.game_overs.entry(token_id).read();

            array![
                GameDetail { name: "Score", value: format!("{}", score) },
                GameDetail { name: "Combo", value: format!("{}", combo) },
                GameDetail { name: "Blocks Placed", value: format!("{}", placed) },
                {
                    let status_value: ByteArray = if is_over {
                        "Game Over"
                    } else {
                        "Playing"
                    };
                    GameDetail { name: "Status", value: status_value }
                },
            ]
                .span()
        }
    }

    // ======================================================================
    // IMinigameSettings
    // ======================================================================

    #[abi(embed_v0)]
    impl GameSettingsImpl of IMinigameSettings<ContractState> {
        fn settings_exist(self: @ContractState, settings_id: u32) -> bool {
            let (_, _, exists) = self.settings_data.entry(settings_id).read();
            exists
        }
    }

    #[abi(embed_v0)]
    impl GameSettingsDetailsImpl of IMinigameSettingsDetails<ContractState> {
        fn settings_details(self: @ContractState, settings_id: u32) -> GameSettingDetails {
            let (name, description, _) = self.settings_data.entry(settings_id).read();
            GameSettingDetails {
                name,
                description,
                settings: array![GameSetting { name: "Mode", value: "Classic" }].span(),
            }
        }
    }

    // ======================================================================
    // IMinigameObjectives
    // ======================================================================

    #[abi(embed_v0)]
    impl GameObjectivesImpl of IMinigameObjectives<ContractState> {
        fn objective_exists(self: @ContractState, objective_id: u32) -> bool {
            let (_, exists) = self.objective_data.entry(objective_id).read();
            exists
        }

        fn completed_objective(self: @ContractState, token_id: u64, objective_id: u32) -> bool {
            let score = self.scores.entry(token_id).read();
            let combo = self.combos.entry(token_id).read();
            let is_over = self.game_overs.entry(token_id).read();

            if objective_id == 1 {
                // Score >= 100
                score >= 100
            } else if objective_id == 2 {
                // Combo >= 3
                combo >= 3
            } else if objective_id == 3 {
                // Complete a game
                is_over
            } else {
                false
            }
        }
    }

    #[abi(embed_v0)]
    impl GameObjectivesDetailsImpl of IMinigameObjectivesDetails<ContractState> {
        fn objectives_details(self: @ContractState, token_id: u64) -> Span<GameObjective> {
            let score = self.scores.entry(token_id).read();
            let combo = self.combos.entry(token_id).read();

            array![
                GameObjective { name: "Score", value: format!("{}", score) },
                GameObjective { name: "Max Combo", value: format!("{}", combo) },
            ]
                .span()
        }
    }

    // ======================================================================
    // IBlokaz — Game Logic
    // ======================================================================

    #[abi(embed_v0)]
    impl BlokazImpl of super::IBlokaz<ContractState> {
        fn start_game(ref self: ContractState, token_id: u64) {
            self.minigame.assert_token_ownership(token_id);
            self.minigame.pre_action(token_id);

            let mut seed: u256 = core::pedersen::pedersen(
                token_id.into(), get_block_timestamp().into(),
            )
                .into();

            let b1 = next_random(ref seed);
            let b2 = next_random(ref seed);
            let b3 = next_random(ref seed);

            self.grids.entry(token_id).write(0);
            self.scores.entry(token_id).write(0);
            self.combos.entry(token_id).write(0);
            self.blocks_placed.entry(token_id).write(0);
            self.available_blocks.entry(token_id).write(pack_blocks(b1, b2, b3));
            self.seeds.entry(token_id).write(seed);
            self.game_overs.entry(token_id).write(false);

            self.minigame.post_action(token_id);
        }

        fn place_block(ref self: ContractState, token_id: u64, piece_id: u8, x: u8, y: u8) {
            self.minigame.assert_token_ownership(token_id);
            self.minigame.pre_action(token_id);

            assert!(!self.game_overs.entry(token_id).read(), "Game is already over");

            // Hand management: validate piece is in hand
            let packed = self.available_blocks.entry(token_id).read();
            let (mut b1, mut b2, mut b3) = unpack_blocks(packed);
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
            assert!(found_in_hand, "Piece not in hand");

            // Placement
            let grid = self.grids.entry(token_id).read();
            let piece = get_piece(piece_id);
            assert!(can_place(grid, piece, x, y), "Invalid placement");

            let (new_grid, lines_cleared) = place_piece(grid, piece, x, y);
            self.grids.entry(token_id).write(new_grid);

            let mut placed = self.blocks_placed.entry(token_id).read();
            placed += 1;
            self.blocks_placed.entry(token_id).write(placed);

            // Scoring & combos
            let mut current_combo = self.combos.entry(token_id).read();
            if lines_cleared > 0 {
                current_combo += 1;
            } else {
                current_combo = 0;
            }
            self.combos.entry(token_id).write(current_combo);

            let piece_score = piece.width * piece.height;
            let combo_multiplier = if current_combo > 0 {
                current_combo
            } else {
                1
            };
            let line_score = lines_cleared * 10 * combo_multiplier;
            let mut score = self.scores.entry(token_id).read();
            score += piece_score.into() + line_score.into();
            self.scores.entry(token_id).write(score);

            // Refill hand if all used
            let mut seed = self.seeds.entry(token_id).read();
            if b1 == 255 && b2 == 255 && b3 == 255 {
                b1 = next_random(ref seed);
                b2 = next_random(ref seed);
                b3 = next_random(ref seed);
                self.seeds.entry(token_id).write(seed);
            }

            self.available_blocks.entry(token_id).write(pack_blocks(b1, b2, b3));

            // Game over detection
            let mut any_valid = false;
            if b1 != 255 && has_valid_move(new_grid, get_piece(b1)) {
                any_valid = true;
            }
            if !any_valid && b2 != 255 && has_valid_move(new_grid, get_piece(b2)) {
                any_valid = true;
            }
            if !any_valid && b3 != 255 && has_valid_move(new_grid, get_piece(b3)) {
                any_valid = true;
            }

            if !any_valid {
                self.game_overs.entry(token_id).write(true);
            }

            self.minigame.post_action(token_id);
        }

        fn delete_block(ref self: ContractState, token_id: u64, x: u8, y: u8) {
            self.minigame.assert_token_ownership(token_id);
            self.minigame.pre_action(token_id);

            assert!(!self.game_overs.entry(token_id).read(), "Game is already over");
            assert!(x < 9 && y < 9, "Out of bounds");

            let grid = self.grids.entry(token_id).read();
            let mask = blokaz::grid::pow2_128(y * 9 + x);
            assert!((grid & mask) == mask, "Block does not exist");

            self.grids.entry(token_id).write(grid - mask);

            self.minigame.post_action(token_id);
        }

        fn grid(self: @ContractState, token_id: u64) -> u128 {
            self.grids.entry(token_id).read()
        }

        fn combo(self: @ContractState, token_id: u64) -> u8 {
            self.combos.entry(token_id).read()
        }

        fn blocks_placed(self: @ContractState, token_id: u64) -> u8 {
            self.blocks_placed.entry(token_id).read()
        }

        fn available_blocks(self: @ContractState, token_id: u64) -> u32 {
            self.available_blocks.entry(token_id).read()
        }

        fn seed(self: @ContractState, token_id: u64) -> u256 {
            self.seeds.entry(token_id).read()
        }
    }

    // ======================================================================
    // Initializer
    // ======================================================================

    #[abi(embed_v0)]
    impl BlokazInitImpl of super::IBlokazInit<ContractState> {
        fn initializer(
            ref self: ContractState,
            game_creator: ContractAddress,
            game_name: ByteArray,
            game_description: ByteArray,
            game_developer: ByteArray,
            game_publisher: ByteArray,
            game_genre: ByteArray,
            game_image: ByteArray,
            game_color: Option<ByteArray>,
            client_url: Option<ByteArray>,
            renderer_address: Option<ContractAddress>,
            settings_address: Option<ContractAddress>,
            objectives_address: Option<ContractAddress>,
            minigame_token_address: ContractAddress,
        ) {
            let settings_addr = match settings_address {
                Option::Some(addr) => {
                    self.settings.initializer();
                    Option::Some(addr)
                },
                Option::None => {
                    self.settings.initializer();
                    Option::Some(get_contract_address())
                },
            };

            let objectives_addr = match objectives_address {
                Option::Some(addr) => {
                    self.objectives.initializer();
                    Option::Some(addr)
                },
                Option::None => {
                    self.objectives.initializer();
                    Option::Some(get_contract_address())
                },
            };

            self
                .minigame
                .initializer(
                    game_creator,
                    game_name,
                    game_description,
                    game_developer,
                    game_publisher,
                    game_genre,
                    game_image,
                    game_color,
                    client_url,
                    renderer_address,
                    settings_addr,
                    objectives_addr,
                    minigame_token_address,
                );

            // Default settings: Classic mode
            self.settings_data.entry(1).write(("Classic", "Standard 9x9 block puzzle", true));
            self.settings_count.write(1);

            // Default objectives
            self.objective_data.entry(1).write((100, true)); // Score >= 100
            self.objective_count.write(3);
            self.objective_data.entry(2).write((3, true)); // Combo >= 3
            self.objective_data.entry(3).write((1, true)); // Complete a game

            self
                .objectives
                .create_objective(
                    1, "Score 100", "Reach a score of 100 points", minigame_token_address,
                );
            self
                .objectives
                .create_objective(
                    2, "Combo Master", "Achieve a combo of 3 or more", minigame_token_address,
                );
            self
                .objectives
                .create_objective(
                    3, "First Game", "Complete your first game", minigame_token_address,
                );

            self
                .settings
                .create_settings(
                    get_contract_address(),
                    1,
                    "Classic",
                    "Standard 9x9 block puzzle",
                    array![GameSetting { name: "Grid Size", value: "9x9" }].span(),
                    minigame_token_address,
                );
        }
    }
}
