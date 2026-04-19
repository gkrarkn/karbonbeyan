function getStarPoints(cx, cy, outerRadius, innerRadius, spikes = 5) {
  const points = [];
  const step = Math.PI / spikes;

  for (let index = 0; index < spikes * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = index * step - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    points.push(`${x},${y}`);
  }

  return points.join(" ");
}

const stars = Array.from({ length: 12 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 12 - Math.PI / 2;
  return {
    cx: 28 + Math.cos(angle) * 12,
    cy: 28 + Math.sin(angle) * 12,
  };
});

function BrandLogo({ compact = false, className = "" }) {
  return (
    <div
      className={`inline-flex items-center gap-3 rounded-[26px] bg-[#0E4FAF] px-3 py-2 text-white shadow-[0_18px_40px_rgba(14,79,175,0.24)] ${className}`}
    >
      <svg viewBox="0 0 56 56" className={`${compact ? "h-11 w-11" : "h-14 w-14"} shrink-0`} aria-hidden="true">
        <circle cx="28" cy="28" r="28" fill="#0B3F91" />
        {stars.map((star) => (
          <polygon
            key={`${star.cx}-${star.cy}`}
            points={getStarPoints(star.cx, star.cy, 2.4, 1.05)}
            fill="#F6C343"
          />
        ))}
        <path
          d="M28 16 C34 17, 39 22, 39 29 C39 35, 35 40, 29 42 C24 40, 20 35, 20 29 C20 22, 24 18, 28 16 Z"
          fill="#56B26F"
        />
        <path
          d="M28 20 C30 24, 31 28, 29 37"
          stroke="#EAF8EE"
          strokeWidth="1.9"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.36em] text-white/70">
          CBAM Intelligence
        </div>
        <div className={`${compact ? "text-lg" : "text-xl"} truncate font-extrabold tracking-[0.02em]`}>
          KarbonBeyan
        </div>
      </div>
    </div>
  );
}

export default BrandLogo;
