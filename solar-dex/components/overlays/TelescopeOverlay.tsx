'use client';

import { sfx } from '@snug/shared/src/audio';
import { useRef, useState, type PointerEvent } from 'react';
import { useDataStore } from '@/game/dataStore';
import { distance, focusSharp, photoAccuracy, starsFor, telescopeSunCheck } from '@/game/rules';

const C = { x: 400, y: 300 }; // 파인더 중앙
const VIEW_R = 210;
const SUN_WORLD = { x: 130, y: 500 }; // 태양은 시야 밖 한쪽에 있다 (돌리다 가까워지면 막는다)
const TARGETS = [
  { kind: 'moon', world: { x: 560, y: 180 }, best: 0.62 }, // 232쪽: 상현달 밤
  { kind: 'planet', world: { x: 250, y: 130 }, best: 0.35 },
] as const;

/** 망원경 조준 (232~233쪽): 파인더 뚜껑 열기 → 경통 끌어 십자선 중앙에 → 초점 다이얼 → 촬영. 달, 행성 순서. */
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
  const svg = useRef<SVGSVGElement>(null);
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
    const steps = Math.max(1, Math.ceil(distance(pan, next) / 10));
    for (let i = 1; i <= steps; i++) {
      const q = { x: pan.x + ((next.x - pan.x) * i) / steps, y: pan.y + ((next.y - pan.y) * i) / steps };
      const check = telescopeSunCheck({ x: SUN_WORLD.x + q.x, y: SUN_WORLD.y + q.y }, C, t.sunGuard);
      if (!check.ok) { setMistakes(m => m + 1); sfx.error(); setMsg(check.reason); return false; }
    }
    setMsg(''); setPan(next); return true;
  };

  const down = (e: PointerEvent<SVGSVGElement>) => {
    const p = toSvg(e);
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    if (stage === 'cap') drag.current = { kind: 'cap', sx: p.x, sy: p.y, ox: cap.x, oy: cap.y };
    else if (stage === 'aim') drag.current = { kind: 'pan', sx: p.x, sy: p.y, ox: pan.x, oy: pan.y };
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current; if (!d) return;
    const p = toSvg(e);
    const dx = p.x - d.sx, dy = p.y - d.sy;
    if (d.kind === 'cap') setCap({ x: d.ox + dx, y: d.oy + dy });
    else tryPan({ x: d.ox + dx, y: d.oy + dy });
  };
  const up = () => {
    const d = drag.current; drag.current = null;
    if (d?.kind === 'cap') {
      if (Math.hypot(cap.x, cap.y) > 150) setStage('aim'); else setCap({ x: 0, y: 0 });
    } else if (d?.kind === 'pan') settle(pan);
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
      const v = dir[e.key]; if (v) { e.preventDefault(); const n = { x: pan.x + v[0], y: pan.y + v[1] }; if (tryPan(n)) settle(n); }
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
      else { setIdx(idx + 1); setPan({ x: 0, y: 0 }); setFocus(0.05); setStage('aim'); }
    }, 1100);
  };

  const blur = (1 - sharp) * 10;
  const r = target.kind === 'moon' ? 70 : 52;
  const inView = stage === 'focus' || stage === 'shot';
  const tx = inView ? C.x : pos.x, ty = inView ? C.y : pos.y;
  const sunScreen = screenPos(SUN_WORLD);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="text-3xl font-bold">{target.kind === 'moon' ? '달' : '행성'}을 찍어요 ({idx + 1}/{TARGETS.length})</div>
      <svg ref={svg} viewBox="0 0 800 600" width="800" height="600" className="touch-none rounded-3xl bg-[#05070f] outline-none" tabIndex={0} onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <defs>
          <clipPath id="view"><circle cx={C.x} cy={C.y} r={VIEW_R} /></clipPath>
          <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={blur} /></filter>
          <radialGradient id="moonG" cx="0.35" cy="0.4"><stop offset="0" stopColor="#f4f1e6" /><stop offset="1" stopColor="#a9a596" /></radialGradient>
          <radialGradient id="planetG" cx="0.35" cy="0.35"><stop offset="0" stopColor="#f3c58b" /><stop offset="1" stopColor="#9a5b2b" /></radialGradient>
        </defs>
        {/* 밤하늘 (별은 경통을 따라 움직인다) */}
        {Array.from({ length: 40 }).map((_, i) => <circle key={i} cx={(i * 97) % 800 + (inView ? 0 : pan.x * 0.15)} cy={(i * 61) % 600 + (inView ? 0 : pan.y * 0.15)} r={i % 5 === 0 ? 2 : 1.2} fill="#fff" opacity="0.6" />)}
        {stage !== 'focus' && stage !== 'shot' && <circle cx={sunScreen.x} cy={sunScreen.y} r="50" fill="#ffd166" opacity="0.9" />}
        {/* 경통 그림자: 기울면 바닥에 길게 드리운다 */}
        <ellipse cx={400 + pan.x * -0.3} cy="560" rx={120 + Math.abs(pan.x) * 0.3} ry="14" fill="#000" opacity="0.5" />
        {/* 파인더 시야 */}
        <g clipPath="url(#view)">
          <rect x="0" y="0" width="800" height="600" fill="#0a1024" />
          {!inView && <circle cx={sunScreen.x} cy={sunScreen.y} r="50" fill="#ffd166" />}
          <g filter={inView ? 'url(#blur)' : undefined} className={stage === 'shot' ? 'anim-pop' : ''} style={{ transformOrigin: `${tx}px ${ty}px` }}>
            {target.kind === 'moon' ? (
              <>
                <circle cx={tx} cy={ty} r={r} fill="url(#moonG)" />
                <path d={`M${tx} ${ty - r} A${r} ${r} 0 0 0 ${tx} ${ty + r} A${r * 0.45} ${r} 0 0 1 ${tx} ${ty - r}`} fill="#0a1024" opacity="0.85" />
                {inView && [[-12, -25, 9], [-28, 10, 13], [-6, 32, 7], [-38, -20, 6]].map(([cx, cy, cr], i) => <circle key={i} cx={tx + cx} cy={ty + cy} r={cr} fill="#8c8878" opacity="0.8" />)}
              </>
            ) : (
              <>
                <circle cx={tx} cy={ty} r={r} fill="url(#planetG)" />
                {inView && [-20, 0, 20].map(o => <ellipse key={o} cx={tx} cy={ty + o} rx={r - Math.abs(o) * 0.3} ry="5" fill="#fff" opacity="0.18" />)}
                <ellipse cx={tx} cy={ty} rx={r + 30} ry="12" fill="none" stroke="#e8d3a8" strokeWidth="5" opacity="0.8" transform={`rotate(-18 ${tx} ${ty})`} />
              </>
            )}
          </g>
        </g>
        <circle cx={C.x} cy={C.y} r={VIEW_R} fill="none" stroke="#94a3b8" strokeWidth="10" />
        {/* 십자선과 맞춤 원 */}
        <g stroke="#fde68a" strokeWidth="2" opacity="0.9">
          <line x1={C.x - VIEW_R} y1={C.y} x2={C.x + VIEW_R} y2={C.y} /><line x1={C.x} y1={C.y - VIEW_R} x2={C.x} y2={C.y + VIEW_R} />
        </g>
        <circle cx={C.x} cy={C.y} r={t.aimRadius} fill="none" stroke="#86efac" strokeWidth="3" strokeDasharray="6 6" />
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
