'use client';

import { PartyLogo } from '@/lib/engine/types';

interface Props {
  name: PartyLogo;
  color: string;
  size?: number;
}

export function PartyLogoIcon({ name, color, size = 24 }: Props) {
  const s = size;
  const half = s / 2;

  const icons: Record<PartyLogo, React.ReactElement> = {
    eagle: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L8 6L4 5L6 9L3 12L7 13L6 17L10 15L12 19L14 15L18 17L17 13L21 12L18 9L20 5L16 6L12 2Z" fill={color} />
      </svg>
    ),
    rose: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="9" r="5" fill={color} opacity="0.8" />
        <circle cx="9" cy="11" r="3.5" fill={color} opacity="0.6" />
        <circle cx="15" cy="11" r="3.5" fill={color} opacity="0.6" />
        <path d="M12 14L11 22" stroke={color} strokeWidth="1.5" />
        <path d="M12 17L9 15" stroke={color} strokeWidth="1" />
        <path d="M12 19L15 17" stroke={color} strokeWidth="1" />
      </svg>
    ),
    star: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill={color} />
      </svg>
    ),
    tree: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L6 10H9L5 16H10L8 22H16L14 16H19L15 10H18L12 2Z" fill={color} />
      </svg>
    ),
    fist: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M7 20V14L5 12V8L7 6H9V4H11V6H13V4H15V6H17L19 8V12L17 14V20H7Z" fill={color} />
      </svg>
    ),
    dove: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M2 16L12 12L20 4C20 4 22 6 20 8L14 14L10 22L8 18L2 16Z" fill={color} />
        <path d="M12 12L8 10L4 12" stroke={color} strokeWidth="1.5" fill="none" />
      </svg>
    ),
    shield: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6V12C4 16.42 7.33 20.52 12 22C16.67 20.52 20 16.42 20 12V6L12 2Z" fill={color} />
      </svg>
    ),
    flame: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 2C12 2 8 8 8 13C8 15.21 9.79 17 12 17C14.21 17 16 15.21 16 13C16 8 12 2 12 2Z" fill={color} />
        <path d="M12 22C8 22 5 19 5 15C5 11 12 2 12 2C12 2 19 11 19 15C19 19 16 22 12 22Z" fill={color} opacity="0.5" />
      </svg>
    ),
    scales: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <line x1="12" y1="3" x2="12" y2="21" stroke={color} strokeWidth="2" />
        <line x1="4" y1="7" x2="20" y2="7" stroke={color} strokeWidth="2" />
        <path d="M4 7L2 14H8L6 7" fill={color} opacity="0.6" />
        <path d="M18 7L16 14H22L20 7" fill={color} opacity="0.6" />
        <line x1="8" y1="21" x2="16" y2="21" stroke={color} strokeWidth="2" />
      </svg>
    ),
    gear: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 8C9.79 8 8 9.79 8 12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12C16 9.79 14.21 8 12 8Z" fill={color} />
        <path d="M19.4 15C19.2 15.3 19.2 15.6 19.3 15.9L20.5 18.1L18.1 20.5L15.9 19.3C15.6 19.2 15.3 19.2 15 19.4C14.7 19.5 14.5 19.8 14.5 20.1V22H10V20.1C10 19.8 9.8 19.5 9.5 19.4C9.2 19.2 8.9 19.2 8.6 19.3L6.4 20.5L4 18.1L5.2 15.9C5.3 15.6 5.3 15.3 5.1 15C5 14.7 4.7 14.5 4.4 14.5H2V10H4.4C4.7 10 5 9.8 5.1 9.5C5.3 9.2 5.3 8.9 5.2 8.6L4 6.4L6.4 4L8.6 5.2C8.9 5.3 9.2 5.3 9.5 5.1C9.8 5 10 4.7 10 4.4V2H14V4.4C14 4.7 14.2 5 14.5 5.1C14.8 5.3 15.1 5.3 15.4 5.2L17.6 4L20 6.4L18.8 8.6C18.7 8.9 18.7 9.2 18.9 9.5C19 9.8 19.3 10 19.6 10H22V14H19.6C19.3 14 19 14.2 19.4 15Z" fill={color} opacity="0.5" />
      </svg>
    ),
    wheat: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 22V8" stroke={color} strokeWidth="2" />
        <ellipse cx="9" cy="6" rx="2" ry="4" fill={color} transform="rotate(-20 9 6)" />
        <ellipse cx="15" cy="6" rx="2" ry="4" fill={color} transform="rotate(20 15 6)" />
        <ellipse cx="8" cy="11" rx="1.5" ry="3" fill={color} transform="rotate(-25 8 11)" />
        <ellipse cx="16" cy="11" rx="1.5" ry="3" fill={color} transform="rotate(25 16 11)" />
        <ellipse cx="9" cy="15" rx="1.5" ry="2.5" fill={color} transform="rotate(-20 9 15)" />
        <ellipse cx="15" cy="15" rx="1.5" ry="2.5" fill={color} transform="rotate(20 15 15)" />
      </svg>
    ),
    sun: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="5" fill={color} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
          <line
            key={angle}
            x1={12 + 7 * Math.cos(angle * Math.PI / 180)}
            y1={12 + 7 * Math.sin(angle * Math.PI / 180)}
            x2={12 + 10 * Math.cos(angle * Math.PI / 180)}
            y2={12 + 10 * Math.sin(angle * Math.PI / 180)}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}
      </svg>
    ),
  };

  return icons[name] || icons.star;
}
