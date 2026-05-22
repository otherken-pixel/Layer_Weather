interface Props {
  size?: number;
  hideText?: boolean;
}

export default function Logo({ size = 32, hideText = false }: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="20" cy="20" r="20" fill="rgba(108,99,255,0.25)" />
        {/* Sun rays */}
        <circle cx="20" cy="20" r="7" fill="#6C63FF" />
        <line x1="20" y1="4" x2="20" y2="8" stroke="#9D97FF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20" y1="32" x2="20" y2="36" stroke="#9D97FF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="4" y1="20" x2="8" y2="20" stroke="#9D97FF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="20" x2="36" y2="20" stroke="#9D97FF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8.7" y1="8.7" x2="11.5" y2="11.5" stroke="#9D97FF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="28.5" y1="28.5" x2="31.3" y2="31.3" stroke="#9D97FF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="31.3" y1="8.7" x2="28.5" y2="11.5" stroke="#9D97FF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="11.5" y1="28.5" x2="8.7" y2="31.3" stroke="#9D97FF" strokeWidth="2.5" strokeLinecap="round" />
        {/* Hanger/hook – the "wear" symbol */}
        <path d="M15,27 L20,22 L25,27" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      {!hideText && (
        <span
          style={{
            fontSize: size * 0.65,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.025em",
            lineHeight: 1,
          }}
        >
          WearToday
        </span>
      )}
    </div>
  );
}
