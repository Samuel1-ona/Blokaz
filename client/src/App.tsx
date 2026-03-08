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
import { Zap, Target, Sparkles, Trophy, LayoutGrid, BarChart2, Users } from 'lucide-react';

// ── Mobile tab definition ────────────────────────────────────────────
type MobileTab = 'game' | 'stats' | 'tournament' | 'leaderboard';

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
  const [mobileTab, setMobileTab] = useState<MobileTab>('game');

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
      case 'DISCONNECTED': return null;
      case 'LOADING':      return { label: 'LOADING...',    disabled: true,  action: () => {} };
      case 'MINTING':      return { label: 'MINTING...',    disabled: true,  action: () => {} };
      case 'AWAITING_MINT':return { label: 'CONFIRMING...', disabled: true,  action: () => {} };
      case 'STARTING':     return { label: 'STARTING...',   disabled: true,  action: () => {} };
      case 'IDLE':
        if (activeToken) return { label: 'CONTINUE',   disabled: false, action: () => handleResumeGame(activeToken.tokenId) };
        return { label: 'MINT & PLAY', disabled: false, action: () => handleMintToken(username || 'Player') };
      case 'PLAYING':
      case 'PLACING':
      case 'GAME_OVER':
        return null;
    }
  };

  const cta = getCTA();
  const showBoard = gamePhase === 'PLAYING' || gamePhase === 'PLACING' || gamePhase === 'GAME_OVER';

  // ── CTA + status block (reused on both layouts) ──────────────────
  const CTABlock = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      {gamePhase === 'DISCONNECTED' ? (
        <p style={{ fontSize: '13px', color: '#6b7494', fontFamily: 'Rajdhani', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'center' }}>
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
      {error && (
        <span style={{ fontSize: '12px', color: '#ff6666', fontFamily: 'Rajdhani', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'center' }}>
          {error}
        </span>
      )}
      {pendingMessage && !error && (
        <span style={{ fontSize: '12px', color: '#00F5FF', letterSpacing: '0.1em', fontFamily: 'Rajdhani', fontWeight: 600, textShadow: '0 0 8px rgba(0,245,255,0.6)', textAlign: 'center' }}>
          {pendingMessage}
        </span>
      )}
      {showBoard && tokenId !== null && !pendingMessage && (
        <span style={{ fontSize: '11px', color: '#39FF14', letterSpacing: '0.15em', textShadow: '0 0 8px rgba(57,255,20,0.6)', fontFamily: 'Rajdhani', fontWeight: 600, textAlign: 'center' }}>
          ONCHAIN · TOKEN {tokenId.slice(0, 8)}...{tokenId.slice(-4)}
        </span>
      )}
    </div>
  );

  // ── Tournament card (reused on both layouts) ─────────────────────
  const TournamentCard = () => (
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
        fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase',
        cursor: 'pointer', boxShadow: '0 0 15px rgba(255,140,0,0.4)',
      }}>
        ENTER NOW
      </button>
    </div>
  );

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
        <div className="relative z-10 banner-marquee">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'nowrap', overflow: 'hidden' }}>
            <div className="banner-wing banner-wing-left">
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #FF8C00)', flex: 1 }} />
              <span style={{ color: '#FF8C00', fontSize: '7px', letterSpacing: '2px', opacity: 0.55, whiteSpace: 'nowrap' }}>◆◆◆</span>
            </div>
            <Zap size={14} color="#FF8C00" style={{ filter: 'drop-shadow(0 0 6px #FF8C00)', flexShrink: 0 }} />
            <span className="banner-title">
              Onchain Puzzle Battle
            </span>
            <Zap size={14} color="#FF8C00" style={{ filter: 'drop-shadow(0 0 6px #FF8C00)', flexShrink: 0 }} />
            <div className="banner-wing banner-wing-right">
              <span style={{ color: '#FF8C00', fontSize: '7px', letterSpacing: '2px', opacity: 0.55, whiteSpace: 'nowrap' }}>◆◆◆</span>
              <div style={{ height: '1px', background: 'linear-gradient(90deg, #FF8C00, transparent)', flex: 1 }} />
            </div>
          </div>
        </div>

        {/* Header: Logo + wallet */}
        <header className="relative z-10 px-4 pt-2 pb-1" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
          <div />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src="/blockaz-logo.png"
              alt="Blockaz"
              className="app-logo"
              onError={e => {
                const parent = (e.target as HTMLImageElement).parentElement!;
                parent.innerHTML = `<h1 style="font-family:'Press Start 2P',system-ui;font-size:22px;color:#00F5FF;text-shadow:0 0 20px rgba(0,245,255,0.9);margin:0;line-height:1">BLOCKAZ</h1>`;
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <WalletConnect />
          </div>
        </header>

        {/* ═══════════════ DESKTOP LAYOUT (≥768px) ═══════════════ */}
        <main className="desktop-layout relative z-10 flex-1 px-4 pb-4">

          {/* LEFT: Stats + Tournament */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PlayerStats />
            <TournamentCard />
          </div>

          {/* CENTER: Board + Next Blocks + CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
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

            <div className="arcade-panel panel-magenta" style={{ width: '100%', overflow: 'hidden' }}>
              <div className="panel-label" style={{ borderRadius: '4px 4px 0 0' }}>
                <Sparkles size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} /> Next Blocks
              </div>
              <div style={{ padding: '10px' }}>
                <NextBlocks layout="horizontal" />
              </div>
            </div>

            <CTABlock />
          </div>

          {/* RIGHT: Leaderboard */}
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

        {/* ═══════════════ MOBILE LAYOUT (<768px) ═══════════════ */}
        <main className="mobile-layout relative z-10 flex-1 px-3 pb-[72px]">

          {/* GAME TAB */}
          {mobileTab === 'game' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Board */}
              <div className="arcade-panel scanlines corner-brackets" style={{
                padding: '6px',
                border: '2px solid #3a4060',
                boxShadow: '0 0 0 1px #0d1020, 0 0 20px rgba(0,245,255,0.1), inset 0 0 20px rgba(0,0,0,0.5)',
                position: 'relative',
              }}>
                <GameBoard />
                {gamePhase === 'GAME_OVER' && <GameOverOverlay />}
              </div>

              {/* Next Blocks */}
              <div className="arcade-panel panel-magenta" style={{ overflow: 'hidden' }}>
                <div className="panel-label" style={{ borderRadius: '4px 4px 0 0' }}>
                  <Sparkles size={12} strokeWidth={2.5} style={{ flexShrink: 0 }} /> Next Blocks
                </div>
                <div style={{ padding: '8px' }}>
                  <NextBlocks layout="horizontal" />
                </div>
              </div>

              {/* CTA */}
              <CTABlock />
            </div>
          )}

          {/* STATS TAB */}
          {mobileTab === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
              <PlayerStats />
            </div>
          )}

          {/* TOURNAMENT TAB */}
          {mobileTab === 'tournament' && (
            <div style={{ paddingTop: '4px' }}>
              <TournamentCard />
            </div>
          )}

          {/* LEADERBOARD TAB */}
          {mobileTab === 'leaderboard' && (
            <div style={{ paddingTop: '4px' }}>
              <div className="arcade-panel panel-gold" style={{ overflow: 'hidden' }}>
                <div className="panel-label" style={{ borderRadius: '4px 4px 0 0' }}>
                  <Trophy size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} /> Top 5 Leaderboard
                </div>
                <div style={{ padding: '10px' }}>
                  <Leaderboard />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ═══════════════ MOBILE BOTTOM NAV ═══════════════ */}
        <nav className="mobile-bottom-nav">
          {([
            { id: 'game',         Icon: LayoutGrid, label: 'Game' },
            { id: 'stats',        Icon: BarChart2,  label: 'Stats' },
            { id: 'tournament',   Icon: Target,     label: 'Event' },
            { id: 'leaderboard',  Icon: Users,      label: 'Ranks' },
          ] as { id: MobileTab; Icon: React.FC<any>; label: string }[]).map(({ id, Icon, label }) => {
            const active = mobileTab === id;
            return (
              <button
                key={id}
                onClick={() => setMobileTab(id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  padding: '8px 0',
                  background: 'none',
                  border: 'none',
                  borderTop: active ? '2px solid #00F5FF' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  color={active ? '#00F5FF' : '#4a5270'}
                  style={{ filter: active ? 'drop-shadow(0 0 6px rgba(0,245,255,0.8))' : 'none', transition: 'all 0.15s' }}
                />
                <span style={{
                  fontFamily: 'Audiowide, system-ui',
                  fontSize: '8px',
                  letterSpacing: '0.05em',
                  color: active ? '#00F5FF' : '#4a5270',
                  textShadow: active ? '0 0 8px rgba(0,245,255,0.6)' : 'none',
                  transition: 'all 0.15s',
                }}>
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

      </div>
    </GameActionsContext.Provider>
  );
}

export default App;
