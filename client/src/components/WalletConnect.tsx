import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { ControllerConnector } from "@cartridge/connector";
import { useEffect, useState } from "react";

export function WalletConnect() {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { address } = useAccount();
  const controller = connectors[0] as ControllerConnector;
  const [username, setUsername] = useState<string>();

  useEffect(() => {
    if (!address) return;
    controller.username()?.then(setUsername);
  }, [address, controller]);

  if (address) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: 'rgba(0,245,255,0.08)',
          border: '1px solid rgba(0,245,255,0.3)',
          borderRadius: '4px',
          boxShadow: 'inset 0 0 10px rgba(0,245,255,0.1)',
        }}>
          {username && (
            <span style={{
              fontFamily: "'Rajdhani', system-ui",
              fontWeight: 700,
              fontSize: '14px',
              color: '#00F5FF',
              textShadow: '0 0 8px rgba(0,245,255,0.6)',
              letterSpacing: '0.05em',
            }}>
              {username}
            </span>
          )}
          <span style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '10px',
            color: '#6b7494',
          }}>
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          style={{
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '4px',
            color: '#6b7494',
            fontFamily: "'Rajdhani', system-ui",
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.background = 'rgba(255,60,60,0.15)';
            (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,60,60,0.4)';
            (e.target as HTMLButtonElement).style.color = '#ff6666';
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
            (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
            (e.target as HTMLButtonElement).style.color = '#6b7494';
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: controller })}
      style={{
        position: 'relative',
        padding: '8px 20px',
        fontFamily: "'Audiowide', system-ui",
        fontWeight: 700,
        fontSize: '11px',
        letterSpacing: '0.15em',
        textTransform: 'uppercase' as const,
        color: '#000',
        background: 'linear-gradient(135deg, #FF2BD6, #a855f7)',
        border: '2px solid #FF2BD6',
        borderRadius: '4px',
        cursor: 'pointer',
        boxShadow: '0 0 15px rgba(255,43,214,0.4)',
        transition: 'all 0.15s',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        (e.target as HTMLButtonElement).style.boxShadow = '0 0 25px rgba(255,43,214,0.7)';
        (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
      }}
      onMouseLeave={e => {
        (e.target as HTMLButtonElement).style.boxShadow = '0 0 15px rgba(255,43,214,0.4)';
        (e.target as HTMLButtonElement).style.transform = 'scale(1)';
      }}
    >
      Connect Wallet
    </button>
  );
}
