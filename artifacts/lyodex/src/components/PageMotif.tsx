/**
 * Subject-matter background motifs.
 *
 * These are original vector drawings, not photographs. That is deliberate:
 * product photos of real freeze-dryers and vacuum pumps belong to their
 * manufacturers, and a platform whose entire positioning is trust cannot open
 * with someone else's copyrighted images. Line-art also survives being tinted
 * to 4% opacity, which a photograph does not.
 *
 * Each motif is drawn from the equipment it refers to — a chamber with shelves,
 * a two-stage vacuum pump, a condenser coil — so the page reads as being about
 * something, without competing with the content in front of it.
 *
 * `currentColor` throughout, so the motif inherits the section's text colour and
 * works on both the light background and the dark navy hero without a second
 * asset.
 */

type MotifKind =
  | "chamber"      // freeze-dryer: chamber + shelf stack
  | "pump"         // vacuum pump
  | "condenser"    // condenser coil
  | "grid"         // data / market intelligence
  | "cycle";       // seasonality: annual curve

export function PageMotif({
  kind,
  className = "",
  opacity = 0.05,
}: {
  kind: MotifKind;
  className?: string;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ opacity }}
    >
      {MOTIFS[kind]}
    </div>
  );
}

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const MOTIFS: Record<MotifKind, React.ReactElement> = {
  // Freeze-dryer chamber: cylindrical vessel, shelf stack, sight glass, ports.
  chamber: (
    <svg viewBox="0 0 400 300" className="absolute -right-8 top-1/2 -translate-y-1/2 h-[130%] w-auto" xmlns="http://www.w3.org/2000/svg">
      <g {...strokeProps}>
        <rect x="90" y="60" width="200" height="180" rx="14" />
        <rect x="106" y="76" width="168" height="148" rx="8" strokeDasharray="4 5" />
        {[104, 134, 164, 194].map(y => (
          <g key={y}>
            <line x1="118" y1={y} x2="262" y2={y} />
            <line x1="118" y1={y + 5} x2="262" y2={y + 5} strokeWidth={0.75} />
          </g>
        ))}
        <circle cx="190" cy="48" r="9" />
        <line x1="190" y1="57" x2="190" y2="60" />
        <line x1="90" y1="120" x2="52" y2="120" />
        <line x1="90" y1="180" x2="52" y2="180" />
        <circle cx="46" cy="120" r="6" />
        <circle cx="46" cy="180" r="6" />
        <line x1="290" y1="150" x2="330" y2="150" />
        <rect x="330" y="132" width="34" height="36" rx="5" />
        <line x1="120" y1="240" x2="120" y2="262" />
        <line x1="260" y1="240" x2="260" y2="262" />
      </g>
    </svg>
  ),

  // Rotary vane vacuum pump: body, motor, inlet, exhaust, gauge.
  pump: (
    <svg viewBox="0 0 400 300" className="absolute -right-6 top-1/2 -translate-y-1/2 h-[125%] w-auto" xmlns="http://www.w3.org/2000/svg">
      <g {...strokeProps}>
        <rect x="120" y="130" width="150" height="90" rx="12" />
        <circle cx="195" cy="175" r="30" />
        <circle cx="195" cy="175" r="13" />
        <line x1="195" y1="145" x2="195" y2="162" />
        <line x1="217" y1="197" x2="205" y2="185" />
        <rect x="270" y="145" width="62" height="60" rx="10" />
        {[158, 170, 182, 194].map(y => (
          <line key={y} x1="278" y1={y} x2="324" y2={y} strokeWidth={0.75} />
        ))}
        <line x1="150" y1="130" x2="150" y2="96" />
        <path d="M150 96 h-38 a10 10 0 0 1 -10 -10 v-18" />
        <circle cx="102" cy="60" r="12" />
        <line x1="102" y1="54" x2="102" y2="60" />
        <line x1="240" y1="130" x2="240" y2="104" />
        <rect x="228" y="86" width="24" height="18" rx="4" />
        <line x1="130" y1="220" x2="130" y2="238" />
        <line x1="260" y1="220" x2="260" y2="238" />
        <line x1="112" y1="238" x2="278" y2="238" />
      </g>
    </svg>
  ),

  // Condenser: coil pack in a housing with inlet and outlet.
  condenser: (
    <svg viewBox="0 0 400 300" className="absolute -right-8 top-1/2 -translate-y-1/2 h-[125%] w-auto" xmlns="http://www.w3.org/2000/svg">
      <g {...strokeProps}>
        <rect x="110" y="70" width="180" height="160" rx="12" />
        {[0, 1, 2, 3, 4].map(i => (
          <path
            key={i}
            d={`M132 ${96 + i * 28} h60 a14 14 0 0 1 0 28 h-60 a14 14 0 0 0 0 28 h136`}
            strokeWidth={1.25}
          />
        ))}
        <line x1="110" y1="96" x2="72" y2="96" />
        <circle cx="66" cy="96" r="6" />
        <line x1="290" y1="208" x2="330" y2="208" />
        <circle cx="336" cy="208" r="6" />
      </g>
    </svg>
  ),

  // Data grid with a plotted series — for market intelligence.
  grid: (
    <svg viewBox="0 0 400 300" className="absolute right-0 top-0 h-full w-auto" xmlns="http://www.w3.org/2000/svg">
      <g {...strokeProps} strokeWidth={0.75}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <line key={`v${i}`} x1={60 + i * 50} y1="40" x2={60 + i * 50} y2="250" />
        ))}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <line key={`h${i}`} x1="60" y1={40 + i * 42} x2="360" y2={40 + i * 42} />
        ))}
      </g>
      <g {...strokeProps} strokeWidth={2}>
        <polyline points="60,205 110,180 160,190 210,140 260,120 310,132 360,88" />
      </g>
      <g fill="currentColor">
        {[[60, 205], [110, 180], [160, 190], [210, 140], [260, 120], [310, 132], [360, 88]].map(([x, y]) => (
          <circle key={`${x}`} cx={x} cy={y} r="3.5" />
        ))}
      </g>
    </svg>
  ),

  // Annual demand curve — for the seasonality page.
  cycle: (
    <svg viewBox="0 0 400 300" className="absolute right-0 top-0 h-full w-auto" xmlns="http://www.w3.org/2000/svg">
      <g {...strokeProps} strokeWidth={0.75}>
        <line x1="40" y1="240" x2="376" y2="240" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1={54 + i * 28} y1="240" x2={54 + i * 28} y2="246" />
        ))}
      </g>
      <g {...strokeProps} strokeWidth={2}>
        <path d="M54 200 C 110 196, 130 120, 166 96 S 240 92, 278 150 S 340 214, 362 222" />
      </g>
      <g {...strokeProps} strokeWidth={1} strokeDasharray="3 4">
        <line x1="166" y1="96" x2="166" y2="240" />
        <line x1="278" y1="150" x2="278" y2="240" />
      </g>
    </svg>
  ),
};
