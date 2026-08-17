const STREAK_CELLS = [
  0.15, 0.15, 0.3, 0.15, 0.3, 0.45, 0.3,
  0.15, 0.3, 0.45, 0.6, 0.45, 0.6, 0.75,
  0.3, 0.45, 0.6, 0.75, 0.9, 1, 1,
];

export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 440 340"
      className="w-full max-w-md"
      role="img"
      aria-label="A goal card showing a 21-day streak grid and a 12-day streak badge"
    >
      <defs>
        <linearGradient id="hero-badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d5ef8" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
        <filter id="hero-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#000000" floodOpacity="0.12" />
        </filter>
        <filter id="hero-shadow-sm" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Back card, peeking out for depth */}
      <rect
        x={44}
        y={54}
        width={300}
        height={210}
        rx={20}
        fill="var(--muted)"
        transform="rotate(-5 194 159)"
      />

      {/* Front card */}
      <g filter="url(#hero-shadow)">
        <rect x={58} y={58} width={300} height={220} rx={20} fill="var(--card)" stroke="var(--border)" />
      </g>

      {/* Title + type chip */}
      <rect x={88} y={88} width={128} height={12} rx={6} fill="var(--foreground)" opacity={0.82} />
      <rect x={270} y={84} width={58} height={20} rx={10} fill="var(--secondary)" />
      <rect x={280} y={91} width={38} height={6} rx={3} fill="var(--secondary-foreground)" opacity={0.6} />

      {/* Streak grid (21 days, most recent bottom-right getting hotter) */}
      {STREAK_CELLS.map((intensity, i) => {
        const col = i % 7;
        const row = Math.floor(i / 7);
        return (
          <rect
            key={i}
            x={88 + col * 24}
            y={128 + row * 24}
            width={18}
            height={18}
            rx={5}
            fill="var(--primary)"
            opacity={intensity}
          />
        );
      })}

      <rect x={88} y={230} width={100} height={9} rx={4.5} fill="var(--muted-foreground)" opacity={0.45} />

      {/* Floating checkmark chip */}
      <g filter="url(#hero-shadow-sm)" transform="rotate(-8 96 268)">
        <circle cx={96} cy={268} r={24} fill="var(--card)" stroke="var(--border)" />
        <path
          d="M87 268l6 6 12-13"
          fill="none"
          stroke="var(--primary)"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Floating streak badge */}
      <g filter="url(#hero-shadow)">
        <circle cx={366} cy={82} r={46} fill="url(#hero-badge)" />
      </g>
      <g transform="translate(354 48) scale(1.4)" fill="#ffffff">
        <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03z" />
      </g>
      <text
        x={366}
        y={100}
        textAnchor="middle"
        fontFamily="var(--font-heading)"
        fontWeight={700}
        fontSize={20}
        fill="#ffffff"
      >
        12
      </text>
      <text
        x={366}
        y={113}
        textAnchor="middle"
        fontFamily="var(--font-sans)"
        fontSize={7.5}
        fill="#ffffff"
        opacity={0.85}
      >
        DAY STREAK
      </text>
    </svg>
  );
}
