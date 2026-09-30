'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { useDataStore } from '@/game/dataStore';
import { eclipseKind, starsFor, type EclipseKind } from '@/game/rules';

const SUN = { x: 90, y: 300 };
const BASE = { x0: 190, x1: 760, y0: 120, y1: 500 }; // 받침판 위에서만 움직인다
const RE = 54, RM = 26;
const TYPES: { id: string; name: string; k: EclipseKind }[] = [
  { id: 'solar-total', name: '개기일식', k: { kind: 'solar', degree: 'total' } },
  { id: 'solar-partial', name: '부분일식', k: { kind: 'solar', degree: 'partial' } },
  { id: 'lunar-total', name: '개기월식', k: { kind: 'lunar', degree: 'total' } },
  { id: 'lunar-partial', name: '부분월식', k: { kind: 'lunar', degree: 'partial' } },
];
const cl = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/** 그림자 모형 (252~253쪽): 지구(큰 공)와 달(작은 공)을 끌어 일직선에 놓아 일식·월식 4가지를 만든다. */
export function ShadowOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const cfg = useDataStore(s => s.minigame)!;
  const [earth, setEarth] = useState({ x: 600, y: 420 });
  const [moon, setMoon] = useState({ x: 380, y: 200 });
  const [grab, setGrab] = useState<'earth' | 'moon' | null>(null);
  const [made, setMade] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);
  const [last, setLast] = useState<EclipseKind | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const kind = eclipseKind(SUN, earth, moon, cfg);

  const toSvg = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 800, y: ((e.clientY - r.top) / r.height) * 600 };
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    const p = toSvg(e);
    const de = Math.hypot(p.x - earth.x, p.y - earth.y), dm = Math.hypot(p.x - moon.x, p.y - moon.y);
    if (Math.min(de, dm) > 70) return;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    setGrab(dm <= de ? 'moon' : 'earth');
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!grab) return;
    const p = toSvg(e);
    const n = { x: cl(p.x, BASE.x0, BASE.x1), y: cl(p.y, BASE.y0, BASE.y1) };
    if (grab === 'earth') setEarth(n); else setMoon(n);
  };
  const up = () => {
    if (!grab) return;
    setGrab(null);
    if (!kind) { setMisses(m => m + 1); return; }
    setLast(kind);
    const t = TYPES.find(x => x.k.kind === kind.kind && x.k.degree === kind.degree)!;
    if (made.includes(t.id)) return;
    const next = [...made, t.id];
    setMade(next);
    if (next.length === TYPES.length) window.setTimeout(() => onDone(starsFor(1, misses <= 12, cfg)), 1800);
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.repeat) return;
    const d: Record<string, [number, number]> = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
    const v = d[e.key]; if (!v) return;
    e.preventDefault();
    const who = e.shiftKey ? 'earth' : 'moon';
    const n = (p: { x: number; y: number }) => ({ x: cl(p.x + v[0], BASE.x0, BASE.x1), y: cl(p.y + v[1], BASE.y0, BASE.y1) });
    if (who === 'earth') setEarth(n); else setMoon(n);
  };

  const solar = kind?.kind === 'solar';
  const mid = solar ? moon : earth, far = solar ? earth : moon;
  const rMid = solar ? RM : RE, rFar = solar ? RE : RM;
  // 가운데 공의 그림자가 먼 공에 드리운 원 (가까울수록 먼 공 위에 겹친다)
  const dy = kind ? (far.y - SUN.y) - ((mid.y - SUN.y) / Math.max(1, mid.x - SUN.x)) * (far.x - SUN.x) : 0;
  const total = kind?.degree === 'total';
  const lift = (g: boolean) => (g ? -10 : 0);
  const done = made.length === TYPES.length;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="flex gap-3">
        {TYPES.map(t => <div key={t.id} className={`px-5 py-2 rounded-xl text-xl font-bold ${made.includes(t.id) ? 'bg-emerald-400 text-black anim-pop' : 'bg-white/10'}`}>{t.name}</div>)}
      </div>
      <svg ref={svg} viewBox="0 0 800 600" width="800" height="600" className="touch-none rounded-3xl bg-[#05070f] outline-none" tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <defs>
          <radialGradient id="eg" cx="0.35" cy="0.35"><stop offset="0" stopColor="#5fa8ea" /><stop offset="1" stopColor="#1d4e89" /></radialGradient>
          <radialGradient id="mg" cx="0.35" cy="0.35"><stop offset="0" stopColor="#f4f1e6" /><stop offset="1" stopColor="#a9a596" /></radialGradient>
          <clipPath id="farClip"><circle cx={far.x} cy={far.y} r={rFar} /></clipPath>
        </defs>
        {/* 받침판 (사선 시점) */}
        <polygon points={`${BASE.x0 - 30},${BASE.y1 + 40} ${BASE.x1 + 30},${BASE.y1 + 40} ${BASE.x1 + 10},${BASE.y0 - 30} ${BASE.x0 - 10},${BASE.y0 - 30}`} fill="#1b2438" stroke="#334155" strokeWidth="4" />
        {/* 손전등 빛 */}
        <polygon points={`${SUN.x},${SUN.y - 36} ${SUN.x},${SUN.y + 36} 780,560 780,40`} fill="#ffd16614" />
        {kind && <line x1={SUN.x} y1={SUN.y} x2={far.x} y2={far.y} stroke="#86efac" strokeWidth="3" strokeDasharray="8 8" opacity="0.8" />}
        <rect x="30" y="278" width="70" height="44" rx="14" fill="#64748b" />
        <circle cx={SUN.x} cy={SUN.y} r="26" fill="#ffd166" />
        {/* 지구와 달: 집어 올리면 그림자가 멀어지고 살짝 커진다 */}
        <ellipse cx={earth.x + 6} cy={earth.y + RE + 10} rx={RE * 0.9} ry="12" fill="#000" opacity={grab === 'earth' ? 0.25 : 0.5} />
        <ellipse cx={moon.x + 4} cy={moon.y + RM + 8} rx={RM * 0.9} ry="8" fill="#000" opacity={grab === 'moon' ? 0.25 : 0.5} />
        {[{ k: 'earth', p: earth, r: RE, f: 'url(#eg)' }, { k: 'moon', p: moon, r: RM, f: 'url(#mg)' }].sort((a, b) => a.p.y - b.p.y).map(o => (
          <circle key={o.k} cx={o.p.x} cy={o.p.y + lift(grab === o.k)} r={o.r * (grab === o.k ? 1.08 : 1)} fill={o.f} className={grab === o.k ? '' : 'cursor-grab'} />
        ))}
        {kind && (
          <g clipPath="url(#farClip)">
            <circle cx={far.x} cy={far.y - dy} r={rMid * 0.9} fill={solar ? '#000' : (total ? '#7f1d1d' : '#000')} opacity={total && !solar ? 0.75 : 0.85} />
          </g>
        )}
        {kind && kind.kind === 'lunar' && total && <circle cx={far.x} cy={far.y} r={rFar} fill="#b91c1c" opacity="0.35" />}
        {kind && kind.kind === 'solar' && total && <circle cx={moon.x} cy={moon.y} r={RM + 10} fill="none" stroke="#fde68a" strokeWidth="6" opacity="0.8" className="animate-pulse" />}
        {last && done && <circle cx="400" cy="300" r="120" fill="#fde68a" className="anim-sparkle" style={{ transformOrigin: '400px 300px' }} />}
      </svg>
      <div className="h-10" />
    </div>
  );
}
