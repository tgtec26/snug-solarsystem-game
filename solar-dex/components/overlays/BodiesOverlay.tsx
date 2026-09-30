'use client';

import { useMemo, useState } from 'react';
import { useDragDrop } from '@snug/shared/src/useDragDrop';
import { useDataStore } from '@/game/dataStore';
import { matchTrait, pickTraitCards, starsFor } from '@/game/rules';

/** 식구 카드 맞추기 (228~229쪽): 특징 카드를 끌어 천체 칸에 놓는다. */
export function BodiesOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const bodies = useDataStore(s => s.bodies)!;
  const cfg = useDataStore(s => s.minigame)!;
  const initial = useMemo(() => pickTraitCards(bodies, cfg.bodies.cards), [bodies, cfg.bodies.cards]);
  const [cards, setCards] = useState<string[]>(initial);
  const [placed, setPlaced] = useState<Record<string, string[]>>({});
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null);
  const total = initial.length;
  const text = (id: string) => bodies.traits.find(t => t.id === id)!.text;

  const { drag, selected, bindCard, placeSelected } = useDragDrop((cardId, bodyId) => {
    if (matchTrait(bodies, cardId, bodyId)) {
      setPlaced(p => ({ ...p, [bodyId]: [...(p[bodyId] ?? []), cardId] }));
      const left = cards.filter(c => c !== cardId);
      setCards(left);
      setFlash({ id: bodyId, ok: true });
      setMsg('');
      if (left.length === 0) window.setTimeout(() => onDone(starsFor((total - mistakes) / total, mistakes === 0, cfg)), 900);
    } else {
      setMistakes(m => m + 1);
      setFlash({ id: bodyId, ok: false });
      const owner = bodies.bodies.find(b => b.id === bodies.traits.find(t => t.id === cardId)!.body)!;
      setMsg(`그건 ${owner.name}의 특징이에요`);
    }
  });

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
      <div className="text-3xl font-bold">특징 카드를 알맞은 천체에 놓아요</div>
      <div className="grid grid-cols-6 gap-4 w-[1180px]">
        {bodies.bodies.map(b => (
          <button
            key={b.id}
            type="button"
            data-drop={b.id}
            onClick={() => placeSelected(b.id)}
            className={`h-56 rounded-2xl border-2 p-3 flex flex-col items-center gap-2 ${selected ? 'border-yellow-300 bg-yellow-200/10' : 'border-white/30 bg-white/5'} ${flash?.id === b.id ? (flash.ok ? 'anim-pop' : 'anim-shake') : ''}`}
          >
            <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
              {b.id === 'sun' && <circle cx="32" cy="32" r="22" fill="#ffd166" />}
              {b.id === 'planet' && <><circle cx="32" cy="32" r="20" fill="#5aa9e6" /><ellipse cx="32" cy="32" rx="30" ry="8" fill="none" stroke="#cbd5e1" strokeWidth="2" /></>}
              {b.id === 'dwarf' && <circle cx="32" cy="32" r="10" fill="#c9a27e" />}
              {b.id === 'asteroid' && <polygon points="14,36 22,16 40,12 52,30 44,50 24,50" fill="#8d8d99" />}
              {b.id === 'comet' && <><circle cx="44" cy="32" r="9" fill="#e0f2fe" /><path d="M36 28 L6 18 L6 46 L36 36Z" fill="#7dd3fc" opacity="0.6" /></>}
              {b.id === 'moon' && <circle cx="32" cy="32" r="18" fill="#d1d5db" />}
            </svg>
            <div className="text-xl font-bold">{b.name}</div>
            <div className="flex flex-col gap-1 w-full">
              {(placed[b.id] ?? []).map(id => <div key={id} className="text-sm bg-emerald-500/40 rounded px-1">{text(id)}</div>)}
            </div>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 justify-center w-[1100px] min-h-24">
        {cards.map(id => (
          <button
            key={id}
            type="button"
            {...bindCard(id)}
            className={`px-5 py-4 rounded-xl text-xl font-bold touch-none cursor-grab ${selected === id ? 'bg-yellow-300 text-black ring-4 ring-yellow-100' : 'bg-yellow-100 text-black'}`}
            style={{ opacity: drag?.id === id ? 0.3 : 1 }}
          >{text(id)}</button>
        ))}
      </div>
      <div className="h-8 text-xl text-red-300">{msg}</div>
      {drag && <div className="fixed pointer-events-none px-5 py-4 rounded-xl text-xl font-bold bg-yellow-300 text-black shadow-2xl" style={{ left: drag.x - 60, top: drag.y - 30, zIndex: 100 }}>{text(drag.id)}</div>}
    </div>
  );
}
