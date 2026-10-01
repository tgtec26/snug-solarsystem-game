'use client';

import { sfx } from '@snug/shared/src/audio';
import { useRef, useState, type PointerEvent } from 'react';
import { StarGlowDef, StarShape } from '@/components/StarShape';
import { useDataStore } from '@/game/dataStore';
import { isEastward, spinAccumulate, spinDone, starsFor } from '@/game/rules';

const C = { x: 400, y: 290 };
const R = 150;
const norm = (d: number) => ((d + 540) % 360) - 180;
const STARS = Array.from({ length: 26 }, (_, i) => ({ x: (i * 137) % 800, y: 40 + ((i * 71) % 230), r: i % 4 === 0 ? 3 : 1.8 }));

/** 지구 자전 돌리기 (244쪽): 지구를 끌어 서쪽에서 동쪽으로 돌리면 지구 시점의 별이 동쪽에서 서쪽로 흐른다. 한 바퀴 돌리고 시점을 한 번 바꾸면 통과. */
export function EarthSpinOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const cfg = useDataStore(s => s.minigame)!;
  const [rot, setRot] = useState(0);         // 화면 회전각(도, 시계 방향 +)
  const [total, setTotal] = useState(0);     // 서쪽에서 동쪽으로 돌린 누적각
  const [view, setView] = useState<'space' | 'earth'>('space');
  const [viewed, setViewed] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const last = useRef<number | null>(null);
  const wrong = useRef(0); // 반대로 돌린 각을 모아 일정 이상이면 한 번 알린다
  const svg = useRef<SVGSVGElement>(null);

  const spin = (screenDelta: number) => {
    if (ok) return;
    setRot(r => r + screenDelta);
    const east = -screenDelta; // 화면 시계 반대 방향 = 서쪽에서 동쪽
    if (!isEastward(east)) {
      wrong.current += Math.abs(screenDelta);
      if (wrong.current > 40) { wrong.current = 0; setMistakes(m => m + 1); sfx.error(); setMsg('지구는 서쪽에서 동쪽으로 돌아요'); }
      return;
    }
    setMsg('');
    const t = spinAccumulate(total, east);
    setTotal(t);
    if (spinDone(t, cfg.earthSpin.turns) && viewed) finish();
  };
  const finish = () => {
    setOk(true); sfx.correct();
    window.setTimeout(() => onDone(starsFor(1 / (1 + mistakes), mistakes === 0, cfg)), 2500);
  };
  const toggle = () => {
    setView(v => (v === 'space' ? 'earth' : 'space'));
    if (!viewed) { setViewed(true); if (spinDone(total, cfg.earthSpin.turns)) finish(); }
  };
  const angleAt = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 800 - C.x;
    const y = ((e.clientY - r.top) / r.height) * 600 - C.y;
    return (Math.atan2(y, x) * 180) / Math.PI;
  };
  const down = (e: PointerEvent<SVGSVGElement>) => { (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); last.current = angleAt(e); };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (last.current === null) return;
    const a = angleAt(e);
    spin(norm(a - last.current));
    last.current = a;
  };
  const up = () => { last.current = null; };
  const key = (e: React.KeyboardEvent) => {
    if (e.repeat && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.key === 'ArrowLeft') spin(-12);
    else if (e.key === 'ArrowRight') spin(12);
    else if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) toggle(); }
  };

  const needView = spinDone(total, cfg.earthSpin.turns) && !viewed;
  const progress = Math.min(1, total / (cfg.earthSpin.turns * 360));
  const obs = { x: C.x + Math.cos(((rot - 90) * Math.PI) / 180) * R, y: C.y + Math.sin(((rot - 90) * Math.PI) / 180) * R };
  const shift = (((total * 2.2) % 800) + 800) % 800; // 지구 시점: 별이 동쪽에서 서쪽(왼쪽에서 오른쪽)로 흐른다

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="text-3xl font-bold">지구를 돌려 봐요</div>
      <svg ref={svg} viewBox="0 0 800 600" width="800" height="600" className="touch-none rounded-3xl bg-[#05070f] outline-none" tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {view === 'space' ? (
          <>
            {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y + 120} r={s.r} fill="#fff" opacity="0.5" />)}
            <image href="/assets/sun.webp" x="20" y="220" width="140" height="140" />
            <ellipse cx={C.x} cy={C.y + R + 26} rx={R * 0.9} ry="16" fill="#000" opacity="0.4" />
            <circle cx={C.x} cy={C.y} r={R + 14 + progress * 10} fill="none" stroke="#86efac" strokeWidth="6" strokeDasharray={`${progress * 2 * Math.PI * (R + 18)} 9999`} transform={`rotate(-90 ${C.x} ${C.y})`} />
            <g transform={`rotate(${rot} ${C.x} ${C.y})`}>
              <image href="/assets/earth-top.webp" x={C.x - R} y={C.y - R} width={R * 2} height={R * 2} />
            </g>
            <circle cx={obs.x} cy={obs.y} r="12" fill="#fde68a" stroke="#92400e" strokeWidth="4" />
            {total < 30 && (
              <path d={`M${C.x - 80} ${C.y - 200} A 220 220 0 0 0 ${C.x - 210} ${C.y + 60}`} fill="none" stroke="#fde68a" strokeWidth="10" strokeLinecap="round" className="animate-pulse" markerEnd="url(#head)" />
            )}
            <defs><marker id="head" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="#fde68a" /></marker></defs>
          </>
        ) : (
          <>
            <defs><StarGlowDef /></defs>
            <image href="/assets/sky/sky-south.webp" x="0" y="0" width="800" height="600" preserveAspectRatio="xMidYMid slice" />
            {STARS.map((s, i) => <StarShape key={i} x={(s.x + shift) % 800} y={s.y} r={s.r * 1.6} />)}
            <g fontSize="26" fontWeight="700" fill="#fde68a" stroke="#05070f" strokeWidth="5" paintOrder="stroke">
              <text x="26" y="560">동쪽</text>
              <text x="774" y="560" textAnchor="end">서쪽</text>
            </g>
            <path d="M300 120 H500 m-24 -16 l24 16 l-24 16" stroke="#fde68a" strokeWidth="6" fill="none" strokeLinecap="round" opacity={ok ? 0 : 0.8} />
          </>
        )}
        {ok && view === 'space' && <circle cx={C.x} cy={C.y} r={R} fill="#fde68a" className="anim-sparkle" style={{ transformOrigin: `${C.x}px ${C.y}px` }} />}
      </svg>
      <div className="flex items-center gap-6 h-16">
        <button type="button" onClick={toggle} className={`px-8 py-3 rounded-2xl bg-sky-300 text-black text-2xl font-bold ${needView ? 'animate-pulse ring-4 ring-yellow-200' : ''}`}>시점 바꾸기</button>
        <div className={`text-xl w-[28rem] ${msg ? 'text-red-300' : 'text-yellow-100'}`} style={{ wordBreak: 'keep-all' }}>{msg || (needView ? '한 바퀴 돌렸어요! 시점을 바꿔 지구에서 본 하늘을 봐요' : '')}</div>
      </div>
    </div>
  );
}
