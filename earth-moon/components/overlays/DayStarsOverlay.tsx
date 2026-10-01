'use client';

import { sfx } from '@snug/shared/src/audio';
import { useRef, useState, type PointerEvent } from 'react';
import { StarGlowDef, StarShape } from '@/components/StarShape';
import { useDataStore } from '@/game/dataStore';
import { rotatesCounterclockwise, starMotionOk, starsFor, type SkyDirection } from '@/game/rules';

const NAMES: Record<SkyDirection, string> = { north: '북쪽 하늘', east: '동쪽 하늘', south: '남쪽 하늘', west: '서쪽 하늘' };
const ORDER: SkyDirection[] = ['north', 'east', 'south', 'west'];
const POLE = { x: 400, y: 330 };
// 별: 북쪽은 북극성 둘레, 나머지는 방향별 이동 벡터(1시간 이동량)
const STARS = [{ a: 20, r: 90 }, { a: 140, r: 150 }, { a: 250, r: 210 }, { a: 330, r: 130 }, { a: 70, r: 250 }];
const STEP: Record<Exclude<SkyDirection, 'north'>, { dx: number; dy: number }> = { east: { dx: 17, dy: -28 }, south: { dx: 34, dy: 0 }, west: { dx: 17, dy: 28 } };
const SIDE: Record<SkyDirection, [string, string]> = { north: ['서쪽', '동쪽'], east: ['북쪽', '남쪽'], south: ['동쪽', '서쪽'], west: ['남쪽', '북쪽'] };
/** 관측은 저녁 8시에 시작해 1시간 간격 (244~245쪽 탐구의 1시간 간격) */
const clock = (h: number, short = false) => {
  const t = (20 + h) % 24;
  const n = t % 12 === 0 ? 12 : t % 12;
  return short ? `${n}시` : `${t >= 20 || t < 5 ? '밤' : '새벽'} ${n}시`;
};
const GRID = [[100, 420], [260, 330], [420, 400], [560, 300], [680, 420], [200, 200], [470, 210], [330, 470]];

/** 하루 동안 별 (244~245쪽): 시간 슬라이더로 하늘을 움직여 본 뒤, 별을 끌어 이동 방향을 그린다. 북쪽은 북극성 둘레를 시계 반대로. */
export function DayStarsOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const cfg = useDataStore(s => s.minigame)!;
  const [idx, setIdx] = useState(0);
  const [hour, setHour] = useState(0);
  const [moved, setMoved] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const [good, setGood] = useState<SkyDirection[]>([]);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const lastPt = useRef<{ x: number; y: number } | null>(null); // 손을 뗄 때 최신 끝점으로 판정
  const [line, setLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const dir = ORDER[idx];

  const posAt = (i: number, h: number) => {
    if (dir === 'north') { const s = STARS[i]; const a = ((s.a - h * 15) * Math.PI) / 180; return { x: POLE.x + Math.cos(a) * s.r, y: POLE.y + Math.sin(a) * s.r }; }
    const g = GRID[i]; const st = STEP[dir];
    return { x: g[0] + st.dx * h - 100, y: g[1] + st.dy * h };
  };
  const pos = (i: number) => posAt(i, hour);
  /** 지금까지 지나온 길(파선): 북쪽은 북극성 둘레의 호, 나머지는 곧은 길 */
  const trail = (i: number) => {
    const pts: string[] = [];
    for (let h = 0; h <= hour + 1e-6; h += 0.25) { const q = posAt(i, Math.min(h, hour)); pts.push(`${q.x.toFixed(1)},${q.y.toFixed(1)}`); }
    return pts.join(' ');
  };
  const toSvg = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 800, y: ((e.clientY - r.top) / r.height) * 600 };
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    const p = toSvg(e);
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    if (!moved) { setMsg('먼저 시간을 움직여 봐요'); return; }
    const n = (dir === 'north' ? STARS.length : GRID.length);
    let best = -1, bd = 60;
    for (let i = 0; i < n; i++) { const q = pos(i); const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = i; } }
    if (best < 0) return;
    const q = pos(best);
    drag.current = { x: q.x, y: q.y, ox: p.x, oy: p.y };
    lastPt.current = { x: q.x, y: q.y };
    setLine({ x1: q.x, y1: q.y, x2: q.x, y2: q.y });
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current; if (!d) return;
    const p = toSvg(e);
    lastPt.current = p;
    setLine({ x1: d.x, y1: d.y, x2: p.x, y2: p.y });
  };
  const up = () => {
    const d = drag.current; drag.current = null;
    const end = lastPt.current;
    if (!d || !end) return;
    const dx = end.x - d.x, dy = end.y - d.y;
    setLine(null);
    if (Math.hypot(dx, dy) < 50) return;
    check(dx, dy, { x: d.x, y: d.y }, end);
  };
  const select = (i: number) => { if (i === idx) return; setIdx(i); setHour(0); setMoved(false); setMsg(''); setLine(null); };
  const check = (dx: number, dy: number, from: { x: number; y: number }, to: { x: number; y: number }) => {
    if (good.includes(dir)) return;
    const ok = dir === 'north' ? rotatesCounterclockwise(POLE, from, to) : starMotionOk(dir, dx, dy, cfg.dayStars.tolerance);
    if (!ok) { setMistakes(m => m + 1); sfx.error(); setMsg(dir === 'north' ? '북극성을 중심으로 시계 반대 방향이에요' : '별은 동쪽에서 떠서 서쪽으로 져요'); return; }
    setMsg('');
    const next = [...good, dir];
    setGood(next); sfx.correct();
    window.setTimeout(() => {
      if (next.length >= ORDER.length) onDone(starsFor(ORDER.length / (ORDER.length + mistakes), mistakes === 0, cfg));
      else { const j = ORDER.findIndex((d, k) => k > idx && !next.includes(d)); select(j >= 0 ? j : ORDER.findIndex(d => !next.includes(d))); }
    }, 900);
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.repeat || good.includes(dir)) return;
    if (!moved) { setMsg('먼저 시간을 움직여 봐요'); return; }
    if (dir === 'north') {
      const ccw = { x1: POLE.x + 100, y1: POLE.y, x2: POLE.x, y2: POLE.y - 100 };
      if (e.key === 'ArrowLeft') check(ccw.x2 - ccw.x1, ccw.y2 - ccw.y1, { x: ccw.x1, y: ccw.y1 }, { x: ccw.x2, y: ccw.y2 });
      else if (e.key === 'ArrowRight') check(ccw.x1 - ccw.x2, ccw.y1 - ccw.y2, { x: ccw.x2, y: ccw.y2 }, { x: ccw.x1, y: ccw.y1 });
      return;
    }
    const v: Record<string, [number, number]> = { ArrowUp: [1, -1.7], ArrowRight: [1, 0], ArrowDown: [1, 1.7], ArrowLeft: [-1, 0] };
    if (v[e.key]) { e.preventDefault(); check(v[e.key][0] * 100, v[e.key][1] * 100, { x: 0, y: 0 }, { x: v[e.key][0] * 100, y: v[e.key][1] * 100 }); }
  };
  const done = good.includes(dir);
  const n = dir === 'north' ? STARS.length : GRID.length;
  const hint = !moved && !done ? '① 아래 슬라이더를 오른쪽으로 움직여, 별이 어디로 가는지 봐요'
    : done ? '잘했어요! 위에서 다른 방향의 하늘도 골라 봐요'
    : dir === 'north' ? '② 별을 잡고, 북극성 둘레로 별이 움직인 방향대로 끌어서 선을 그려요'
    : '② 별을 잡고, 별이 움직인 방향대로 끌어서 선을 그려요';

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="flex gap-3">
        {ORDER.map((d, i) => <button type="button" key={d} onClick={() => select(i)} className={`px-5 py-2 rounded-xl text-xl font-bold ${good.includes(d) ? 'bg-emerald-400 text-black anim-pop' : i === idx ? 'bg-yellow-300 text-black' : 'bg-white/10'} ${i === idx ? 'ring-4 ring-white/70' : ''}`}>{NAMES[d]}</button>)}
      </div>
      <svg ref={svg} viewBox="0 0 800 600" width="800" height="600" className="touch-none rounded-3xl bg-[#05070f] outline-none" tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <defs>
          <StarGlowDef />
        </defs>
        <rect x="0" y="0" width="800" height="600" fill="#05070f" />
        <image href={`/assets/sky/sky-${dir}.webp`} x="0" y="0" width="800" height="600" preserveAspectRatio="xMidYMid slice" />
        {dir === 'north' && <StarShape x={POLE.x} y={POLE.y} r={9} />}
        {/* 지나온 길 */}
        {hour > 0 && Array.from({ length: n }).map((_, i) => {
          const p0 = posAt(i, 0);
          return (
            <g key={`t${i}`}>
              <polyline points={trail(i)} fill="none" stroke="#fde68a" strokeWidth="2.5" strokeDasharray="7 9" strokeLinecap="round" opacity="0.8" />
              <circle cx={p0.x} cy={p0.y} r="6" fill="none" stroke="#fde68a" strokeWidth="2" opacity="0.6" />
            </g>
          );
        })}
        {Array.from({ length: n }).map((_, i) => { const p = pos(i); return <StarShape key={i} x={p.x} y={p.y} r={i === 0 ? 8 : 6} ring={moved && !done} />; })}
        {line && <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#fde68a" strokeWidth="6" strokeLinecap="round" />}
        {/* 방향 표지: 지금 보는 방향의 왼쪽·오른쪽이 어느 쪽인지 */}
        <g fontSize="26" fontWeight="700" fill="#fde68a" stroke="#05070f" strokeWidth="5" paintOrder="stroke">
          <text x="26" y="560">{SIDE[dir][0]}</text>
          <text x="774" y="560" textAnchor="end">{SIDE[dir][1]}</text>
        </g>
        {done && <circle cx="400" cy="300" r="60" fill="#86efac" className="anim-sparkle" style={{ transformOrigin: '400px 300px' }} />}
      </svg>
      <div className="flex flex-col items-center gap-1 w-[640px]">
        <div className="text-2xl font-bold text-yellow-200">{clock(hour)}</div>
        <input type="range" min={0} max={6} step={1} value={hour} onChange={e => { setHour(Number(e.target.value)); if (Number(e.target.value) > 0) setMoved(true); }} className="w-full h-8 accent-yellow-300" aria-label="시간" />
        <div className="flex justify-between w-full text-base text-white/80 px-1">
          {Array.from({ length: 7 }).map((_, h) => <span key={h} className={h === hour ? 'text-yellow-300 font-bold' : ''}>{clock(h, true)}</span>)}
        </div>
        <svg viewBox="0 0 320 20" width="320" height="20" aria-hidden><line x1="6" y1="10" x2="300" y2="10" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" /><polygon points="296,3 314,10 296,17" fill="#fde68a" /></svg>
        <div className="text-base text-white/80 -mt-1">시간의 흐름</div>
        <div className={`text-xl h-7 w-[800px] text-center ${msg ? 'text-red-300' : 'text-yellow-100'}`} style={{ wordBreak: 'keep-all' }}>{msg || hint}</div>
      </div>
    </div>
  );
}
