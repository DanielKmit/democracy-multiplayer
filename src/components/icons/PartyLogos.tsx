'use client';

const LOGO_EMOJIS: Record<string, string> = {
  tree: '🌳',
  shield: '🛡️',
  fist: '✊',
  scale: '⚖️',
  star: '⭐',
  dove: '🕊️',
  lion: '🦁',
  eagle: '🦅',
  rose: '🌹',
  torch: '🔥',
  book: '📖',
  crown: '👑',
  hammer: '🔨',
  sun: '☀️',
};

interface PartyLogoIconProps {
  name: string;
  color?: string;
  size?: number;
}

export function PartyLogoIcon({ name, color, size = 24 }: PartyLogoIconProps) {
  const emoji = LOGO_EMOJIS[name] ?? '🏛️';
  return (
    <span
      style={{
        fontSize: size * 0.8,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        filter: color ? `drop-shadow(0 0 3px ${color}40)` : undefined,
      }}
    >
      {emoji}
    </span>
  );
}

export function getPartyLogo(logo: string): string {
  return LOGO_EMOJIS[logo] ?? '🏛️';
}
