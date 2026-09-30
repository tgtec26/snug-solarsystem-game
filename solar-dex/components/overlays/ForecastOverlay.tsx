'use client';

import { useState } from 'react';
import { useDragDrop } from '@snug/shared/src/useDragDrop';
import { useDataStore } from '@/game/dataStore';
import { earthEffects, effectZoneOk, starsFor, sunActivity } from '@/game/rules';

const ZONE_NAME: Record<string, string> = { sky: '북극 하늘', tower: '통신 탑', orbit: '인공위성 궤도', grid: '송전 시설', route: '북극 항로' };

/** 활동 예보 (238~239쪽): 세기 다이얼을 돌려 태양의 변화를 보고, 활발한 시기의 지구 영향을 지도에 붙인다. */
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

  const { drag, selected, bindCard, placeSelected } = useDragDrop((effectId, zone) => {
    if (!effectZoneOk(sun, effectId, zone)) { setMistakes(m => m + 1); setMsg('그 영향은 다른 곳에서 일어나요'); return; }
    setMsg('');
    const next = { ...placed, [zone]: effectId };
    setPlaced(next);
    if (Object.keys(next).length === sun.effects.length) window.setTimeout(() => onDone(starsFor((sun.effects.length - mistakes) / sun.effects.length, mistakes === 0, cfg)), 1000);
  }, active.length > 0);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
      <div className="text-3xl font-bold">태양 활동 세기를 올려 봐요</div>
      <div className="flex items-center gap-10">
        <svg width="260" height="260" viewBox="0 0 260 260" aria-label="태양">
          <circle cx="130" cy="130" r={70 + act.corona * 10} fill="#ffd16622" />
          <circle cx="130" cy="130" r="60" fill="#ffb703" />
          {Array.from({ length: act.sunspots * 2 }).map((_, i) => <circle key={i} cx={100 + ((i * 37) % 60)} cy={100 + ((i * 53) % 60)} r="5" fill="#5b3a00" />)}
          {Array.from({ length: act.prominence }).map((_, i) => <path key={i} d={`M${130 + 60 * Math.cos(i * 1.4)} ${130 + 60 * Math.sin(i * 1.4)} q 20 -30 40 0`} stroke="#ff6b35" strokeWidth="6" fill="none" />)}
          {Array.from({ length: act.wind }).map((_, i) => <circle key={i} cx={200 + i * 14} cy={60 + i * 10} r="3" fill="#fff" opacity="0.8" />)}
        </svg>
        <div className="flex flex-col items-center gap-3">
          <input type="range" min={0} max={sun.maxLevel} step={1} value={level} onChange={e => setLevel(Number(e.target.value))} className="w-96 h-10 accent-yellow-300" aria-label="활동 세기" />
          <div className="text-xl text-white/70">약함 — 활발함</div>
        </div>
      </div>
      <div className="flex gap-3 min-h-16">
        {active.filter(id => !Object.values(placed).includes(id)).map(id => (
          <button key={id} type="button" {...bindCard(id)} className={`px-5 py-3 rounded-xl text-xl font-bold touch-none cursor-grab text-black ${selected === id ? 'bg-yellow-300 ring-4 ring-yellow-100' : 'bg-yellow-100'}`} style={{ opacity: drag?.id === id ? 0.3 : 1 }}>{eff(id).name}</button>
        ))}
      </div>
      <div className="flex gap-4">
        {sun.effects.map(e => (
          <button key={e.zone} type="button" data-drop={e.zone} onClick={() => placeSelected(e.zone)} className={`w-52 h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 ${placed[e.zone] ? 'border-emerald-300 bg-emerald-500/30 anim-pop' : selected ? 'border-yellow-300' : 'border-white/30 bg-white/5'}`}>
            <div className="text-lg text-white/70">{ZONE_NAME[e.zone]}</div>
            {placed[e.zone] && <div className="text-xl font-bold">{eff(placed[e.zone]).name}</div>}
          </button>
        ))}
      </div>
      <div className="h-8 text-xl text-red-300">{msg}</div>
      {drag && <div className="fixed pointer-events-none px-5 py-3 rounded-xl text-xl font-bold bg-yellow-300 text-black shadow-2xl" style={{ left: drag.x - 40, top: drag.y - 25, zIndex: 100 }}>{eff(drag.id).name}</div>}
    </div>
  );
}
