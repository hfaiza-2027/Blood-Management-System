/** Abstract illustration of proximity matching — not a real map. */
export function NearbyMap() {
  const pins = [
    [120, 90, "O+"], [260, 70, "B+"], [300, 170, "O-"], [90, 200, "A+"], [210, 230, "O+"], [340, 250, "AB+"], [60, 110, "B+"],
  ] as const;
  return (
    <svg viewBox="0 0 400 300" className="h-auto w-full" role="img" aria-label="Illustration: donors shown as pins within a search radius around a hospital">
      <rect width="400" height="300" rx="10" fill="#F4F6F9" />
      {/* streets */}
      <g stroke="#E3E7ED" strokeWidth="10" fill="none" strokeLinecap="round">
        <path d="M0 150 C 120 130, 240 170, 400 140" />
        <path d="M200 0 C 190 100, 220 200, 205 300" />
        <path d="M30 0 L 120 300" />
        <path d="M400 60 L 250 300" />
      </g>
      <path d="M0 240 C 80 220, 150 270, 260 250 S 380 280, 400 270" stroke="#D8E6F6" strokeWidth="14" fill="none" />
      {/* radius */}
      <circle cx="205" cy="150" r="112" fill="#A51C30" fillOpacity="0.05" stroke="#A51C30" strokeOpacity="0.35" strokeDasharray="5 5" />
      <circle cx="205" cy="150" r="55" fill="#A51C30" fillOpacity="0.05" />
      {/* donors */}
      {pins.map(([x, y, g], i) => {
        const inside = Math.hypot(x - 205, y - 150) <= 112;
        return (
          <g key={i} opacity={inside ? 1 : 0.35}>
            <circle cx={x} cy={y} r="13" fill={inside ? "#16233A" : "#A5B0C2"} />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="system-ui">{g}</text>
          </g>
        );
      })}
      {/* hospital */}
      <g>
        <rect x="190" y="135" width="30" height="30" rx="6" fill="#A51C30" />
        <path d="M205 142 v16 M197 150 h16" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <text x="205" y="292" textAnchor="middle" fontSize="11" fill="#56647D" fontFamily="system-ui">10 km search radius around the hospital</text>
    </svg>
  );
}
