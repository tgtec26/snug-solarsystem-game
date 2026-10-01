'use client';

import { sfx } from '@snug/shared/src/audio';
import { useRef, useState, type PointerEvent } from 'react';
import { useDataStore } from '@/game/dataStore';
import { distance, focusSharp, photoAccuracy, starsFor, telescopeSunCheck } from '@/game/rules';

const C = { x: 400, y: 300 }; // 파인더 중앙
const VIEW_R = 210;
// 오른쪽 망원경: 받침 P 위에서 경통 끝(대물렌즈 쪽)을 끌면 하늘이 반대로 움직인다
const P = { x: 705, y: 548 };
const T0 = { x: 705, y: 425 };
const TIP_BOX = { x0: 615, x1: 795, y0: 320, y1: 525 };
const SUN_WORLD = { x: 130, y: 500 }; // 태양은 시야 밖 한쪽에 있다 (돌리다 가까워지면 막는다)
const TARGETS = [
  { kind: 'moon', world: { x: 560, y: 180 }, best: 0.62 }, // 232쪽: 상현달 밤
  { kind: 'planet', world: { x: 250, y: 130 }, best: 0.35 },
] as const;

/** 망원경 조준 (232~233쪽): 파인더 뚜껑 열기, 그다음 경통 끌어 십자선 중앙에, 그다음 초점 다이얼, 그다음 촬영. 달, 행성 순서. */
export function TelescopeOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const cfg = useDataStore(s => s.minigame)!;
  const t = cfg.telescope;
  const [stage, setStage] = useState<'cap' | 'aim' | 'focus' | 'shot'>('cap');
  const [idx, setIdx] = useState(0);
  const [cap, setCap] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focus, setFocus] = useState(0.05);
  const [aimDist, setAimDist] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const drag = useRef<{ kind: 'cap' | 'pan'; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const k = t.tipGain;
  const tip = { x: T0.x - pan.x / k, y: T0.y - pan.y / k };
  const svg = useRef<SVGSVGElement>(null);
  const panRef = useRef({ x: 0, y: 0 }); // 손을 뗄 때 최신 위치로 판정
  const capRef = useRef({ x: 0, y: 0 });
  const target = TARGETS[idx];
  const screenPos = (w: { x: number; y: number }, p = pan) => ({ x: w.x + p.x, y: w.y + p.y });
  const pos = screenPos(target.world);
  const sharp = focusSharp(focus, target.best, t.focusTolerance);

  const toSvg = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 800, y: ((e.clientY - r.top) / r.height) * 600 };
  };
  const tryPan = (next: { x: number; y: number }) => {
    // 빠르게 끌어도 태양 가까이를 건너뛰지 못하게 경로를 따라 확인한다
    const from = panRef.current;
    const steps = Math.max(1, Math.ceil(distance(from, next) / 10));
    for (let i = 1; i <= steps; i++) {
      const q = { x: from.x + ((next.x - from.x) * i) / steps, y: from.y + ((next.y - from.y) * i) / steps };
      const check = telescopeSunCheck({ x: SUN_WORLD.x + q.x, y: SUN_WORLD.y + q.y }, C, t.sunGuard);
      if (!check.ok) { setMistakes(m => m + 1); sfx.error(); setMsg(check.reason); return false; }
    }
    setMsg(''); panRef.current = next; setPan(next); return true;
  };

  const down = (e: PointerEvent<SVGSVGElement>) => {
    const p = toSvg(e);
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    if (stage === 'cap') drag.current = { kind: 'cap', sx: p.x, sy: p.y, ox: cap.x, oy: cap.y };
    else if (stage === 'aim') {
      // 경통 끝을 잡아야 움직인다 (잡은 자리와 끝의 차이를 기억해 튀지 않게)
      const tp = { x: T0.x - panRef.current.x / k, y: T0.y - panRef.current.y / k };
      if (distance(p, tp) <= 60) drag.current = { kind: 'pan', sx: tp.x - p.x, sy: tp.y - p.y, ox: 0, oy: 0 };
    }
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current; if (!d) return;
    const p = toSvg(e);
    if (d.kind === 'cap') { capRef.current = { x: d.ox + p.x - d.sx, y: d.oy + p.y - d.sy }; setCap(capRef.current); }
    else {
      const nx = Math.min(TIP_BOX.x1, Math.max(TIP_BOX.x0, p.x + d.sx)), ny = Math.min(TIP_BOX.y1, Math.max(TIP_BOX.y0, p.y + d.sy));
      tryPan({ x: (T0.x - nx) * k, y: (T0.y - ny) * k });
    }
  };
  const up = () => {
    const d = drag.current; drag.current = null;
    if (d?.kind === 'cap') {
      if (Math.hypot(capRef.current.x, capRef.current.y) > 150) setStage('aim'); else { capRef.current = { x: 0, y: 0 }; setCap({ x: 0, y: 0 }); }
    } else if (d?.kind === 'pan') settle(panRef.current);
  };
  /** 손을 뗀 뒤(또는 키를 누른 뒤) 중앙 원 안이면 접안렌즈로 */
  const settle = (p: { x: number; y: number }) => {
    const d = distance(screenPos(target.world, p), C);
    if (d <= t.aimRadius) { setAimDist(d); setStage('focus'); }
  };

  const key = (e: React.KeyboardEvent) => {
    if (e.repeat) return;
    const step = 14;
    if (stage === 'cap' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setStage('aim'); return; }
    if (stage === 'aim') {
      const dir: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const v = dir[e.key]; if (v) { e.preventDefault(); const n = { x: panRef.current.x + v[0], y: panRef.current.y + v[1] }; if (tryPan(n)) settle(n); }
    }
    if (stage === 'focus') {
      if (e.key === 'ArrowLeft') setFocus(f => Math.max(0, f - 0.04));
      else if (e.key === 'ArrowRight') setFocus(f => Math.min(1, f + 0.04));
      else if (e.key === 'Enter') shoot();
    }
  };

  const shoot = () => {
    if (stage !== 'focus') return;
    if (sharp < 0.5) { setMistakes(m => m + 1); sfx.error(); setMsg('초점이 흐려요'); return; }
    const acc = photoAccuracy(aimDist, t.aimRadius, sharp);
    const next = [...scores, acc];
    setScores(next); setMsg(''); setStage('shot'); sfx.correct();
    window.setTimeout(() => {
      if (idx + 1 >= TARGETS.length) onDone(starsFor(next.reduce((a, b) => a + b, 0) / next.length, mistakes === 0, cfg));
      else { setIdx(idx + 1); panRef.current = { x: 0, y: 0 }; setPan({ x: 0, y: 0 }); setFocus(0.05); setStage('aim'); }
    }, 1100);
  };

  const blur = (1 - sharp) * 10;
  const r = target.kind === 'moon' ? 70 : 52;
  const inView = stage === 'focus' || stage === 'shot';
  const tx = inView ? C.x : pos.x, ty = inView ? C.y : pos.y;
  const sunScreen = screenPos(SUN_WORLD);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/char/observer-scope.webp" alt="" draggable={false} className="absolute left-6 bottom-6 h-[360px] pointer-events-none" />
      <div className="text-3xl font-bold">{target.kind === 'moon' ? '달' : '행성'}을 찍어요 ({idx + 1}/{TARGETS.length})</div>
      <svg ref={svg} viewBox="0 0 800 600" width="800" height="600" className="touch-none rounded-3xl bg-[#05070f] outline-none" tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <defs>
          <linearGradient id="tubeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8fafc" /><stop offset="0.55" stopColor="#cbd5e1" /><stop offset="1" stopColor="#64748b" /></linearGradient>
          <clipPath id="view"><circle cx={C.x} cy={C.y} r={VIEW_R} /></clipPath>
          <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={blur} /></filter>
        </defs>
        {/* 밤하늘 (별은 경통을 따라 움직인다) */}
        {Array.from({ length: 40 }).map((_, i) => <circle key={i} cx={(i * 97) % 800 + (inView ? 0 : pan.x * 0.15)} cy={(i * 61) % 600 + (inView ? 0 : pan.y * 0.15)} r={i % 5 === 0 ? 2 : 1.2} fill="#fff" opacity="0.6" />)}
        {stage !== 'focus' && stage !== 'shot' && <image href="/assets/sun.webp" x={sunScreen.x - 50} y={sunScreen.y - 50} width="100" height="100" />}
        {/* 경통 그림자: 기울면 바닥에 길게 드리운다 */}
        <ellipse cx={400 + pan.x * -0.3} cy="560" rx={120 + Math.abs(pan.x) * 0.3} ry="14" fill="#000" opacity="0.5" />
        {/* 파인더 시야 */}
        <g clipPath="url(#view)">
          <rect x="0" y="0" width="800" height="600" fill="#0a1024" />
          {!inView && <image href="/assets/sun.webp" x={sunScreen.x - 50} y={sunScreen.y - 50} width="100" height="100" />}
          <g filter={inView ? 'url(#blur)' : undefined} className={stage === 'shot' ? 'anim-pop' : ''} style={{ transformOrigin: `${tx}px ${ty}px` }}>
            {target.kind === 'moon' ? (
              <>
                <image href="/assets/moon-ball.webp" x={tx - r} y={ty - r} width={r * 2} height={r * 2} />
                <path d={`M${tx} ${ty - r} A${r} ${r} 0 0 0 ${tx} ${ty + r} A${r * 0.45} ${r} 0 0 1 ${tx} ${ty - r}`} fill="#0a1024" opacity="0.85" />
              </>
            ) : (
              <>
                <image href="/assets/saturn.webp" x={tx - 118} y={ty - 78} width="236" height="156" />
              </>
            )}
          </g>
        </g>
        {/* 이름표: 어느 것이 태양이고 무엇을 찍는지 글자로 알려 준다 */}
        {stage !== 'focus' && stage !== 'shot' && <text x={sunScreen.x} y={sunScreen.y - 62} textAnchor="middle" fontSize="26" fontWeight="700" fill="#fde68a" stroke="#05070f" strokeWidth="5" paintOrder="stroke">태양</text>}
        {stage !== 'cap' && (inView || distance(pos, C) < VIEW_R) && <text x={inView ? C.x : pos.x} y={(inView ? C.y : pos.y) + r + 36} textAnchor="middle" fontSize="28" fontWeight="700" fill="#fff" stroke="#05070f" strokeWidth="5" paintOrder="stroke">{target.kind === 'moon' ? '달' : '행성'}</text>}
        <circle cx={C.x} cy={C.y} r={VIEW_R} fill="none" stroke="#94a3b8" strokeWidth="10" />
        {/* 십자선과 맞춤 원 */}
        <g stroke="#fde68a" strokeWidth="2" opacity="0.9">
          <line x1={C.x - VIEW_R} y1={C.y} x2={C.x + VIEW_R} y2={C.y} /><line x1={C.x} y1={C.y - VIEW_R} x2={C.x} y2={C.y + VIEW_R} />
        </g>
        <circle cx={C.x} cy={C.y} r={t.aimRadius} fill="none" stroke="#86efac" strokeWidth="3" strokeDasharray="6 6" />
        {/* 오른쪽 망원경: 경통 끝(대물렌즈)을 끌어 방향을 바꾼다. 받침은 고정, 경통은 받침 위에서 끝 쪽으로 기운다 */}
        {(() => {
          const len = Math.hypot(tip.x - P.x, tip.y - P.y);
          const ang = (Math.atan2(tip.y - P.y, tip.x - P.x) * 180) / Math.PI;
          return (
            <g>
              <ellipse cx={P.x} cy="590" rx="78" ry="9" fill="#000" opacity="0.45" />
              <g stroke="#475569" strokeWidth="7" strokeLinecap="round"><line x1={P.x} y1={P.y} x2={P.x - 64} y2="586" /><line x1={P.x} y1={P.y} x2={P.x + 64} y2="586" /><line x1={P.x} y1={P.y} x2={P.x + 4} y2="592" /></g>
              <g transform={`translate(${P.x} ${P.y}) rotate(${ang})`}>
                <rect x="-30" y="-8" width="32" height="16" rx="5" fill="#1e293b" />
                <rect x="0" y="-15" width={Math.max(10, len - 26)} height="30" rx="9" fill="url(#tubeG)" stroke="#475569" strokeWidth="2" />
                <rect x={len * 0.42} y="-18" width="9" height="36" rx="3" fill="#b45309" />
                <path d={`M${len - 30} -15 L${len - 4} -23 L${len - 4} 23 L${len - 30} 15 Z`} fill="#1e3a8a" stroke="#fbbf24" strokeWidth="2" />
                <ellipse cx={len - 4} cy="0" rx="6" ry="21" fill="#7dd3fc" stroke="#fbbf24" strokeWidth="3" />
              </g>
              <circle cx={P.x} cy={P.y} r="14" fill="#b45309" stroke="#fde68a" strokeWidth="3" />
              {stage === 'aim' && <circle cx={tip.x} cy={tip.y} r="34" fill="none" stroke="#fde68a" strokeWidth="4" strokeDasharray="8 7" className="animate-pulse" />}
            </g>
          );
        })()}
        {/* 파인더 뚜껑: 끌어서 연다 */}
        {stage === 'cap' && (
          <g transform={`translate(${cap.x} ${cap.y})`} className="cursor-grab">
            <circle cx={C.x} cy={C.y} r={VIEW_R} fill="#334155" stroke="#94a3b8" strokeWidth="10" />
            <circle cx={C.x} cy={C.y} r="40" fill="#475569" />
            <path d={`M${C.x - 18} ${C.y} h36 m-14 -14 l14 14 l-14 14`} stroke="#fde68a" strokeWidth="6" fill="none" strokeLinecap="round" className="anim-pop" />
          </g>
        )}
        {stage === 'shot' && <rect x="0" y="0" width="800" height="600" fill="#fff" className="anim-flash" />}
      </svg>
      <div className="flex items-center gap-6 h-16">
        {stage === 'focus' && (
          <>
            <input type="range" min={0} max={1} step={0.01} value={focus} onChange={e => setFocus(Number(e.target.value))} onKeyDown={e => { if (e.key === 'Enter') shoot(); }} className="w-96 h-10 accent-yellow-300" aria-label="초점 다이얼" />
            <button type="button" onClick={shoot} className="px-10 py-3 rounded-2xl bg-yellow-300 text-black text-2xl font-bold">촬영</button>
          </>
        )}
        <div className="text-xl text-red-300 w-[28rem]">{msg}</div>
      </div>
    </div>
  );
}
