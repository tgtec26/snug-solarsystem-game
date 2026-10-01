'use client';

import { DragGhost } from '@snug/shared/src/DragGhost';
import { sfx } from '@snug/shared/src/audio';
import { useRef, useState, type PointerEvent } from 'react';
import { useDragDrop } from '@snug/shared/src/useDragDrop';
import { useDataStore } from '@/game/dataStore';
import { moonLabelOk, moonPositionAngle, nearestSlot, starsFor } from '@/game/rules';
import { MoonDisc } from '@/components/MoonDisc';

const E = { x: 320, y: 300 };
const ORBIT = 185;
const LABELS = ['삭', '초승달', '상현달', '보름달', '하현달', '그믐달'];
// 화면 좌표: 태양은 오른쪽, 위치 1에서 8은 시계 반대 방향(위쪽으로 올라감)
const at = (pos: number, rad = ORBIT) => { const a = (moonPositionAngle(pos) * Math.PI) / 180; return { x: E.x + Math.cos(a) * rad, y: E.y - Math.sin(a) * rad }; };

/** 달 위상판 (248~250쪽): 달을 끌어 8개 위치를 돌아보고, 이름표를 위치에 붙인다. */
export function MoonPhaseOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const cfg = useDataStore(s => s.minigame)!;
  const moon = useDataStore(s => s.moon)!;
  const [pos, setPos] = useState(1);
  const [seen, setSeen] = useState<number[]>([1]);
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const stage = seen.length < 8 ? 'explore' : 'label';

  const go = (p: number) => { setPos(p); setSeen(s => (s.includes(p) ? s : [...s, p])); };
  const { drag, selected, bindCard, placeSelected } = useDragDrop((label, target) => {
    const p = Number(target.replace('pos-', ''));
    if (!moonLabelOk(moon, label, p)) { setMistakes(m => m + 1); sfx.error(); setMsg('그 위치의 모양과 달라요'); return; }
    setMsg('');
    const next = { ...placed, [p]: label };
    setPlaced(next); sfx.correct();
    if (Object.keys(next).length === LABELS.length) window.setTimeout(() => onDone(starsFor(LABELS.length / (LABELS.length + mistakes), mistakes === 0, cfg)), 1100);
  }, stage === 'label');

  const angleAt = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 800 - E.x;
    const y = ((e.clientY - r.top) / r.height) * 600 - E.y;
    return (Math.atan2(-y, x) * 180) / Math.PI; // 위쪽이 +, 시계 반대가 증가
  };
  const down = (e: PointerEvent<SVGSVGElement>) => { if (stage !== 'explore') return; (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); dragging.current = true; go(nearestSlot(angleAt(e), 8) + 1); };
  const move = (e: PointerEvent<SVGSVGElement>) => { if (dragging.current) go(nearestSlot(angleAt(e), 8) + 1); };
  const up = () => { dragging.current = false; };
  const key = (e: React.KeyboardEvent) => {
    if (e.repeat || stage !== 'explore') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go((pos % 8) + 1);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(((pos + 6) % 8) + 1);
  };
  const m = at(pos);
  const free = LABELS.filter(l => !Object.values(placed).includes(l));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="flex gap-2 h-8 items-center">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className={`w-7 h-7 rounded-full border-2 ${seen.includes(i + 1) ? 'bg-yellow-300 border-yellow-100' : 'border-white/40'}`} />)}
      </div>
      <svg ref={svg} viewBox="0 0 800 600" width="800" height="600" className="touch-none rounded-3xl bg-[#05070f] outline-none" tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <defs><linearGradient id="beam" x1="1" x2="0"><stop offset="0" stopColor="#ffd16655" /><stop offset="1" stopColor="#ffd16600" /></linearGradient></defs>
        <rect x="430" y="60" width="370" height="480" fill="url(#beam)" />
        <image href="/assets/sun.webp" x="670" y="240" width="120" height="120" />
        <ellipse cx={E.x} cy={E.y + ORBIT + 36} rx="170" ry="16" fill="#000" opacity="0.4" />
        <circle cx={E.x} cy={E.y} r={ORBIT} fill="none" stroke="#ffffff33" strokeDasharray="6 8" strokeWidth="3" />
        <image href="/assets/earth-ball.webp" x={E.x - 38} y={E.y - 38} width="76" height="76" />
        {Array.from({ length: 8 }).map((_, i) => {
          const p = at(i + 1, ORBIT); const n = at(i + 1, ORBIT + 60); const name = moon.positions[i].name;
          const slot = stage === 'label' && name;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="9" fill={seen.includes(i + 1) ? '#fde68a' : '#ffffff55'} />
              {stage === 'label' && (
                <g data-drop={name ? `pos-${i + 1}` : undefined} onClick={() => name && placeSelected(`pos-${i + 1}`)} className={name ? 'cursor-pointer' : ''}>
                  <rect x={n.x - 52} y={n.y - 36} width="104" height="72" rx="18" fill={placed[i + 1] ? '#16653455' : '#ffffff14'} stroke={placed[i + 1] ? '#86efac' : slot ? (selected ? '#fde68a' : '#ffffff77') : '#ffffff22'} strokeWidth={slot ? 3 : 2} strokeDasharray={slot && !placed[i + 1] ? '8 6' : undefined} />
                  <MoonDisc pos={i + 1} cx={n.x - (placed[i + 1] ? 22 : 0)} cy={n.y} r={22} />
                  {placed[i + 1] && <text x={n.x + 22} y={n.y + 7} fontSize="20" fontWeight="700" fill="#bbf7d0" textAnchor="middle">{placed[i + 1]}</text>}
                </g>
              )}
            </g>
          );
        })}
        {/* 달(끌기): 구 모양 음영, 태양 쪽 면이 밝다 */}
        <ellipse cx={m.x + 6} cy={m.y + 30} rx="22" ry="7" fill="#000" opacity="0.45" />
        <circle cx={m.x} cy={m.y} r="28" fill="#1a2036" stroke="#fde68a" strokeWidth="4" className="cursor-grab" />
        <path d={`M${m.x} ${m.y - 28} A28 28 0 0 1 ${m.x} ${m.y + 28} Z`} fill="#f4f1e6" />
        {/* 지구 시점 창 */}
        <rect x="620" y="440" width="160" height="130" rx="20" fill="#0a1024" stroke="#ffffff44" strokeWidth="3" />
        <MoonDisc pos={pos} cx={700} cy={505} r={42} />
        {stage === 'explore' && seen.length < 2 && <path d={`M${E.x + ORBIT - 10} ${E.y - 40} q 0 -90 -70 -150`} fill="none" stroke="#fde68a" strokeWidth="9" strokeLinecap="round" className="animate-pulse" />}
      </svg>
      <div className="flex items-center gap-4 h-16">
        {stage === 'label' && free.map(l => (
          <button key={l} type="button" {...bindCard(l)} className={`px-5 py-2 rounded-xl text-xl font-bold touch-none cursor-grab text-black ${selected === l ? 'bg-yellow-300 ring-4 ring-yellow-100' : 'bg-yellow-100'}`} style={{ opacity: drag?.id === l ? 0.3 : 1 }}>{l}</button>
        ))}
        <div className="text-xl text-red-300 w-72">{msg}</div>
      </div>
      {drag && <DragGhost x={drag.x} y={drag.y}><div className="px-5 py-2 rounded-xl text-xl font-bold bg-yellow-300 text-black shadow-2xl">{drag.id}</div></DragGhost>}
    </div>
  );
}
