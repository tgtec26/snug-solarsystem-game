'use client';

import { DragGhost } from '@snug/shared/src/DragGhost';
import { sfx } from '@snug/shared/src/audio';
import { useRef, useState, type PointerEvent } from 'react';
import { useDragDrop } from '@snug/shared/src/useDragDrop';
import { ZodiacCard } from '@/components/ZodiacCard';
import { useDataStore } from '@/game/dataStore';
import { chairBoards, midnightConstellation, nearestSlot, starsFor, sunConstellation, zodiacSlotOk } from '@/game/rules';

const C = { x: 400, y: 290 };
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (deg: number, r: number) => ({ x: C.x + Math.cos(rad(deg)) * r, y: C.y - Math.sin(rad(deg)) * r }); // 위쪽 +, 시계 반대 증가
const CARD_W = 76;
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
  const [turned, setTurned] = useState(false); // 지구를 한 번이라도 돌렸는가
  const earthDrag = useRef(false);
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const [flash, setFlash] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const seatRef = useRef(0); // 손을 뗄 때 최신 자리로 판정
  const pick = (s: number) => { seatRef.current = s; setSeat(s); };
  const TOTAL = targets.length + sky.zodiac.length;

  const view = chairBoards(sky, sky.boards[seat].id)!;
  const board = (id: string) => sky.boards.find(b => b.id === id)!;
  const target = targets[round];

  const confirmSeat = (s: number) => {
    if (phase !== 'chair' || flash) return;
    const v = chairBoards(sky, sky.boards[s].id)!;
    if (v.night !== target) { setMistakes(m => m + 1); sfx.error(); setMsg('전등 건너편 판은 빛에 가려서 안 보여요'); return; }
    setMsg(''); setFlash(true); sfx.correct();
    window.setTimeout(() => { setFlash(false); if (round + 1 >= targets.length) setPhase('ring'); else setRound(round + 1); }, 1000);
  };
  const angleAt = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return (Math.atan2(-(((e.clientY - r.top) / r.height) * 600 - C.y), ((e.clientX - r.left) / r.width) * 800 - C.x) * 180) / Math.PI - 90;
  };
  const svgPt = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 800, y: ((e.clientY - r.top) / r.height) * 600 };
  };
  /** 지구를 잡고 돌리면 가장 가까운 달 자리로 붙는다 */
  const monthAt = (e: PointerEvent) => {
    const q = svgPt(e);
    const a = (Math.atan2(-(q.y - C.y), q.x - C.x) * 180) / Math.PI; // 지구 각도 = monthAngle(month) + 180
    return ((Math.round((a - 270) / 30) % 12) + 12) % 12 + 1;
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (phase === 'ring') {
      const q = svgPt(e), ep = pt(monthAngle(month) + 180, 150);
      if (Math.hypot(q.x - ep.x, q.y - ep.y) > 70) return;
      (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); earthDrag.current = true; return;
    }
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); dragging.current = true; pick(nearestSlot(angleAt(e), 4));
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (earthDrag.current) { const m = monthAt(e); if (m !== month) { setMonth(m); setTurned(true); } return; }
    if (dragging.current) pick(nearestSlot(angleAt(e), 4));
  };
  const up = () => {
    earthDrag.current = false;
    if (!dragging.current) return; dragging.current = false; confirmSeat(seatRef.current);
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.repeat || phase !== 'chair') return;
    if (e.key === 'ArrowLeft') pick((seatRef.current + 1) % 4);
    else if (e.key === 'ArrowRight') pick((seatRef.current + 3) % 4);
    else if (e.key === 'Enter') confirmSeat(seatRef.current);
  };

  const { drag, over, selected, bindCard, placeSelected } = useDragDrop((id, slot) => {
    const m = Number(slot.replace('slot-', ''));
    if (!zodiacSlotOk(sky, id, m)) { setMistakes(x => x + 1); sfx.error(); setMsg('태양은 별자리 사이를 서쪽에서 동쪽으로 지나요'); return; }
    setMsg('');
    const next = { ...placed, [m]: id };
    setPlaced(next); sfx.correct();
    if (Object.keys(next).length === sky.zodiac.length) window.setTimeout(() => onDone(starsFor(TOTAL / (TOTAL + mistakes), mistakes === 0, cfg)), 1100);
  }, phase === 'ring', { w: CARD_W, h: CARD_W * 1.5 });
  const nameOf = (id: string) => sky.zodiac.find(z => z.id === id)!.name;
  const [order] = useState(() => shuffle(sky.zodiac.map(z => z.id))); // 카드가 달 순서대로 나오면 답이 보인다
  const hi = [sunConstellation(sky, month), midnightConstellation(sky, month)]; // 지금 달에서 태양 쪽·한밤중에 해당하는 별자리
  const hiMonths = [month, ((month + 5) % 12) + 1];
  const cardCol = (ids: string[]) => (
    <div className="flex flex-col gap-1">{ids.map(id => Object.values(placed).includes(id) ? <div key={id} style={{ width: CARD_W, height: CARD_W * 1.5 }} /> : (
      <button key={id} type="button" {...bindCard(id)} aria-label={nameOf(id)} className={`touch-none cursor-grab rounded-lg ${selected === id ? 'ring-4 ring-yellow-300' : ''}`} style={hi.includes(id) ? { boxShadow: '0 0 0 4px #fbbf24, 0 0 18px 6px #fbbf2488' } : undefined}>
        <ZodiacCard id={id} name={nameOf(id)} w={CARD_W} faded={drag?.id === id} />
      </button>
    ))}</div>
  );

  return (
    <div className={`absolute inset-0 flex items-center justify-center ${phase === 'ring' ? 'gap-5' : 'flex-col gap-3'}`}>
      {phase === 'ring' && cardCol(order.slice(0, 6))}
      <svg ref={svg} viewBox="0 0 800 600" width={phase === 'ring' ? 960 : 800} height={phase === 'ring' ? 720 : 600} className="touch-none rounded-3xl bg-[#05070f] outline-none" tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <ellipse cx={C.x} cy="570" rx="250" ry="18" fill="#000" opacity="0.4" />
        {/* 전등(태양) */}
        <image href="/assets/sun.webp" x={C.x - 65} y={C.y - 65} width="130" height="130" />
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
                <image href="/assets/observer.webp" x={p.x - 28} y={p.y - 76} width="56" height="84" className={flash ? 'anim-pop' : 'cursor-grab'} style={{ transformOrigin: `${p.x}px ${p.y}px` }} />
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
                  <circle cx={p.x} cy={p.y} r="34" fill={done ? '#16653466' : '#ffffff14'} stroke={done ? '#86efac' : selected || over === `slot-${z.month}` || hiMonths.includes(z.month) ? '#fbbf24' : '#ffffff55'} strokeWidth={!done && hiMonths.includes(z.month) ? 5 : 3} strokeDasharray={done ? undefined : '8 6'} />
                  {done && <image href={`/assets/zodiac/${done}.webp`} x={p.x - 22} y={p.y - 30} width="44" height="44" />}
                  {done && <text x={p.x} y={p.y + 26} textAnchor="middle" fontSize="14" fontWeight="700" fill="#bbf7d0">{nameOf(done).replace('자리', '')}</text>}
                  {done && <text x={p.x} y={p.y + 50} textAnchor="middle" fontSize="15" fill="#ffffffaa">{z.month}월</text>}
                </g>
              );
            })}
            {(() => { const e = pt(monthAngle(month) + 180, 150); return (
              <g>
                <line x1={C.x} y1={C.y} x2={pt(monthAngle(month), 200).x} y2={pt(monthAngle(month), 200).y} stroke="#ffd16688" strokeWidth="3" strokeDasharray="4 6" />
                <circle cx={e.x} cy={e.y} r="26" fill="none" stroke="#fde68a" strokeWidth="3" strokeDasharray="6 6" className={turned ? '' : 'animate-pulse'} />
                <image href="/assets/earth-ball.webp" x={e.x - 18} y={e.y - 18} width="36" height="36" className="cursor-grab" />
                <text x={e.x} y={e.y + 46} textAnchor="middle" fontSize="22" fontWeight="700" fill="#fde68a" stroke="#05070f" strokeWidth="4" paintOrder="stroke">{month}월</text>
              </g>); })()}
          </>
        )}
        {phase === 'ring' && <text x="400" y="588" textAnchor="middle" fontSize="20" fontWeight="700" fill={msg ? '#fca5a5' : '#fef9c3'} stroke="#05070f" strokeWidth="4" paintOrder="stroke">{msg || (turned ? '금색 테두리 카드를 금색 칸에 붙여요' : '지구를 잡고 돌려 봐요')}</text>}
      </svg>
      {phase === 'ring' && cardCol(order.slice(6))}
      {phase === 'chair' && <div className="flex items-center gap-4 min-h-20 flex-wrap justify-center w-[1180px]">
        <div className="text-xl text-red-300 w-full text-center h-7">{msg}</div>
      </div>}
      {drag && <DragGhost x={drag.x} y={drag.y}><ZodiacCard id={drag.id} name={nameOf(drag.id)} w={CARD_W} /></DragGhost>}
    </div>
  );
}
