'use client';

import { useState } from 'react';
import { useDragDrop } from '@snug/shared/src/useDragDrop';
import { useDataStore } from '@/game/dataStore';
import { criterionValue, sortPlacement, starsFor } from '@/game/rules';

type Box = 'A' | 'B';

/** 행성 나눔판 (234~235쪽): 기준 스위치를 켜 특징을 보고, 행성 카드를 두 상자로 나눈다. */
export function PlanetSortOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const data = useDataStore(s => s.bodies)!;
  const cfg = useDataStore(s => s.minigame)!;
  const [boxes, setBoxes] = useState<Record<Box, string[]>>({ A: [], B: [] });
  const [on, setOn] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const [flash, setFlash] = useState<{ box: Box; ok: boolean } | null>(null);
  const planets = data.planets;
  const left = planets.filter(p => !boxes.A.includes(p.id) && !boxes.B.includes(p.id));
  const valueLabel = (planetId: string, crit: string) => {
    const v = criterionValue(data, planetId, crit);
    return data.criteria.find(c => c.id === crit)?.values[v ?? ''] ?? '';
  };
  const groupName = (box: Box) => {
    const first = boxes[box][0];
    const g = first ? data.planets.find(p => p.id === first)?.group : null;
    return left.length === 0 && g ? data.groups.find(x => x.id === g)?.name ?? '' : '';
  };

  const { drag, selected, bindCard, placeSelected } = useDragDrop((planetId, box) => {
    const b = box as Box;
    const res = sortPlacement(data, boxes, planetId, b);
    setFlash({ box: b, ok: res.ok });
    if (!res.ok) { setMistakes(m => m + 1); setMsg(res.reason); return; }
    setMsg('');
    const next = { ...boxes, [b]: [...boxes[b], planetId] };
    setBoxes(next);
    if (next.A.length + next.B.length === planets.length) {
      const acc = Math.max(0, (planets.length - mistakes) / planets.length);
      window.setTimeout(() => onDone(on.length >= 2 ? starsFor(acc, mistakes === 0, cfg) : Math.min(2, starsFor(acc, mistakes === 0, cfg)) as 1 | 2), 1100);
    }
  });
  const name = (id: string) => planets.find(p => p.id === id)!.name;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
      <div className="text-3xl font-bold">행성을 두 무리로 나눠요</div>
      <div className="flex gap-3">
        {data.criteria.map(c => (
          <button key={c.id} type="button" aria-pressed={on.includes(c.id)}
            onClick={() => setOn(o => (o.includes(c.id) ? o.filter(x => x !== c.id) : [...o, c.id]))}
            className={`px-5 py-3 rounded-full border-2 text-xl font-bold ${on.includes(c.id) ? 'bg-yellow-300 text-black border-yellow-100' : 'bg-white/10 border-white/40'}`}>{c.name}</button>
        ))}
      </div>
      <div className="flex gap-10">
        {(['A', 'B'] as Box[]).map(b => (
          <button key={b} type="button" data-drop={b} onClick={() => placeSelected(b)}
            className={`w-[470px] h-56 rounded-3xl border-4 border-dashed p-4 flex flex-col gap-2 ${selected ? 'border-yellow-300' : 'border-white/40'} ${flash?.box === b ? (flash.ok ? 'anim-pop' : 'anim-shake') : ''}`}>
            <div className="text-2xl font-bold">{b === 'A' ? '(가)' : '(나)'} {groupName(b)}</div>
            <div className="flex flex-wrap gap-2">{boxes[b].map(id => <span key={id} className="px-3 py-1 rounded-lg bg-emerald-500/40 text-lg">{name(id)}</span>)}</div>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 justify-center w-[1150px] min-h-36">
        {left.map(p => (
          <button key={p.id} type="button" {...bindCard(p.id)}
            className={`w-32 rounded-2xl p-2 flex flex-col items-center gap-1 touch-none cursor-grab text-black ${selected === p.id ? 'bg-yellow-300 ring-4 ring-yellow-100' : 'bg-yellow-100'}`}
            style={{ opacity: drag?.id === p.id ? 0.3 : 1 }}>
            <div className="font-bold text-lg">{p.name}</div>
            {on.map(c => <div key={c} className="text-xs bg-black/10 rounded px-1">{valueLabel(p.id, c)}</div>)}
          </button>
        ))}
      </div>
      <div className="h-8 text-xl text-red-300">{msg}</div>
      {drag && <div className="fixed pointer-events-none px-5 py-3 rounded-xl text-xl font-bold bg-yellow-300 text-black shadow-2xl" style={{ left: drag.x - 40, top: drag.y - 25, zIndex: 100 }}>{name(drag.id)}</div>}
    </div>
  );
}
