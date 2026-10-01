'use client';

import { DragGhost } from '@snug/shared/src/DragGhost';
import { sfx } from '@snug/shared/src/audio';
import { useState } from 'react';
import { useDragDrop } from '@snug/shared/src/useDragDrop';
import { useDataStore } from '@/game/dataStore';
import { criterionValue, sortPlacement, starsFor } from '@/game/rules';

type Box = 'A' | 'B';
const CARD_W = 138;

/**
 * 행성 카드: 그 행성의 실제 모습을 배경으로 한 그림 + 카드 테두리 + 아래 이름판.
 * 세로가 가로의 1.5배. 글자 크기는 가로에 비례한다.
 */
function PlanetCard({ id, name, w, chips = [], faded = false }: { id: string; name: string; w: number; chips?: string[]; faded?: boolean }) {
  return (
    <div className="relative select-none" style={{ width: w, height: w * 1.5, opacity: faded ? 0.35 : 1 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/planetcards/${id}.webp`} alt="" draggable={false} className="absolute pointer-events-none rounded-lg object-cover" style={{ inset: w * 0.03, width: w * 0.94, height: w * 1.44 }} />
      {chips.length > 0 && (
        <div className="absolute left-0 right-0 flex flex-col items-center gap-0.5 pointer-events-none" style={{ bottom: w * 0.27 }}>
          {chips.map((c, i) => <div key={i} className="rounded bg-black/65 text-white font-bold px-1.5" style={{ fontSize: w * 0.085 }}>{c}</div>)}
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/planetcards/frame.webp" alt="" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute left-0 right-0 text-center font-bold text-yellow-100 pointer-events-none" style={{ bottom: w * 0.075, fontSize: w * 0.15, textShadow: '0 2px 4px #000' }}>{name}</div>
    </div>
  );
}

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

  const { drag, over, selected, bindCard, placeSelected } = useDragDrop((planetId, box) => {
    const b = box as Box;
    const res = sortPlacement(data, boxes, planetId, b);
    setFlash({ box: b, ok: res.ok });
    if (!res.ok) { setMistakes(m => m + 1); sfx.error(); setMsg(res.reason); return; }
    setMsg(''); sfx.correct();
    const next = { ...boxes, [b]: [...boxes[b], planetId] };
    setBoxes(next);
    if (next.A.length + next.B.length === planets.length) {
      const acc = Math.max(0, (planets.length - mistakes) / planets.length);
      window.setTimeout(() => onDone(on.length >= 2 ? starsFor(acc, mistakes === 0, cfg) : Math.min(2, starsFor(acc, mistakes === 0, cfg)) as 1 | 2), 1100);
    }
  }, true, { w: CARD_W, h: CARD_W * 1.5 });
  const name = (id: string) => planets.find(p => p.id === id)!.name;
  const chipsOf = (id: string) => on.map(c => valueLabel(id, c));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="text-3xl font-bold" style={{ textShadow: '0 2px 8px #000' }}>행성을 두 무리로 나눠요</div>
      <div className="flex gap-3">
        {data.criteria.map(c => (
          <button key={c.id} type="button" aria-pressed={on.includes(c.id)}
            onClick={() => setOn(o => (o.includes(c.id) ? o.filter(x => x !== c.id) : [...o, c.id]))}
            className={`px-5 py-2 rounded-full border-2 text-xl font-bold ${on.includes(c.id) ? 'bg-yellow-300 text-black border-yellow-100' : 'bg-black/50 border-white/40'}`}>{c.name}</button>
        ))}
      </div>
      <div className="flex gap-8">
        {(['A', 'B'] as Box[]).map(b => (
          <button key={b} type="button" data-drop={b} onClick={() => placeSelected(b)}
            className={`w-[560px] h-[240px] rounded-3xl border-4 border-dashed p-4 flex flex-col gap-2 bg-black/40 ${selected || over === b ? 'border-yellow-300 bg-yellow-200/10' : 'border-white/40'} ${flash?.box === b ? (flash.ok ? 'anim-pop' : 'anim-shake') : ''}`}>
            <div className="text-2xl font-bold text-left">{b === 'A' ? '(가)' : '(나)'} {groupName(b)}</div>
            <div className="flex flex-wrap gap-2 pointer-events-none">{boxes[b].map(id => <PlanetCard key={id} id={id} name={name(id)} w={78} />)}</div>
          </button>
        ))}
      </div>
      <div className="flex gap-2 justify-center h-[207px]">
        {left.map(p => (
          <button key={p.id} type="button" {...bindCard(p.id)} aria-label={p.name}
            className={`touch-none cursor-grab rounded-lg ${selected === p.id ? 'ring-4 ring-yellow-300' : ''}`}>
            <PlanetCard id={p.id} name={p.name} w={CARD_W} chips={chipsOf(p.id)} faded={drag?.id === p.id} />
          </button>
        ))}
      </div>
      <div className="h-7 text-xl text-red-300">{msg}</div>
      {drag && <DragGhost x={drag.x} y={drag.y}><PlanetCard id={drag.id} name={name(drag.id)} w={CARD_W} chips={chipsOf(drag.id)} /></DragGhost>}
    </div>
  );
}
