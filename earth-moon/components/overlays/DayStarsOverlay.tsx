'use client';

import { sfx } from '@snug/shared/src/audio';
import { useRef, useState, type PointerEvent } from 'react';
import { useDataStore } from '@/game/dataStore';
import { rotatesCounterclockwise, starMotionOk, starsFor, type SkyDirection } from '@/game/rules';

const NAMES: Record<SkyDirection, string> = { north: '북쪽 하늘', east: '동쪽 하늘', south: '남쪽 하늘', west: '서쪽 하늘' };
const ORDER: SkyDirection[] = ['north', 'east', 'south', 'west'];
const POLE = { x: 400, y: 330 };
// 별: 북쪽은 북극성 둘레, 나머지는 방향별 이동 벡터(1시간 이동량)
const STARS = [{ a: 20, r: 90 }, { a: 140, r: 150 }, { a: 250, r: 210 }, { a: 330, r: 130 }, { a: 70, r: 250 }];
const STEP: Record<Exclude<SkyDirection, 'north'>, { dx: number; dy: number }> = { east: { dx: 17, dy: -28 }, south: { dx: 34, dy: 0 }, west: { dx: 17, dy: 28 } };
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
  const [line, setLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const dir = ORDER[idx];

  const pos = (i: number) => {
    if (dir === 'north') { const s = STARS[i]; const a = ((s.a - hour * 15) * Math.PI) / 180; return { x: POLE.x + Math.cos(a) * s.r, y: POLE.y + Math.sin(a) * s.r }; }
    const g = GRID[i]; const st = STEP[dir];
    return { x: g[0] + st.dx * hour - 100, y: g[1] + st.dy * hour };
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
    setLine({ x1: q.x, y1: q.y, x2: q.x, y2: q.y });
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current; if (!d) return;
    const p = toSvg(e);
    setLine({ x1: d.x, y1: d.y, x2: p.x, y2: p.y });
  };
  const up = () => {
    const d = drag.current; drag.current = null;
    if (!d || !line) return;
    const dx = line.x2 - line.x1, dy = line.y2 - line.y1;
    setLine(null);
    if (Math.hypot(dx, dy) < 50) return;
    check(dx, dy, { x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 });
  };
  const check = (dx: number, dy: number, from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ok = dir === 'north' ? rotatesCounterclockwise(POLE, from, to) : starMotionOk(dir, dx, dy, cfg.dayStars.tolerance);
    if (!ok) { setMistakes(m => m + 1); sfx.error(); setMsg(dir === 'north' ? '북극성을 중심으로 시계 반대 방향이에요' : '별은 동쪽에서 떠서 서쪽으로 져요'); return; }
    setMsg('');
    const next = [...good, dir];
    setGood(next); sfx.correct();
    window.setTimeout(() => {
      if (idx + 1 >= ORDER.length) onDone(starsFor(ORDER.length / (ORDER.length + mistakes), mistakes === 0, cfg));
      else { setIdx(idx + 1); setHour(0); setMoved(false); }
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

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="flex gap-3">
        {ORDER.map((d, i) => <div key={d} className={`px-5 py-2 rounded-xl text-xl font-bold ${good.includes(d) ? 'bg-emerald-400 text-black anim-pop' : i === idx ? 'bg-yellow-300 text-black' : 'bg-white/10'}`}>{NAMES[d]}</div>)}
      </div>
      <svg ref={svg} viewBox="0 0 800 600" width="800" height="600" className="touch-none rounded-3xl bg-[#05070f] outline-none" tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <defs><radialGradient id="dome" cx="0.5" cy="1" r="1"><stop offset="0" stopColor="#1b2a5a" /><stop offset="1" stopColor="#05070f" /></radialGradient></defs>
        <rect x="0" y="0" width="800" height="600" fill="url(#dome)" />
        <ellipse cx="400" cy="600" rx="520" ry="70" fill="#1f3b27" />
        {dir === 'north' && <circle cx={POLE.x} cy={POLE.y} r="9" fill="#fde68a" />}
        {Array.from({ length: n }).map((_, i) => { const p = pos(i); return <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 10 : 7} fill="#fff" stroke="#fde68a" strokeWidth={moved && !done ? 3 : 0} />; })}
        {line && <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#fde68a" strokeWidth="6" strokeLinecap="round" />}
        {done && <circle cx="400" cy="300" r="60" fill="#86efac" className="anim-sparkle" style={{ transformOrigin: '400px 300px' }} />}
      </svg>
      <div className="flex items-center gap-6 h-16">
        <input type="range" min={0} max={6} step={1} value={hour} onChange={e => { setHour(Number(e.target.value)); if (Number(e.target.value) > 0) setMoved(true); }} className="w-96 h-10 accent-yellow-300" aria-label="시간" />
        <div className="text-xl text-red-300 w-[28rem]">{msg}</div>
      </div>
    </div>
  );
}
