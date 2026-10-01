'use client';

import { DragGhost } from '@snug/shared/src/DragGhost';
import { sfx } from '@snug/shared/src/audio';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useDragDrop } from '@snug/shared/src/useDragDrop';
import { useDataStore } from '@/game/dataStore';
import { moonLabelOk, moonPositionAngle, nearestSlot, starsFor } from '@/game/rules';
import { MoonDisc } from '@/components/MoonDisc';

const W = 1280, H = 800;
const E = { x: 520, y: 400 };
const ORBIT = 185;
const LAB = 262;          // 이름표 칸이 놓이는 반지름
const ORBIT_MS = 9000;    // 모두 돌아본 뒤 달이 한 바퀴 도는 시간
const LABELS = ['삭', '초승달', '상현달', '보름달', '하현달', '그믐달'];
// 화면 좌표: 태양은 오른쪽, 위치 1에서 8은 시계 반대 방향(위쪽으로 올라감)
const atAngle = (deg: number, rad = ORBIT) => { const a = (deg * Math.PI) / 180; return { x: E.x + Math.cos(a) * rad, y: E.y - Math.sin(a) * rad }; };
const at = (pos: number, rad = ORBIT) => atAngle(moonPositionAngle(pos), rad);

/** 달 위상판 (248~250쪽): 달을 끌어 8개 위치를 돌아본 뒤 달이 한 바퀴 도는 것을 보고, 이름표를 위치에 붙인다. */
export function MoonPhaseOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const cfg = useDataStore(s => s.minigame)!;
  const moon = useDataStore(s => s.moon)!;
  const [pos, setPos] = useState(1);
  const [seen, setSeen] = useState<number[]>([1]);
  const [anim, setAnim] = useState<number | null>(null); // 한 바퀴 도는 동안의 달 각도
  const [orbited, setOrbited] = useState(false);
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const allSeen = seen.length >= 8;
  const stage = !allSeen ? 'explore' : !orbited ? 'orbit' : 'label';

  const go = (p: number) => { setPos(p); setSeen(s => (s.includes(p) ? s : [...s, p])); };

  useEffect(() => {
    if (!allSeen || orbited) return;
    const start = moonPositionAngle(pos);
    let raf = 0;
    const timer = window.setTimeout(() => {
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / ORBIT_MS);
        setAnim(start + 360 * k);
        if (k < 1) raf = requestAnimationFrame(tick);
        else { setAnim(null); setOrbited(true); }
      };
      raf = requestAnimationFrame(tick);
    }, 800);
    return () => { window.clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [allSeen, orbited, pos]);

  const { drag, selected, bindCard, placeSelected } = useDragDrop((label, target) => {
    const p = Number(target.replace('pos-', ''));
    if (!moonLabelOk(moon, label, p)) { setMistakes(m => m + 1); sfx.error(); setMsg('그 위치의 모양과 달라요'); return; }
    setMsg('');
    const next = { ...placed, [p]: label };
    setPlaced(next); sfx.correct();
    if (Object.keys(next).length === LABELS.length) window.setTimeout(() => onDone(starsFor(LABELS.length / (LABELS.length + mistakes), mistakes === 0, cfg)), 1100);
  }, stage === 'label', { w: 100, h: 44 });

  const angleAt = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W - E.x;
    const y = ((e.clientY - r.top) / r.height) * H - E.y;
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
  const viewAngle = anim ?? moonPositionAngle(pos);
  const m = anim !== null ? atAngle(anim) : at(pos);
  const free = LABELS.filter(l => !Object.values(placed).includes(l));
  const hint = stage === 'explore' ? '달을 끌어서 8개 위치를 모두 돌아봐요' : stage === 'orbit' ? '달이 한 바퀴 돌아요. 오른쪽 아래 달 모양이 어떻게 바뀌는지 봐요' : '이름표를 해당하는 달 모양 칸에 놓아요';

  return (
    <div className="absolute inset-0">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0 touch-none bg-[#05070f] outline-none" tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <defs><linearGradient id="beam" x1="1" x2="0"><stop offset="0" stopColor="#ffd16666" /><stop offset="1" stopColor="#ffd16600" /></linearGradient></defs>
        {/* 위쪽: 돌아본 위치의 달 모양 */}
        {Array.from({ length: 8 }).map((_, i) => {
          const x = W / 2 + (i - 3.5) * 74, got = seen.includes(i + 1);
          return (
            <g key={i} opacity={got ? 1 : 0.25}>
              {got && <circle cx={x} cy="48" r="31" fill="none" stroke="#fde68a" strokeWidth="4" />}
              <MoonDisc pos={i + 1} cx={x} cy={48} r={26} />
            </g>
          );
        })}
        <rect x="740" y="0" width="540" height="800" fill="url(#beam)" />
        <image href="/assets/sun.webp" x="1060" y={E.y - 85} width="170" height="170" />
        <ellipse cx={E.x} cy={E.y + ORBIT + 40} rx="190" ry="18" fill="#000" opacity="0.4" />
        <circle cx={E.x} cy={E.y} r={ORBIT} fill="none" stroke="#ffffff33" strokeDasharray="6 8" strokeWidth="3" />
        <image href="/assets/earth-ball.webp" x={E.x - 46} y={E.y - 46} width="92" height="92" />
        {Array.from({ length: 8 }).map((_, i) => {
          const p = at(i + 1, ORBIT); const n = at(i + 1, LAB); const name = moon.positions[i].name;
          const slot = stage === 'label' && name; const got = seen.includes(i + 1);
          return (
            <g key={i}>
              {got ? (
                <g>
                  <circle cx={p.x} cy={p.y} r="22" fill="#fde68a33" />
                  <circle cx={p.x} cy={p.y} r="14" fill="#fde68a" stroke="#fff" strokeWidth="3" />
                </g>
              ) : <circle cx={p.x} cy={p.y} r="7" fill="#05070f" stroke="#ffffff66" strokeWidth="2" />}
              {stage === 'label' && (
                <g data-drop={name ? `pos-${i + 1}` : undefined} onClick={() => name && placeSelected(`pos-${i + 1}`)} className={name ? 'cursor-pointer' : ''}>
                  <rect x={n.x - 58} y={n.y - 32} width="116" height="64" rx="18" fill={placed[i + 1] ? '#16653455' : '#ffffff14'} stroke={placed[i + 1] ? '#86efac' : slot ? (selected ? '#fde68a' : '#ffffff77') : '#ffffff22'} strokeWidth={slot ? 3 : 2} strokeDasharray={slot && !placed[i + 1] ? '8 6' : undefined} />
                  <MoonDisc pos={i + 1} cx={n.x - (placed[i + 1] ? 26 : 0)} cy={n.y} r={24} />
                  {placed[i + 1] && <text x={n.x + 22} y={n.y + 7} fontSize="18" fontWeight="700" fill="#bbf7d0" textAnchor="middle">{placed[i + 1]}</text>}
                </g>
              )}
            </g>
          );
        })}
        {/* 달(끌기): 태양 쪽 면이 밝다 */}
        <ellipse cx={m.x + 6} cy={m.y + 40} rx="30" ry="9" fill="#000" opacity="0.45" />
        <circle cx={m.x} cy={m.y} r="36" fill="#1a2036" stroke="#fde68a" strokeWidth="5" className="cursor-grab" />
        <path d={`M${m.x} ${m.y - 36} A36 36 0 0 1 ${m.x} ${m.y + 36} Z`} fill="#f4f1e6" />
        {/* 지구 시점 창: 가장 중요한 부분이라 크게 */}
        <rect x="950" y="500" width="300" height="275" rx="26" fill="#0a1024" stroke="#fde68a88" strokeWidth="4" />
        <text x="1100" y="538" textAnchor="middle" fontSize="22" fontWeight="700" fill="#fef9c3">지구에서 본 달</text>
        <MoonDisc angle={viewAngle} cx={1100} cy={650} r={92} />
        {stage === 'explore' && seen.length < 2 && <path d={`M${E.x + ORBIT - 10} ${E.y - 40} q 0 -90 -70 -150`} fill="none" stroke="#fde68a" strokeWidth="9" strokeLinecap="round" className="animate-pulse" />}
      </svg>
      <div className="absolute bottom-3 left-0 w-[940px] flex flex-col items-center gap-2">
        <div className={`text-xl h-7 ${msg ? 'text-red-300' : 'text-yellow-100'}`} style={{ wordBreak: 'keep-all' }}>{msg || hint}</div>
        <div className="flex items-center gap-4 h-12">
          {stage === 'label' && free.map(l => (
            <button key={l} type="button" {...bindCard(l)} className={`px-5 py-2 rounded-xl text-xl font-bold touch-none cursor-grab text-black ${selected === l ? 'bg-yellow-300 ring-4 ring-yellow-100' : 'bg-yellow-100'}`} style={{ opacity: drag?.id === l ? 0.3 : 1 }}>{l}</button>
          ))}
        </div>
      </div>
      {drag && <DragGhost x={drag.x} y={drag.y}><div className="px-5 py-2 rounded-xl text-xl font-bold bg-yellow-300 text-black shadow-2xl">{drag.id}</div></DragGhost>}
    </div>
  );
}
