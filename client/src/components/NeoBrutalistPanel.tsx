import React from 'react';

interface NeoPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  glowColor?: 'cyan' | 'orange' | 'magenta';
}

const colorMap = {
  cyan: 'text-neon-cyan shadow-[0_0_10px_rgba(0,245,255,0.2)] border-[var(--color-neon-cyan)]/30',
  orange: 'text-neon-orange shadow-[0_0_10px_rgba(255,122,0,0.2)] border-[var(--color-neon-orange)]/30',
  magenta: 'text-neon-magenta shadow-[0_0_10px_rgba(255,43,214,0.2)] border-[var(--color-neon-magenta)]/30'
};

export function NeoBrutalistPanel({ 
  children, 
  title, 
  glowColor = 'cyan', 
  className = '', 
  ...props 
}: NeoPanelProps) {
  const customGlow = colorMap[glowColor];

  return (
    <div className={`neo-panel p-6 flex flex-col ${customGlow} ${className}`} {...props}>
      {title && (
        <h2 className={`font-['Press_Start_2P'] text-sm tracking-widest mb-6 ${colorMap[glowColor].split(' ')[0]}`}>
          {title}
        </h2>
      )}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
