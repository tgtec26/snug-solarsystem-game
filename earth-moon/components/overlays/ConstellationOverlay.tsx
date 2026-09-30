'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { useDragDrop } from '@snug/shared/src/useDragDrop';
import { useDataStore } from '@/game/dataStore';
import { chairBoards, midnightConstellation, nearestSlot, starsFor, sunConstellation, zodiacSlotOk } from '@/game/rules';

const C = { x: 400, y: 290 };
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (deg: number, r: number) => ({ x: C.x + Math.cos(rad(deg)) * r, y: C.y - Math.sin(rad(deg)) * r }); // 위쪽 +, 시계 반대 증가
const boardAngle = (i: number) => 90 + 90 * i;
const monthAngle = (m: number) => 90 + 30 * (m - 1);
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** 별자리 (246~247쪽): 회전의자 모형에서 관찰자를 옮겨 목표 판을 한밤중 하늘에 보이게 한 뒤, 황도 12궁 카드를 링에 붙인다. */
export function ConstellationOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const cfg = useDataStore(s => s.minigame)!;
  const sky = useDataStore(s => s.sky)!;
  const [phase, setPhase] = useState<'chair' | 'ring'>('chair');
  const [targets] = useState(() => shuffle(sky.boards.map(b => b.id)).slice(0, 3));
  const [round, setRound] = useState(0);
  const [seat, setSeat] = useState(0);
  const [month, setMonth] = useState(8);
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const [flash, setFlash] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const TOTAL = targets.length + sky.zodiac.length;

  const view = chairBoards(sky, sky.boards[seat].id)!;
  const board = (id: string) => sky.boards.find(b => b.id === id)!;
  const target = targets[round];

  const confirmSeat = (s: number) => {
    if (phase !== 'chair' || flash) return;
    const v = chairBoards(sky, sky.boards[s].id)!;
    if (v.night !== target) { setMistakes(m => m + 1); setMsg('전등 건너편 판은 빛에 가려서 안 보여요'); return; }
    setMsg(''); setFlash(true);
    window.setTimeout(() => { setFlash(false); if (round + 1 >= targets.length) setPhase('ring'); else setRound(round + 1); }, 1000);
  };
  const angleAt = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return (Math.atan2(-(((e.clientY - r.top) / r.height) * 600 - C.y), ((e.clientX - r.left) / r.width) * 800 - C.x) * 180) / Math.PI - 90;
  };
  const down = (e: PointerEvent<SVGSVGElement>) => { if (phase !== 'chair') return; (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); dragging.current = true; setSeat(nearestSlot(angleAt(e), 4)); };
  const move = (e: PointerEvent<SVGSVGElement>) => { if (dragging.current) setSeat(nearestSlot(angleAt(e), 4)); };
  const up = () => { if (!dragging.current) return; dragging.current = false; confirmSeat(seat); };
  const key = (e: React.KeyboardEvent) => {
    if (e.repeat || phase !== 'chair') return;
    if (e.key === 'ArrowLeft') setSeat(s => (s + 1) % 4);
    else if (e.key === 'ArrowRight') setSeat(s => (s + 3) % 4);
    else if (e.key === 'Enter') confirmSeat(seat);
  };

  const { drag, selected, bindCard, placeSelected } = useDragDrop((id, slot) => {
    const m = Number(slot.replace('slot-', ''));
    if (!zodiacSlotOk(sky, id, m)) { setMistakes(x => x + 1); setMsg('태양은 별자리 사이를 서쪽에서 동쪽으로 지나요'); return; }
    setMsg('');
    const next = { ...placed, [m]: id };
    setPlaced(next);
    if (Object.keys(next).length === sky.zodiac.length) window.setTimeout(() => onDone(starsFor(TOTAL / (TOTAL + mistakes), mistakes === 0, cfg)), 1100);
  }, phase === 'ring');
  const nameOf = (id: string) => sky.zodiac.find(z => z.id === id)!.name;
  const free = sky.zodiac.filter(z => !Object.values(placed).includes(z.id));
  const sunName = nameOf(sunConstellation(sky, month)!), nightName = nameOf(midnightConstellation(sky, month)!);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <svg ref={svg} viewBox="0 0 800 600" width="800" height="600" className="touch-none rounded-3xl bg-[#05070f] outline-none" tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <ellipse cx={C.x} cy="570" rx="250" ry="18" fill="#000" opacity="0.4" />
        {/* 전등(태양) */}
        <circle cx={C.x} cy={C.y} r="46" fill="#ffd16644" /><circle cx={C.x} cy={C.y} r="26" fill="#ffd166" />
        {phase === 'chair' ? (
          <>
            <circle cx={C.x} cy={C.y} r="130" fill="none" stroke="#ffffff33" strokeDasharray="6 8" strokeWidth="3" />
            {sky.boards.map((b, i) => {
              const p = pt(boardAngle(i), 230); const sunSide = b.id === view.sun; const isTarget = b.id === target;
              return (
                <g key={b.id} opacity={sunSide ? 0.3 : 1}>
                  <rect x={p.x - 62} y={p.y - 34} width="124" height="68" rx="12" fill="#101a3a" stroke={isTarget ? '#fde68a' : '#ffffff55'} strokeWidth={isTarget ? 6 : 2} className={isTarget ? 'animate-pulse' : ''} />
                  <text x={p.x} y={p.y + 9} textAnchor="middle" fontSize="26" fontWeight="700" fill="#fff">{b.label}</text>
                </g>
              );
            })}
            {(() => { const p = pt(boardAngle(seat), 130); return (
              <g>
                <ellipse cx={p.x + 4} cy={p.y + 26} rx="20" ry="7" fill="#000" opacity="0.5" />
                <circle cx={p.x} cy={p.y} r="22" fill="#fde68a" stroke="#92400e" strokeWidth="5" className={flash ? 'anim-pop' : 'cursor-grab'} style={{ transformOrigin: `${p.x}px ${p.y}px` }} />
              </g>); })()}
            <path d={`M${C.x + 60} ${C.y - 70} A 90 90 0 0 0 ${C.x - 70} ${C.y - 60}`} stroke="#fde68a" strokeWidth="8" fill="none" strokeLinecap="round" className="animate-pulse" opacity={round === 0 && seat === 0 ? 1 : 0} />
            {/* 한밤중 하늘 창 */}
            <rect x="600" y="30" width="170" height="110" rx="16" fill="#0a1024" stroke={flash ? '#86efac' : '#ffffff55'} strokeWidth="4" />
            {[[20, 30], [70, 60], [120, 40], [50, 90], [135, 85]].map(([x, y], i) => <circle key={i} cx={600 + x} cy={30 + y} r="3" fill="#fff" />)}
            <text x="685" y="98" textAnchor="middle" fontSize="34" fontWeight="700" fill="#fde68a">{board(view.night).label}</text>
          </>
        ) : (
          <>
            <circle cx={C.x} cy={C.y} r="150" fill="none" stroke="#ffffff33" strokeDasharray="6 8" strokeWidth="3" />
            {sky.zodiac.map(z => {
              const p = pt(monthAngle(z.month), 235); const done = placed[z.month];
              return (
                <g key={z.month} data-drop={`slot-${z.month}`} onClick={() => placeSelected(`slot-${z.month}`)} className="cursor-pointer">
                  <circle cx={p.x} cy={p.y} r="34" fill={done ? '#16653466' : '#ffffff14'} stroke={done ? '#86efac' : selected ? '#fde68a' : '#ffffff55'} strokeWidth="3" strokeDasharray={done ? undefined : '8 6'} />
                  {done && <text x={p.x} y={p.y + 6} textAnchor="middle" fontSize="16" fontWeight="700" fill="#bbf7d0">{nameOf(done).replace('자리', '')}</text>}
                  {done && <text x={p.x} y={p.y + 50} textAnchor="middle" fontSize="15" fill="#ffffffaa">{z.month}월</text>}
                </g>
              );
            })}
            {(() => { const e = pt(monthAngle(month) + 180, 150); return (
              <g>
                <line x1={C.x} y1={C.y} x2={pt(monthAngle(month), 200).x} y2={pt(monthAngle(month), 200).y} stroke="#ffd16688" strokeWidth="3" strokeDasharray="4 6" />
                <circle cx={e.x} cy={e.y} r="22" fill="#2b6cb0" stroke="#fff" strokeWidth="3" />
              </g>); })()}
          </>
        )}
      </svg>
      <div className="flex items-center gap-4 h-20 flex-wrap justify-center w-[1000px]">
        {phase === 'ring' && <div className="w-full text-center text-xl text-yellow-200">{month}월 · 태양 쪽 {sunName} · 한밤중 남쪽 {nightName}</div>}
        {phase === 'ring' && <input type="range" min={1} max={12} step={1} value={month} onChange={e => setMonth(Number(e.target.value))} className="w-56 h-10 accent-yellow-300" aria-label="달" />}
        {phase === 'ring' && free.map(z => (
          <button key={z.id} type="button" {...bindCard(z.id)} className={`px-3 py-1.5 rounded-lg text-lg font-bold touch-none cursor-grab text-black ${selected === z.id ? 'bg-yellow-300 ring-4 ring-yellow-100' : 'bg-yellow-100'}`} style={{ opacity: drag?.id === z.id ? 0.3 : 1 }}>{z.name}</button>
        ))}
        <div className="text-xl text-red-300 w-full text-center h-7">{msg}</div>
      </div>
      {drag && <div className="fixed pointer-events-none px-3 py-1.5 rounded-lg text-lg font-bold bg-yellow-300 text-black shadow-2xl" style={{ left: drag.x - 40, top: drag.y - 20, zIndex: 100 }}>{nameOf(drag.id)}</div>}
    </div>
  );
}
