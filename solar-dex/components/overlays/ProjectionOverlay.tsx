'use client';

import { sfx } from '@snug/shared/src/audio';
import { useRef, useState, type PointerEvent } from 'react';
import { useDragDrop } from '@snug/shared/src/useDragDrop';
import { useDataStore } from '@/game/dataStore';
import { distance, focusSharp, safetyCheck, starsFor } from '@/game/rules';

const C = { x: 400, y: 290 }; // 투영판 종이 중앙
const PAPER_R = 190;
const SUN_R = 150;
const BEST = 0.55;
// 태양 상 안의 찾을 것 (상 중심 기준 좌표). 흑점 2, 쌀알 무늬 1
const SPOTS = [
  { id: 'sunspot-a', label: '흑점', dx: -50, dy: -30 },
  { id: 'sunspot-b', label: '흑점', dx: 70, dy: 40 },
  { id: 'granule', label: '쌀알 무늬', dx: -20, dy: 80 },
];

/** 태양 투영판 (236~237쪽): 차단판 끼우기 → 경통을 끌어 상을 종이 가운데로 → 초점 → 흑점·쌀알 무늬 찾기. */
export function ProjectionOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const cfg = useDataStore(s => s.minigame)!;
  const p = cfg.projection;
  const [stage, setStage] = useState<'plate' | 'aim' | 'focus' | 'find'>('plate');
  const [pan, setPan] = useState({ x: 150, y: -110 });
  const [focus, setFocus] = useState(0.05);
  const [found, setFound] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const panRef = useRef({ x: 150, y: -110 }); // 손을 뗄 때 최신 위치로 판정
  const sharp = focusSharp(focus, BEST, p.focusTolerance);
  const img = { x: C.x + pan.x, y: C.y + pan.y };

  const { drag: card, selected, bindCard, placeSelected } = useDragDrop((_id, target) => {
    if (target !== 'tube') return;
    setStage('aim'); setMsg(''); sfx.correct();
  }, stage === 'plate');

  const toSvg = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 800, y: ((e.clientY - r.top) / r.height) * 600 };
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    const pt = toSvg(e);
    if (stage === 'plate') { const c = safetyCheck('aim-sun-without-filter'); setMistakes(m => m + 1); sfx.error(); setMsg(`${c.reason}. 차단판부터 끼워요`); return; }
    if (stage === 'aim') {
      (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
      drag.current = { sx: pt.x, sy: pt.y, ox: pan.x, oy: pan.y };
    }
    if (stage === 'find') {
      const hit = SPOTS.find(s => !found.includes(s.id) && distance(pt, { x: img.x + s.dx, y: img.y + s.dy }) <= 30);
      if (!hit) { if (distance(pt, C) < PAPER_R) { setMistakes(m => m + 1); sfx.error(); setMsg('어두운 점이나 알갱이 무늬를 찾아요'); } return; }
      setMsg('');
      const next = [...found, hit.id];
      setFound(next); sfx.correct();
      if (next.length === SPOTS.length) window.setTimeout(() => onDone(starsFor(SPOTS.length / (SPOTS.length + mistakes), mistakes === 0, cfg)), 1100);
    }
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current; if (!d) return;
    const pt = toSvg(e);
    panRef.current = { x: d.ox + pt.x - d.sx, y: d.oy + pt.y - d.sy };
    setPan(panRef.current);
  };
  const settle = (n: { x: number; y: number }) => { if (Math.hypot(n.x, n.y) <= p.aimRadius) setStage('focus'); };
  const up = () => { if (drag.current) { drag.current = null; settle(panRef.current); } };

  const key = (e: React.KeyboardEvent) => {
    if (e.repeat) return;
    if (stage === 'plate' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setStage('aim'); return; }
    if (stage === 'aim') {
      const dir: Record<string, [number, number]> = { ArrowLeft: [-14, 0], ArrowRight: [14, 0], ArrowUp: [0, -14], ArrowDown: [0, 14] };
      const v = dir[e.key]; if (v) { e.preventDefault(); const n = { x: panRef.current.x + v[0], y: panRef.current.y + v[1] }; panRef.current = n; setPan(n); settle(n); }
    }
  };
  const onFocus = (v: number) => {
    setFocus(v);
    if (stage === 'focus' && focusSharp(v, BEST, p.focusTolerance) >= 0.85) setStage('find');
  };

  const blur = (1 - sharp) * 12;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="text-3xl font-bold">태양 투영판</div>
      <svg ref={svg} viewBox="0 0 800 600" width="800" height="600" className="touch-none rounded-3xl bg-[#1b2438] outline-none" tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <defs>
          <clipPath id="paper"><circle cx={C.x} cy={C.y} r={PAPER_R} /></clipPath>
          <filter id="sunblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={blur} /></filter>
          <radialGradient id="sunG" cx="0.4" cy="0.4"><stop offset="0" stopColor="#ffd166" /><stop offset="1" stopColor="#f59e0b" /></radialGradient>
        </defs>
        {/* 바닥과 그림자: 사선 시점 */}
        <ellipse cx="400" cy="560" rx="260" ry="26" fill="#000" opacity="0.35" />
        <ellipse cx={C.x + 30} cy="545" rx="190" ry="18" fill="#000" opacity="0.3" />
        {/* 종이 (원형 틀) */}
        <circle cx={C.x} cy={C.y} r={PAPER_R + 14} fill="#475569" />
        <circle cx={C.x} cy={C.y} r={PAPER_R} fill="#f8fafc" />
        <g clipPath="url(#paper)">
          {stage !== 'plate' && (
            <g filter="url(#sunblur)">
              <circle cx={img.x} cy={img.y} r={SUN_R} fill="url(#sunG)" />
              {(stage === 'find' ? SPOTS : []).map(s => (
                s.id === 'granule'
                  ? Array.from({ length: 14 }).map((_, i) => <circle key={i} cx={img.x + s.dx + Math.cos(i * 1.9) * (10 + (i % 4) * 9)} cy={img.y + s.dy + Math.sin(i * 1.9) * (10 + (i % 3) * 9)} r="7" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />)
                  : <circle key={s.id} cx={img.x + s.dx} cy={img.y + s.dy} r="13" fill="#3a2a10" />
              ))}
            </g>
          )}
        </g>
        <circle cx={C.x} cy={C.y} r={p.aimRadius} fill="none" stroke="#16a34a" strokeWidth="3" strokeDasharray="6 6" opacity={stage === 'aim' ? 1 : 0} />
        {SPOTS.filter(s => found.includes(s.id)).map(s => (
          <g key={s.id} className="anim-pop" style={{ transformOrigin: `${img.x + s.dx}px ${img.y + s.dy}px` }}>
            <circle cx={img.x + s.dx} cy={img.y + s.dy} r="30" fill="none" stroke="#22c55e" strokeWidth="5" />
            <text x={img.x + s.dx} y={img.y + s.dy - 38} textAnchor="middle" fontSize="22" fontWeight="700" fill="#166534" stroke="#fff" strokeWidth="4" paintOrder="stroke">{s.label}</text>
          </g>
        ))}
        {/* 경통과 차단판 자리 */}
        <g data-drop="tube" onClick={() => placeSelected('tube')} className={stage === 'plate' ? 'cursor-pointer' : ''}>
          <rect x="60" y="130" width="120" height="250" rx="22" fill="#64748b" stroke={stage === 'plate' ? '#fde68a' : '#94a3b8'} strokeWidth="6" strokeDasharray={stage === 'plate' ? '10 8' : undefined} />
          {stage !== 'plate' && <circle cx="120" cy="255" r="40" fill="#0f172a" className="anim-pop" style={{ transformOrigin: '120px 255px' }} />}
          <image href="/assets/telescope.webp" x="8" y="392" width="186" height="198" opacity="0.95" />
        </g>
      </svg>
      <div className="flex items-center gap-6 h-16">
        {stage === 'plate' && (
          <button type="button" {...bindCard('plate')} className={`px-7 py-3 rounded-full text-xl font-bold touch-none cursor-grab text-white border-4 ${selected === 'plate' ? 'bg-slate-600 border-yellow-300' : 'bg-slate-800 border-slate-400'}`} style={{ opacity: card ? 0.3 : 1 }}>차단판</button>
        )}
        {stage === 'focus' && <input type="range" min={0} max={1} step={0.01} value={focus} onChange={e => onFocus(Number(e.target.value))} className="w-96 h-10 accent-yellow-300" aria-label="초점 다이얼" />}
        <div className="text-xl text-red-300 w-[28rem]">{msg}</div>
      </div>
      {card && <div className="fixed pointer-events-none px-7 py-3 rounded-full text-xl font-bold bg-slate-800 text-white border-4 border-yellow-300 shadow-2xl" style={{ left: card.x - 40, top: card.y - 25, zIndex: 100 }}>차단판</div>}
    </div>
  );
}
