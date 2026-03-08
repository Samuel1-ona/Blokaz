# Blokaz

**A fully onchain block puzzle game on Starknet, built with the Embeddable Game Standard (EGS).**

Every move, every score, every game — provably onchain. No backend. No trust assumptions.

---

## What is Blokaz?

Blokaz is a Block Blast-style puzzle game where players place pieces on a 9x9 grid, clear rows and columns, chain combos, and compete for the highest score — all executed as Starknet transactions.

Players mint a game token (NFT) to start playing. The token holds their entire game state onchain: the board, score, combo streak, and available pieces. When the game ends, the score lives permanently on the token — a provable, composable achievement.

## How It Works

1. **Connect** your wallet (Cartridge Controller)
2. **Mint** a game token (ERC-721 via Denshokan)
3. **Play** — drag and drop blocks onto the 9x9 grid
4. **Clear** full rows or columns to score points and build combos
5. **Compete** on the live leaderboard

## Architecture

```
┌─────────────┐       tx        ┌──────────────────┐
│  React App  │ ──────────────> │  Blokaz Contract  │  (Cairo, Starknet)
│  (Vite)     │ <── callContract│  - 9x9 grid logic │
│             │                 │  - scoring/combos  │
│             │                 │  - game over check │
└──────┬──────┘                 └────────┬───────────┘
       │                                 │ post_action()
       │        ┌────────────────────────┘
       │        v
       │  ┌──────────────────┐
       └──│  Denshokan Token │  (EGS by Provable Games)
          │  - mint/own NFTs │
          │  - leaderboard   │
          │  - score indexing │
          └──────────────────┘
```

**Contract** — Pure Starknet contract (not Dojo ECS). All game state stored as `Map<felt252, T>` keyed by token ID. The 9x9 board is a `u128` bitmask for gas-efficient storage and line-clearing logic.

**Client** — React 19 + Vite + TailwindCSS. Reads game state directly from the contract via RPC. Real-time leaderboard via WebSocket score updates.

**EGS Integration** — Implements the full Embeddable Game Standard: `IMinigameTokenData`, `IMinigameDetails`, `IMinigameSettings`, `IMinigameObjectives`. Each game token is a composable NFT that any EGS-compatible app can read and display.

## Game Mechanics

- **12 piece types** — dots, squares, horizontal bars, vertical bars, L-shapes
- **Hand of 3** — place all 3 to get a fresh hand
- **Line clearing** — complete any row or column to clear it
- **Combo system** — consecutive clears multiply your score (lines x 10 x combo)
- **Game over** — when no remaining piece fits on the board

## Tech Stack

| Layer | Tech |
|-------|------|
| Contract | Cairo (Starknet 2.13.1) |
| Game Standard | EGS v2.13.1 (Provable Games) |
| Token | Denshokan NFT (ERC-721) |
| Frontend | React 19, Vite, TailwindCSS |
| Wallet | Cartridge Controller |
| Network | Starknet Sepolia |

## Run Locally

```bash
# Contract
cd dojo-project && sozo build

# Client
cd client && pnpm install && pnpm dev
```

## Links

- **Live App** — [blokaz.vercel.app](https://blokaz.vercel.app)
- **Contract on Starkscan** — [0x020fe...bd720](https://sepolia.starkscan.co/contract/0x020fe9632d6fb839b877bf0899d61df0e160dd021caa81b9a2c36ebb8c9bd720)

## Team

Built at the hackathon by the Blokaz team.

---

*Every block you place is a transaction. Every score is provable. That's Blokaz.*
