#[cfg(test)]
mod tests {
    use blokaz::models::{
        Game, m_DailyChallenge, m_Game, m_GameSettings, m_ObjectiveState, m_PlayerStats,
    };
    use blokaz::systems::actions::{IActionsDispatcher, IActionsDispatcherTrait, actions};
    use dojo::model::ModelStorage;
    use dojo::world::{WorldStorageTrait, world};
    use dojo_cairo_test::{
        ContractDef, ContractDefTrait, NamespaceDef, TestResource, WorldStorageTestTrait,
        spawn_test_world,
    };
    use starknet::ContractAddress;

    fn namespace_def() -> NamespaceDef {
        let ndef = NamespaceDef {
            namespace: "blokaz",
            resources: [
                TestResource::Model(m_Game::TEST_CLASS_HASH),
                TestResource::Model(m_GameSettings::TEST_CLASS_HASH),
                TestResource::Model(m_ObjectiveState::TEST_CLASS_HASH),
                TestResource::Model(m_PlayerStats::TEST_CLASS_HASH),
                TestResource::Model(m_DailyChallenge::TEST_CLASS_HASH),
                TestResource::Event(actions::e_GameStarted::TEST_CLASS_HASH),
                TestResource::Event(actions::e_BlockPlaced::TEST_CLASS_HASH),
                TestResource::Event(actions::e_BlockDeleted::TEST_CLASS_HASH),
                TestResource::Contract(actions::TEST_CLASS_HASH),
            ]
                .span(),
        };

        ndef
    }

    fn contract_defs() -> Span<ContractDef> {
        [
            ContractDefTrait::new(@"blokaz", @"actions")
                .with_writer_of([dojo::utils::bytearray_hash(@"blokaz")].span())
        ]
            .span()
    }

    #[test]
    fn test_world_start_game() {
        let caller: ContractAddress = 0.try_into().unwrap();
        let ndef = namespace_def();

        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        actions_system.start_game(1);

        // First game
        let game: Game = world.read_model(1_u64);

        assert(game.player == caller, 'wrong player');
        assert(game.score == 0, 'wrong score');
        assert(game.grid == 0, 'wrong grid');
        assert(game.available_blocks != 0, 'hand is empty');
        assert(game.blocks_placed == 0, 'wrong blocks placed');
    }

    #[test]
    fn test_place_block() {
        let _caller: ContractAddress = 0.try_into().unwrap();
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        actions_system.start_game(1);

        let game: Game = world.read_model(1_u64); // token_id = 1
        let (b1, b2, b3) = blokaz::utils::unpack_blocks(game.available_blocks);

        let mut x1: u8 = 0;
        let mut y1: u8 = 0;
        loop {
            if blokaz::grid::can_place(game.grid, blokaz::pieces::get_piece(b1), x1, y1) {
                actions_system.place_block(1_u64, b1, x1, y1);
                break;
            }
            y1 += 1;
            if y1 == 8 {
                y1 = 0;
                x1 += 1;
            }
            if x1 == 8 {
                break;
            }
        }

        let game1: Game = world.read_model(1_u64);
        assert(game1.grid != 0, 'grid should not be empty');
        assert(game1.score > 0, 'score should increase');
        assert(game1.blocks_placed == 1, 'blocks placed should be 1');

        // Verify piece was removed from hand (set to 255)
        let (b1_after, b2_after, b3_after) = blokaz::utils::unpack_blocks(game1.available_blocks);
        assert(b1_after == 255, 'first block not removed');
        assert(b2_after == b2, 'b2 changed');
        assert(b3_after == b3, 'b3 changed');

        let mut x2: u8 = 0;
        let mut y2: u8 = 0;
        loop {
            if blokaz::grid::can_place(game1.grid, blokaz::pieces::get_piece(b2), x2, y2) {
                actions_system.place_block(1_u64, b2, x2, y2);
                break;
            }
            y2 += 1;
            if y2 == 8 {
                y2 = 0;
                x2 += 1;
            }
            if x2 == 8 {
                break;
            }
        }

        let game2: Game = world.read_model(1_u64);
        assert(game2.blocks_placed == 2, 'blocks should be 2');
        assert(game2.score > game1.score, 'score increased again');
    }

    #[test]
    fn test_delete_block() {
        let _caller: ContractAddress = 0.try_into().unwrap();
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        actions_system.start_game(2);

        let game: Game = world.read_model(2_u64);
        let (b1, _, _) = blokaz::utils::unpack_blocks(game.available_blocks);

        // Place a block to have something on the grid
        let mut x1: u8 = 0;
        let mut y1: u8 = 0;
        loop {
            if blokaz::grid::can_place(game.grid, blokaz::pieces::get_piece(b1), x1, y1) {
                actions_system.place_block(2_u64, b1, x1, y1);
                break;
            }
            y1 += 1;
            if y1 == 8 {
                y1 = 0;
                x1 += 1;
            }
            if x1 == 8 {
                break;
            }
        }

        let game_after_place: Game = world.read_model(2_u64);
        assert(game_after_place.grid != 0, 'grid should not be empty');

        // Note: the piece placed determines which exact bits are set.
        // We know for sure that since it placed it successfully at x1, y1, that specific bit is set
        // (because all pieces have top-left bit as part of layout generally, though piece 0 is 1x1
        // anyway)
        // Let's iterate and find the first bit set just to be safe:
        let mut bit_x = 0;
        let mut bit_y = 0;
        let mut found = false;
        loop {
            let mask = blokaz::grid::pow2_128(bit_y * 9 + bit_x);
            if (game_after_place.grid & mask) == mask {
                found = true;
                break;
            }
            bit_x += 1;
            if bit_x == 9 {
                bit_x = 0;
                bit_y += 1;
            }
            if bit_y == 9 {
                break;
            }
        }
        assert(found, 'could not find set bit');

        // Delete the block
        actions_system.delete_block(2_u64, bit_x, bit_y);

        let game_after_delete: Game = world.read_model(2_u64);
        let mask = blokaz::grid::pow2_128(bit_y * 9 + bit_x);

        // Assert the bit was removed
        assert((game_after_delete.grid & mask) == 0, 'block not deleted');
    }
}
