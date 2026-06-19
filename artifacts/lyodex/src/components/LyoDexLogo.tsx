interface LyoDexLogoProps {
  size?: number;
  className?: string;
}

export function LyoDexLogo({ size = 32, className = "" }: LyoDexLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LyoDex logo"
    >
      <circle cx="16" cy="16" r="15" fill="#0F6E56" />
      <circle cx="16" cy="16" r="15" fill="none" stroke="#0D5E48" strokeWidth="1" />
      <text
        x="10"
        y="22"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="17"
        fontWeight="700"
        fill="white"
        letterSpacing="-0.5"
      >
        L
      </text>
    </svg>
  );
}
