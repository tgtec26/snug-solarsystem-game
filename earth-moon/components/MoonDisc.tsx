import { isWaxing, litFraction } from '@/game/rules';

/** 지구에서 본 달의 위상 (위치 1~8). 밝은 부분은 태양 빛을 받은 쪽, 구 모양 음영 */
export function MoonDisc({ pos, cx, cy, r }: { pos: number; cx: number; cy: number; r: number }) {
  const f = litFraction(pos);
  const flip = isWaxing(pos) ? 1 : -1; // 차오르면 오른쪽, 기울면 왼쪽이 밝다
  const rx = Math.abs(1 - 2 * f) * r;
  const lit = f <= 0.001 ? '' : `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} A${rx} ${r} 0 0 ${f < 0.5 ? 0 : 1} ${cx} ${cy - r}`;
  const id = `moon-${pos}-${cx}-${cy}`;
  return (
    <g>
      <defs><radialGradient id={id} cx="0.4" cy="0.4"><stop offset="0" stopColor="#fbf8ee" /><stop offset="1" stopColor="#b5b09c" /></radialGradient></defs>
      <circle cx={cx} cy={cy} r={r} fill="#1a2036" />
      {f > 0.999 ? <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} /> : lit && <path d={lit} fill={`url(#${id})`} transform={flip === 1 ? undefined : `translate(${2 * cx} 0) scale(-1 1)`} />}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ffffff33" strokeWidth="2" />
    </g>
  );
}
