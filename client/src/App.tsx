import { useEffect, useState } from 'react';
import { useAccount, useConnect } from '@starknet-react/core';
import { ControllerConnector } from '@cartridge/connector';
import { PlayerStats } from './components/PlayerStats';
import { WalletConnect } from './components/WalletConnect';
import { NextBlocks } from './components/NextBlocks';
import { Leaderboard } from './components/Leaderboard';
import { GameBoard } from './components/GameBoard';
import { GameOverOverlay } from './components/GameOverOverlay';
import { useGameActions } from './hooks/useGameActions';
import { GameActionsContext } from './contexts/GameActionsContext';
import { useGameStore } from './store/gameStore';
import { Zap, Target, Sparkles, Trophy } from 'lucide-react';

function App() {
  const { address } = useAccount();
  const gameActions = useGameActions();
  const {
    tokenId,
    gamePhase,
    pendingMessage,
    error,
    playerTokens,
    isLoadingTokens,
    handleResumeGame,
    handleMintToken,
  } = gameActions;

  const { connectors } = useConnect();
  const controller = connectors[0] as ControllerConnector;
  const [username, setUsername] = useState<string>();

  useEffect(() => {
    if (!address) return;
    controller.username()?.then(setUsername);
  }, [address, controller]);

  const setGamePhase = useGameStore((s) => s.setGamePhase);

  // Watch wallet connection
  useEffect(() => {
    if (address && gamePhase === 'DISCONNECTED') {
      setGamePhase('LOADING');
    } else if (!address && gamePhase !== 'DISCONNECTED') {
      setGamePhase('DISCONNECTED');
    }
  }, [address, gamePhase, setGamePhase]);

  // Watch token loading completion
  useEffect(() => {
    if (!isLoadingTokens && gamePhase === 'LOADING') {
      setGamePhase('IDLE');
    }
  }, [isLoadingTokens, gamePhase, setGamePhase]);

  // Find a playable (non-game-over) token whose start time has passed
  const now = Math.floor(Date.now() / 1000);
  const activeToken = playerTokens.find(t => {
    if (!t.isPlayable || t.gameOver) return false;
    const mintedAtSec = Math.floor(new Date(t.mintedAt).getTime() / 1000);
    const startTime = mintedAtSec + (t.startDelay ?? 0);
    return startTime <= now;
  });

  // CTA button config driven by gamePhase
  const getCTA = () => {
    switch (gamePhase) {
      case 'DISCONNECTED':
        return null; // show text instead
      case 'LOADING':
        return { label: 'LOADING...', disabled: true, action: () => {} };
      case 'MINTING':
        return { label: 'MINTING...', disabled: true, action: () => {} };
      case 'AWAITING_MINT':
        return { label: 'CONFIRMING...', disabled: true, action: () => {} };
      case 'STARTING':
        return { label: 'STARTING...', disabled: true, action: () => {} };
      case 'IDLE':
        if (activeToken) {
          // Resume existing game — don't call start_game which resets the board
          return { label: 'CONTINUE', disabled: false, action: () => handleResumeGame(activeToken.tokenId) };
        }
        return { label: 'MINT & PLAY', disabled: false, action: () => handleMintToken(username || 'Player') };
      case 'PLAYING':
      case 'PLACING':
      case 'GAME_OVER':
        return null; // hide CTA
    }
  };

  const cta = getCTA();
  const showBoard = gamePhase === 'PLAYING' || gamePhase === 'PLACING' || gamePhase === 'GAME_OVER';

  return (
    <GameActionsContext.Provider value={gameActions}>
      <div className="min-h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Rajdhani', system-ui" }}>

        {/* Ambient glow blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(255,140,0,0.08) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(0,245,255,0.08) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '50%', transform: 'translateX(-50%)', width: '60%', height: '40%', background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)' }} />
        </div>

        {/* Top banner — arcade marquee style */}
        <div className="relative z-10" style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,140,0,0.06) 15%, rgba(255,140,0,0.22) 40%, rgba(255,140,0,0.22) 60%, rgba(255,140,0,0.06) 85%, transparent)',
          borderBottom: '1px solid rgba(255,140,0,0.45)',
          borderTop: '1px solid rgba(255,140,0,0.12)',
          padding: '6px 0 5px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
            {/* left wing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '60px', height: '1px', background: 'linear-gradient(90deg, transparent, #FF8C00)' }} />
              <span style={{ color: '#FF8C00', fontSize: '8px', letterSpacing: '2px', opacity: 0.55 }}>◆◆◆</span>
            </div>
            <Zap size={16} color="#FF8C00" style={{ filter: 'drop-shadow(0 0 6px #FF8C00)', flexShrink: 0 }} />
            <span style={{
              fontFamily: "'Press Start 2P', system-ui",
              fontSize: '11px',
              letterSpacing: '0.35em',
              color: '#FF8C00',
              textShadow: '0 0 12px rgba(255,140,0,1), 0 0 28px rgba(255,140,0,0.7), 0 0 55px rgba(255,140,0,0.35)',
              textTransform: 'uppercase',
            }}>
              Onchain Puzzle Battle
            </span>
            <Zap size={16} color="#FF8C00" style={{ filter: 'drop-shadow(0 0 6px #FF8C00)', flexShrink: 0 }} />
            {/* right wing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#FF8C00', fontSize: '8px', letterSpacing: '2px', opacity: 0.55 }}>◆◆◆</span>
              <div style={{ width: '60px', height: '1px', background: 'linear-gradient(90deg, #FF8C00, transparent)' }} />
            </div>
          </div>
        </div>

        {/* Header: Logo centred + wallet right */}
        <header className="relative z-10 px-6 pt-3 pb-2" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
          <div />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src="/blockaz-logo.png"
              alt="Blockaz"
              style={{
                height: '56px',
                objectFit: 'contain',
              }}
              onError={e => {
                const parent = (e.target as HTMLImageElement).parentElement!;
                parent.innerHTML = `<h1 style="font-family:'Press Start 2P',system-ui;font-size:32px;color:#00F5FF;text-shadow:0 0 20px rgba(0,245,255,0.9);margin:0;line-height:1">BLOCKAZ</h1>`;
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <WalletConnect />
          </div>
        </header>

        {/* Main game layout */}
        <main
          className="relative z-10 flex-1 px-4 pb-4"
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr 220px',
            gap: '12px',
            maxWidth: '1100px',
            margin: '0 auto',
            width: '100%',
            alignItems: 'start',
          }}
        >

          {/* LEFT COLUMN: Stats + Daily Challenge */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PlayerStats />

            <div className="arcade-panel panel-gold" style={{ padding: '12px' }}>
              <div className="panel-label" style={{ margin: '-12px -12px 10px', borderRadius: '4px 4px 0 0' }}>
                <Target size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} /> Daily Tournament
              </div>
              <p style={{ color: '#8b95b8', fontSize: '13px', lineHeight: 1.6, margin: '0 0 10px', fontFamily: 'Rajdhani', fontWeight: 500 }}>
                Clear 50 lines for on-chain rewards!
              </p>
              <button style={{
                width: '100%', padding: '8px',
                background: 'linear-gradient(135deg, #FF8C00, #FF6600)',
                border: '1px solid rgba(255,140,0,0.5)', borderRadius: '4px',
                color: '#000', fontFamily: "'Rajdhani', system-ui", fontWeight: 900,
                fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase',
                cursor: 'pointer', boxShadow: '0 0 15px rgba(255,140,0,0.4)',
              }}>
                ENTER NOW
              </button>
            </div>
          </div>

          {/* CENTER COLUMN: Board + Next Blocks + CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>

            {/* Board with game-over overlay */}
            <div className="arcade-panel scanlines corner-brackets" style={{
              padding: '8px',
              border: '2px solid #3a4060',
              boxShadow: '0 0 0 1px #0d1020, 0 0 30px rgba(0,245,255,0.1), inset 0 0 30px rgba(0,0,0,0.5)',
              width: '100%',
              position: 'relative',
            }}>
              <GameBoard />
              {gamePhase === 'GAME_OVER' && <GameOverOverlay />}
            </div>

            {/* Next Blocks */}
            <div className="arcade-panel panel-magenta" style={{ width: '100%', overflow: 'hidden' }}>
              <div className="panel-label" style={{ borderRadius: '4px 4px 0 0' }}>
                <Sparkles size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} /> Next Blocks
              </div>
              <div style={{ padding: '10px' }}>
                <NextBlocks layout="horizontal" />
              </div>
            </div>

            {/* CTA + Status */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              {gamePhase === 'DISCONNECTED' ? (
                <p style={{ fontSize: '13px', color: '#6b7494', fontFamily: 'Rajdhani', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Connect wallet to play onchain
                </p>
              ) : cta ? (
                <button
                  className="btn-glow"
                  style={{ padding: '14px 48px', fontSize: '14px', opacity: cta.disabled ? 0.6 : 1 }}
                  onClick={cta.action}
                  disabled={cta.disabled}
                >
                  {cta.label}
                </button>
              ) : null}

              {/* Error */}
              {error && (
                <span style={{ fontSize: '12px', color: '#ff6666', fontFamily: 'Rajdhani', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {error}
                </span>
              )}

              {/* Pending message */}
              {pendingMessage && !error && (
                <span style={{ fontSize: '12px', color: '#00F5FF', letterSpacing: '0.1em', fontFamily: 'Rajdhani', fontWeight: 600, textShadow: '0 0 8px rgba(0,245,255,0.6)' }}>
                  {pendingMessage}
                </span>
              )}

              {/* Onchain status badge */}
              {showBoard && tokenId !== null && !pendingMessage && (
                <span style={{ fontSize: '11px', color: '#39FF14', letterSpacing: '0.15em', textShadow: '0 0 8px rgba(57,255,20,0.6)', fontFamily: 'Rajdhani', fontWeight: 600 }}>
                  ONCHAIN · TOKEN {tokenId.slice(0, 8)}...{tokenId.slice(-4)}
                </span>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Leaderboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="arcade-panel panel-gold" style={{ overflow: 'hidden' }}>
              <div className="panel-label" style={{ borderRadius: '4px 4px 0 0' }}>
                <Trophy size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} /> Top 5 Leaderboard
              </div>
              <div style={{ padding: '10px' }}>
                <Leaderboard />
              </div>
            </div>
          </div>

        </main>
      </div>
    </GameActionsContext.Provider>
  );
}

export default App;
