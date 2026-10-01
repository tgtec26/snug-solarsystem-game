'use client';

import { sfx } from '@snug/shared/src/audio';
import { useRef, useState, type PointerEvent } from 'react';
import { useDataStore } from '@/game/dataStore';
import { eclipseKind, starsFor, type EclipseKind } from '@/game/rules';

const W = 1280, H = 800;
const SUN = { x: 470, y: 400 };
const R_EARTH = 230;      // 지구가 태양 둘레를 도는 궤도
const R_MOON = 105;       // 달이 지구 둘레를 도는 궤도
const RE = 44, RM = 27;
const TYPES: { id: string; name: string; k: EclipseKind }[] = [
  { id: 'solar-total', name: '개기일식', k: { kind: 'solar', degree: 'total' } },
  { id: 'solar-partial', name: '부분일식', k: { kind: 'solar', degree: 'partial' } },
  { id: 'lunar-total', name: '개기월식', k: { kind: 'lunar', degree: 'total' } },
  { id: 'lunar-partial', name: '부분월식', k: { kind: 'lunar', degree: 'partial' } },
];
const onCircle = (c: { x: number; y: number }, deg: number, r: number) => ({ x: c.x + Math.cos((deg * Math.PI) / 180) * r, y: c.y - Math.sin((deg * Math.PI) / 180) * r });
const angleOf = (c: { x: number; y: number }, p: { x: number; y: number }) => (Math.atan2(-(p.y - c.y), p.x - c.x) * 180) / Math.PI;
const typeOf = (k: EclipseKind) => TYPES.find(t => t.k.kind === k.kind && t.k.degree === k.degree)!;

/** 그림자 모형 (252~253쪽): 지구를 태양 둘레로, 달을 지구 둘레로 끌어 공전시키며 일직선이 되는 순간 일식·월식 4가지를 만든다. */
export function ShadowOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const cfg = useDataStore(s => s.minigame)!;
  const [ang, setAng] = useState({ earth: 90, moon: 200 }); // 각도(도): 위쪽 +, 시계 반대가 증가
  const [grab, setGrab] = useState<'earth' | 'moon' | null>(null);
  const [touched, setTouched] = useState(false);
  const [made, setMade] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);
  const svg = useRef<SVGSVGElement>(null);
  const grabRef = useRef<'earth' | 'moon' | null>(null);
  const live = useRef(ang); // 손을 뗄 때 최신 각도로 판정한다

  const earth = onCircle(SUN, ang.earth, R_EARTH);
  const moon = onCircle(earth, ang.moon, R_MOON);
  const kind = eclipseKind(SUN, earth, moon, cfg);

  const toSvg = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const set = (n: { earth: number; moon: number }) => { live.current = n; setAng(n); };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    const p = toSvg(e);
    const de = Math.hypot(p.x - earth.x, p.y - earth.y), dm = Math.hypot(p.x - moon.x, p.y - moon.y);
    if (Math.min(de, dm) > 70) return;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    grabRef.current = dm <= de ? 'moon' : 'earth';
    setGrab(grabRef.current); setTouched(true);
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const g = grabRef.current;
    if (!g) return;
    const p = toSvg(e);
    if (g === 'earth') set({ ...live.current, earth: angleOf(SUN, p) });
    else set({ ...live.current, moon: angleOf(onCircle(SUN, live.current.earth, R_EARTH), p) });
  };
  /** 지금 각도가 식이면 그 종류를 기록한다 */
  const settle = () => {
    const e = onCircle(SUN, live.current.earth, R_EARTH);
    const hit = eclipseKind(SUN, e, onCircle(e, live.current.moon, R_MOON), cfg);
    if (!hit) return false;
    const t = typeOf(hit);
    if (made.includes(t.id)) return true;
    const next = [...made, t.id];
    setMade(next); sfx.correct();
    if (next.length === TYPES.length) window.setTimeout(() => onDone(starsFor(1, misses <= 20, cfg)), 1800);
    return true;
  };
  const up = () => {
    if (!grabRef.current) return;
    grabRef.current = null;
    setGrab(null);
    if (!settle()) setMisses(m => m + 1);
  };
  const key = (e: React.KeyboardEvent) => {
    const d: Record<string, number> = { ArrowLeft: 4, ArrowUp: 4, ArrowRight: -4, ArrowDown: -4 };
    if (!(e.key in d)) return;
    e.preventDefault(); setTouched(true);
    const who = e.shiftKey ? 'earth' : 'moon';
    set({ ...live.current, [who]: live.current[who] + d[e.key] });
    settle();
  };

  const solar = kind?.kind === 'solar';
  const mid = solar ? moon : earth, far = solar ? earth : moon;
  const rMid = solar ? RM : RE, rFar = solar ? RE : RM;
  // 가운데 공의 그림자가 먼 공에 드리운 자리: 가운데 공이 직선에서 벗어난 만큼 옆으로 밀린다
  const len = Math.hypot(far.x - SUN.x, far.y - SUN.y);
  const side = ((-(far.y - SUN.y)) * (mid.x - SUN.x) + (far.x - SUN.x) * (mid.y - SUN.y)) / len;
  const sh = { x: far.x + (-(far.y - SUN.y) / len) * side, y: far.y + ((far.x - SUN.x) / len) * side };
  const total = kind?.degree === 'total';
  const done = made.length === TYPES.length;
  const now = kind ? typeOf(kind) : null;
  const lift = (g: 'earth' | 'moon') => (grab === g ? 1.1 : 1);

  return (
    <div className="absolute inset-0">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0 touch-none bg-[#05070f] outline-none" tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <defs>
          <radialGradient id="sunGlow"><stop offset="0" stopColor="#ffd166" stopOpacity="0.45" /><stop offset="1" stopColor="#ffd166" stopOpacity="0" /></radialGradient>
          <clipPath id="farClip"><circle cx={far.x} cy={far.y} r={rFar} /></clipPath>
        </defs>
        <circle cx={SUN.x} cy={SUN.y} r="330" fill="url(#sunGlow)" />
        <circle cx={SUN.x} cy={SUN.y} r={R_EARTH} fill="none" stroke="#ffffff33" strokeDasharray="8 10" strokeWidth="3" />
        <circle cx={earth.x} cy={earth.y} r={R_MOON} fill="none" stroke={grab === 'moon' ? '#fde68a' : '#ffffff44'} strokeDasharray="6 8" strokeWidth="3" />
        {kind && <line x1={SUN.x} y1={SUN.y} x2={far.x} y2={far.y} stroke="#86efac" strokeWidth="4" strokeDasharray="10 8" opacity="0.85" />}
        <image href="/assets/sun.webp" x={SUN.x - 75} y={SUN.y - 75} width="150" height="150" />
        <text x={SUN.x} y={SUN.y + 108} textAnchor="middle" fontSize="22" fontWeight="700" fill="#fde68a" stroke="#05070f" strokeWidth="4" paintOrder="stroke">태양</text>
        {!touched && [earth, moon].map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={(i ? RM : RE) + 14} fill="none" stroke="#fde68a" strokeWidth="4" strokeDasharray="6 6" className="animate-pulse" />)}
        {[{ k: 'earth' as const, p: earth, r: RE, label: '지구' }, { k: 'moon' as const, p: moon, r: RM, label: '달' }].map(o => (
          <g key={o.k}>
            <ellipse cx={o.p.x + 5} cy={o.p.y + o.r + 8} rx={o.r * 0.85} ry="8" fill="#000" opacity={grab === o.k ? 0.25 : 0.5} />
            <image href={o.k === 'earth' ? '/assets/earth-ball.webp' : '/assets/moon-ball.webp'} x={o.p.x - o.r * lift(o.k)} y={o.p.y - o.r * lift(o.k)} width={o.r * 2 * lift(o.k)} height={o.r * 2 * lift(o.k)} className={grab === o.k ? '' : 'cursor-grab'} />
            <text x={o.p.x} y={o.p.y + o.r + 30} textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff" stroke="#05070f" strokeWidth="4" paintOrder="stroke">{o.label}</text>
          </g>
        ))}
        {kind && (
          <g clipPath="url(#farClip)">
            <circle cx={sh.x} cy={sh.y} r={rMid * 0.9} fill={solar ? '#000' : (total ? '#7f1d1d' : '#000')} opacity={total && !solar ? 0.75 : 0.85} />
          </g>
        )}
        {kind && kind.kind === 'lunar' && total && <circle cx={far.x} cy={far.y} r={rFar} fill="#b91c1c" opacity="0.35" />}
        {kind && kind.kind === 'solar' && total && <circle cx={moon.x} cy={moon.y} r={RM + 10} fill="none" stroke="#fde68a" strokeWidth="6" opacity="0.8" className="animate-pulse" />}
        {done && <circle cx={SUN.x} cy={SUN.y} r="200" fill="#fde68a" className="anim-sparkle" style={{ transformOrigin: `${SUN.x}px ${SUN.y}px` }} />}
      </svg>
      <div className="absolute right-10 top-1/2 -translate-y-1/2 w-[300px] flex flex-col gap-3 items-stretch">
        {TYPES.map(t => <div key={t.id} className={`px-5 py-3 rounded-xl text-2xl font-bold text-center ${made.includes(t.id) ? 'bg-emerald-400 text-black anim-pop' : 'bg-white/10'}`}>{t.name}</div>)}
        <div className="text-xl text-center h-8 mt-2 text-yellow-100">{now ? `지금: ${now.name}` : ''}</div>
        <div className="text-lg text-center text-white/80 leading-snug" style={{ wordBreak: 'keep-all' }}>지구는 태양 둘레로, 달은 지구 둘레로 끌어서 돌려 봐요. 태양·달·지구가 일직선이 되면 일식, 태양·지구·달이 일직선이 되면 월식이에요.</div>
      </div>
    </div>
  );
}
