import { moonPositionAngle } from '@/game/rules';

/** 크레이터 자리 (반지름 비율): 밝은 부분에만 보이는 얕은 얼룩 */
const CRATERS = [[-0.3, -0.35, 0.2], [0.28, -0.12, 0.13], [-0.12, 0.32, 0.16], [0.42, 0.38, 0.09], [-0.5, 0.08, 0.09], [0.08, -0.6, 0.08], [0.55, -0.45, 0.07]];

/** 지구에서 본 달의 위상. 위치(pos 1~8) 또는 연속 각도(angle, 태양 방향 0°에서 시계 반대)로 준다. 밝은 부분은 태양 빛을 받은 쪽, 구 모양 음영과 크레이터 */
export function MoonDisc({ pos, angle, cx, cy, r }: { pos?: number; angle?: number; cx: number; cy: number; r: number }) {
  const a = (((angle ?? moonPositionAngle(pos ?? 1)) % 360) + 360) % 360;
  const f = (1 - Math.cos((a * Math.PI) / 180)) / 2;
  const flip = a > 0 && a < 180 ? 1 : -1; // 차오르면 오른쪽, 기울면 왼쪽이 밝다
  const rx = Math.abs(1 - 2 * f) * r;
  const full = f > 0.999;
  const lit = f <= 0.001 ? '' : `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} A${rx} ${r} 0 0 ${f < 0.5 ? 0 : 1} ${cx} ${cy - r}`;
  const tf = flip === 1 ? undefined : `translate(${2 * cx} 0) scale(-1 1)`;
  const id = `moon-${Math.round(a)}-${cx}-${cy}`;
  return (
    <g>
      <defs>
        <radialGradient id={id} cx="0.4" cy="0.4"><stop offset="0" stopColor="#fbf8ee" /><stop offset="1" stopColor="#b5b09c" /></radialGradient>
        <clipPath id={`${id}-c`}>{full ? <circle cx={cx} cy={cy} r={r} /> : <path d={lit} transform={tf} />}</clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="#1a2036" />
      {full ? <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} /> : lit && <path d={lit} fill={`url(#${id})`} transform={tf} />}
      {lit && (
        <g clipPath={`url(#${id}-c)`}>
          {CRATERS.map(([x, y, s], i) => (
            <g key={i}>
              <circle cx={cx + x * r} cy={cy + y * r} r={s * r} fill="#8a8470" opacity="0.45" />
              <circle cx={cx + x * r - s * r * 0.15} cy={cy + y * r - s * r * 0.15} r={s * r * 0.8} fill="#a29c86" opacity="0.5" />
            </g>
          ))}
        </g>
      )}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ffffff33" strokeWidth="2" />
    </g>
  );
}
