/** 별 모양: 가는 네 갈래 빛줄기와 번지는 빛. 쓰는 svg 안에 <StarGlowDef />를 한 번 넣어야 한다. */
export function StarGlowDef() {
  return <radialGradient id="starGlow"><stop offset="0" stopColor="#fff7c2" stopOpacity="0.85" /><stop offset="1" stopColor="#fde68a" stopOpacity="0" /></radialGradient>;
}
export function StarShape({ x, y, r, ring = false }: { x: number; y: number; r: number; ring?: boolean }) {
  const R = r * 2.4, q = r * 0.5;
  return (
    <g>
      <circle cx={x} cy={y} r={r * 3.2} fill="url(#starGlow)" />
      <path d={`M${x} ${y - R} L${x + q * 0.6} ${y - q * 0.6} L${x + R} ${y} L${x + q * 0.6} ${y + q * 0.6} L${x} ${y + R} L${x - q * 0.6} ${y + q * 0.6} L${x - R} ${y} L${x - q * 0.6} ${y - q * 0.6} Z`} fill="#fffbe6" stroke="#fde68a" strokeWidth="1" />
      {ring && <circle cx={x} cy={y} r={R + 6} fill="none" stroke="#fde68a" strokeWidth="2" strokeDasharray="4 5" opacity="0.7" />}
    </g>
  );
}
