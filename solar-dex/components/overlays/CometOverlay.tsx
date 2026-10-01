'use client';

import { sfx } from '@snug/shared/src/audio';
import { useRef, useState, type PointerEvent } from 'react';
import { useDataStore } from '@/game/dataStore';
import { cometTail, starsFor, tailAngle, tailPointsAway } from '@/game/rules';

const SUN = { x: 400, y: 300 };
const STATIONS = [{ x: 400, y: 120 }, { x: 640, y: 300 }, { x: 400, y: 460 }, { x: 210, y: 300 }]; // 궤도 위 네 지점(서로 다른 태양 거리)

/** 혜성 꼬리 (230~231쪽): 꼬리 끝을 끌어 돌려 태양 반대쪽에 맞춘다. 가까울수록 꼬리가 길다. */
export function CometOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const cfg = useDataStore(s => s.minigame)!;
  const ranks = cfg.comet.ranks;
  const [step, setStep] = useState(0);
  const [angle, setAngle] = useState(200);
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const comet = STATIONS[step];
  const tail = cometTail(ranks[step], Math.max(...ranks));

  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (e.buttons === 0 || ok) return;
    const r = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 800;
    const y = ((e.clientY - r.top) / r.height) * 600;
    setAngle((Math.atan2(y - comet.y, x - comet.x) * 180) / Math.PI);
  };
  const confirm = () => {
    if (ok) return;
    if (tailPointsAway(SUN, comet, angle, cfg.comet.tolerance)) {
      setOk(true); setMsg(''); sfx.correct();
      window.setTimeout(() => {
        setOk(false);
        if (step + 1 >= STATIONS.length) onDone(starsFor((STATIONS.length - mistakes) / STATIONS.length, mistakes === 0, cfg));
        else { setStep(step + 1); setAngle(200); }
      }, 900);
    } else { setMistakes(m => m + 1); sfx.error(); setMsg('혜성 꼬리는 태양 반대쪽을 향해요'); }
  };
  const rad = (angle * Math.PI) / 180;
  const len = 110 + tail.length * 60; // 꼬리 그림의 길이(상대값)
  const imgW = len / 0.85, imgH = imgW / 3;
  const end = { x: comet.x + Math.cos(rad) * len, y: comet.y + Math.sin(rad) * len };
  const aimKey = (e: React.KeyboardEvent) => {
    if (e.repeat) return;
    if (e.key === 'ArrowLeft') setAngle(a => a - 10);
    else if (e.key === 'ArrowRight') setAngle(a => a + 10);
    else if (e.key === 'Enter') confirm();
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <div className="text-3xl font-bold">꼬리를 돌려 맞춰요 ({step + 1}/{STATIONS.length})</div>
      <svg ref={svg} viewBox="0 0 800 600" width="800" height="600" className="touch-none rounded-3xl bg-black/30" tabIndex={0} onKeyDown={aimKey} onPointerMove={move} onPointerDown={e => { (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); move(e); }}>
        <ellipse cx="400" cy="300" rx="240" ry="180" fill="none" stroke="#ffffff33" strokeDasharray="6 8" strokeWidth="3" />
        <image href="/assets/sun.webp" x={SUN.x - 52} y={SUN.y - 52} width="104" height="104" />
        <line x1={SUN.x} y1={SUN.y} x2={comet.x} y2={comet.y} stroke="#ffd16655" strokeWidth="2" strokeDasharray="4 6" />
        {/* 꼬리 그림: 머리가 혜성 위치, 꼬리는 잡은 방향으로 */}
        <g transform={`rotate(${angle} ${comet.x} ${comet.y})`}>
          <image href="/assets/comet-tail.webp" x={comet.x - imgW * 0.078} y={comet.y - imgH * 0.52} width={imgW} height={imgH} className="pointer-events-none" />
        </g>
        {/* 잡는 손잡이: 혜성의 일부가 아니므로 반투명 */}
        <circle cx={end.x} cy={end.y} r="20" fill="#ffffff" fillOpacity="0.28" stroke="#fbbf24" strokeOpacity="0.8" strokeWidth="4" strokeDasharray="6 5" className={ok ? 'anim-pop' : ''} style={{ transformOrigin: `${end.x}px ${end.y}px` }} />
        {ok && <circle cx={comet.x} cy={comet.y} r="30" fill="#fde68a" className="anim-sparkle" style={{ transformOrigin: `${comet.x}px ${comet.y}px` }} />}
      </svg>
      <div className="flex items-center gap-6">
        <button type="button" onClick={confirm} className="px-10 py-3 rounded-2xl bg-yellow-300 text-black text-2xl font-bold">꼬리 확정</button>
        <div className="h-8 text-xl text-red-300">{msg}</div>
      </div>
      <span className="sr-only">방향 {Math.round(tailAngle(SUN, comet))}</span>
    </div>
  );
}
