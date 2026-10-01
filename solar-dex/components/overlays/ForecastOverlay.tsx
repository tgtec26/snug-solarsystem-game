'use client';

import { DragGhost } from '@snug/shared/src/DragGhost';
import { sfx } from '@snug/shared/src/audio';
import { useState } from 'react';
import { useDragDrop } from '@snug/shared/src/useDragDrop';
import { ArtCard } from '@/components/ArtCard';
import { useDataStore } from '@/game/dataStore';
import { earthEffects, effectZoneOk, starsFor, sunActivity } from '@/game/rules';

const ZONE_NAME: Record<string, string> = { sky: '북극 하늘', tower: '통신 탑', orbit: '인공위성 궤도', grid: '송전 시설', route: '북극 항로' };
const CARD_W = 130;

/** 활동 예보 (238~239쪽): 세기 다이얼을 돌려 태양의 변화를 보고, 활발한 시기의 지구 영향 카드를 알맞은 곳에 놓는다. */
export function ForecastOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const sun = useDataStore(s => s.sun)!;
  const cfg = useDataStore(s => s.minigame)!;
  const [level, setLevel] = useState(0);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const act = sunActivity(level, sun);
  const active = earthEffects(level, sun);
  const eff = (id: string) => sun.effects.find(e => e.id === id)!;
  const art = (id: string) => `/assets/effects/${id}.webp`;

  const { drag, over, selected, bindCard, placeSelected } = useDragDrop((effectId, zone) => {
    if (!effectZoneOk(sun, effectId, zone)) { setMistakes(m => m + 1); sfx.error(); setMsg('그 영향은 다른 곳에서 일어나요'); return; }
    setMsg('');
    const next = { ...placed, [zone]: effectId };
    setPlaced(next); sfx.correct();
    if (Object.keys(next).length === sun.effects.length) window.setTimeout(() => onDone(starsFor((sun.effects.length - mistakes) / sun.effects.length, mistakes === 0, cfg)), 1000);
  }, active.length > 0, { w: CARD_W, h: CARD_W * 1.5 });
  const hand = active.filter(id => !Object.values(placed).includes(id));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="text-3xl font-bold" style={{ textShadow: '0 2px 8px #000' }}>태양 활동 세기를 올려 봐요</div>
      <div className="flex items-center gap-10">
        <svg width="220" height="220" viewBox="0 0 260 260" aria-label="태양">
          <circle cx="130" cy="130" r={70 + act.corona * 10} fill="#ffd16622" />
          <image href="/assets/sun.webp" x="64" y="64" width="132" height="132" />
          {Array.from({ length: act.sunspots * 2 }).map((_, i) => <circle key={i} cx={100 + ((i * 37) % 60)} cy={100 + ((i * 53) % 60)} r="5" fill="#5b3a00" />)}
          {Array.from({ length: act.prominence }).map((_, i) => <path key={i} d={`M${130 + 60 * Math.cos(i * 1.4)} ${130 + 60 * Math.sin(i * 1.4)} q 20 -30 40 0`} stroke="#ff6b35" strokeWidth="6" fill="none" />)}
          {Array.from({ length: act.wind }).map((_, i) => <circle key={i} cx={200 + i * 14} cy={60 + i * 10} r="3" fill="#fff" opacity="0.8" />)}
        </svg>
        <div className="flex flex-col items-center gap-3">
          <input type="range" min={0} max={sun.maxLevel} step={1} value={level} onChange={e => setLevel(Number(e.target.value))} className="w-96 h-10 accent-yellow-300" aria-label="활동 세기" />
          <div className="text-xl text-white/80">약함 — 활발함</div>
        </div>
      </div>
      <div className="flex gap-4">
        {sun.effects.map(e => (
          <button key={e.zone} type="button" data-drop={e.zone} onClick={() => placeSelected(e.zone)}
            className={`relative w-[224px] h-[172px] rounded-2xl border-2 flex items-end justify-between gap-1 px-3 pb-2 ${placed[e.zone] ? 'border-emerald-300 bg-emerald-900/40 anim-pop' : selected || over === e.zone ? 'border-yellow-300 bg-yellow-200/10' : 'border-white/30 bg-black/45'}`}>
            <div className="absolute left-3 top-2 text-lg font-bold text-white/90">{ZONE_NAME[e.zone]}</div>
            {placed[e.zone] ? <div className="mx-auto pointer-events-none"><ArtCard art={art(placed[e.zone])} name={eff(placed[e.zone]).name} w={74} /></div> : null}
          </button>
        ))}
      </div>
      <div className="flex gap-3 justify-center h-[195px]">
        {hand.map(id => (
          <button key={id} type="button" {...bindCard(id)} aria-label={eff(id).name} className={`touch-none cursor-grab rounded-lg ${selected === id ? 'ring-4 ring-yellow-300' : ''}`}>
            <ArtCard art={art(id)} name={eff(id).name} w={CARD_W} faded={drag?.id === id} />
          </button>
        ))}
      </div>
      <div className="h-7 text-xl text-red-300">{msg}</div>
      {drag && <DragGhost x={drag.x} y={drag.y}><ArtCard art={art(drag.id)} name={eff(drag.id).name} w={CARD_W} /></DragGhost>}
    </div>
  );
}
