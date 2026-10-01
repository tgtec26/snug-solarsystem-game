'use client';

import { sfx } from '@snug/shared/src/audio';
import { useMemo, useState, type ReactNode } from 'react';
import { DragGhost } from '@snug/shared/src/DragGhost';
import { useDragDrop } from '@snug/shared/src/useDragDrop';
import { useDataStore } from '@/game/dataStore';
import { matchTrait, pickTraitCards, starsFor } from '@/game/rules';

const HAND_SIZE = { w: 150, h: 210 };

/** 손에 든 특징 카드: 가로가 일정한 실제 카드 모양. 천체 칸에 붙은 카드(작은 쪽)와 같은 색·테두리를 쓴다. */
function HandCard({ children, faded }: { children: ReactNode; faded?: boolean }) {
  return (
    <div
      className="relative w-[150px] h-[210px] flex items-center justify-center px-5 pt-14 pb-6 text-center text-[#2a2140] text-[22px] font-bold leading-snug select-none"
      style={{ background: 'url(/assets/cards/card-front.webp) center / 100% 100% no-repeat', opacity: faded ? 0.35 : 1 }}
    >
      {children}
    </div>
  );
}

/** 천체 칸에 붙은 카드: 손에 든 카드와 같은 양피지색·금색 테두리 */
function PlacedCard({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-1.5 rounded-lg text-lg font-bold text-[#2a2140] border-2 border-[#c9a24a] shadow-md anim-pop" style={{ background: 'linear-gradient(#fbf0cf, #ecd9a3)', outline: '2px solid #1c2a5a', outlineOffset: '-5px' }}>
      {children}
    </div>
  );
}

/** 식구 카드 맞추기 (228~229쪽): 카드 더미에서 특징 카드가 한 장씩 나오고, 끌어서 알맞은 천체 칸에 놓는다. */
export function BodiesOverlay({ onDone }: { onDone: (stars: number) => void }) {
  const bodies = useDataStore(s => s.bodies)!;
  const cfg = useDataStore(s => s.minigame)!;
  const initial = useMemo(() => pickTraitCards(bodies, cfg.bodies.cards), [bodies, cfg.bodies.cards]);
  const [cards, setCards] = useState<string[]>(initial);
  const [placed, setPlaced] = useState<Record<string, string[]>>({});
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null);
  const [shake, setShake] = useState(0);
  const total = initial.length;
  const text = (id: string) => bodies.traits.find(t => t.id === id)!.text;
  const current = cards[0];

  const { drag, over, selected, bindCard, placeSelected } = useDragDrop((cardId, bodyId) => {
    if (matchTrait(bodies, cardId, bodyId)) {
      setPlaced(p => ({ ...p, [bodyId]: [...(p[bodyId] ?? []), cardId] }));
      const left = cards.filter(c => c !== cardId);
      setCards(left);
      setFlash({ id: bodyId, ok: true });
      setMsg(''); sfx.correct();
      if (left.length === 0) window.setTimeout(() => onDone(starsFor((total - mistakes) / total, mistakes === 0, cfg)), 900);
    } else {
      setMistakes(m => m + 1); sfx.error();
      setFlash({ id: bodyId, ok: false });
      setShake(n => n + 1);
      const owner = bodies.bodies.find(b => b.id === bodies.traits.find(t => t.id === cardId)!.body)!;
      setMsg(`그건 ${owner.name}의 특징이에요`);
    }
  }, true, HAND_SIZE);

  return (
    <div className="absolute inset-0">
      <div className="absolute top-5 left-0 right-0 text-center text-3xl font-bold" style={{ textShadow: '0 2px 8px #000' }}>카드를 알맞은 천체에 놓아요</div>

      {/* 천체 칸 2행 3열: 아이콘은 왼쪽 위(11시) */}
      <div className="absolute left-[50px] top-[72px] w-[1180px] grid grid-cols-3 grid-rows-2 gap-4">
        {bodies.bodies.map(b => (
          <button
            key={b.id}
            type="button"
            data-drop={b.id}
            onClick={() => placeSelected(b.id)}
            className={`relative h-[240px] rounded-3xl border-2 text-left ${selected || over === b.id ? 'border-yellow-300 bg-yellow-200/15' : 'border-white/30 bg-black/45'} ${flash?.id === b.id ? (flash.ok ? 'anim-pop' : 'anim-shake') : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/assets/icons/body-${b.id}.webp`} alt="" width={112} height={112} draggable={false} className="absolute left-3 top-3 pointer-events-none" />
            <div className="absolute left-[140px] top-[42px] text-4xl font-bold" style={{ textShadow: '0 2px 6px #000' }}>{b.name}</div>
            <div className="absolute left-4 right-4 top-[128px] flex flex-wrap gap-2 pointer-events-none">
              {(placed[b.id] ?? []).map(id => <PlacedCard key={id}>{text(id)}</PlacedCard>)}
            </div>
          </button>
        ))}
      </div>

      {/* 카드 더미와 이번에 나온 카드 */}
      {cards.length > 1 && (
        <div className="absolute left-[380px] bottom-[18px] w-[150px] h-[210px]">
          {[2, 1, 0].map(i => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src="/assets/cards/card-back.webp" alt="" draggable={false} className="absolute w-[150px] h-[210px] pointer-events-none" style={{ left: i * 4, top: -i * 4 }} />
          ))}
          <div className="absolute -bottom-1 left-0 right-0 text-center text-lg font-bold text-yellow-100" style={{ textShadow: '0 2px 4px #000' }}>{cards.length - 1}</div>
        </div>
      )}
      {current && (
        <button
          key={`${current}-${shake}`}
          type="button"
          {...bindCard(current)}
          aria-label={text(current)}
          className={`absolute left-[600px] bottom-[18px] touch-none cursor-grab ${shake ? 'anim-shake' : 'anim-deal'} ${selected === current ? 'ring-4 ring-yellow-300 rounded-2xl' : ''}`}
        >
          <HandCard faded={drag?.id === current}>{text(current)}</HandCard>
        </button>
      )}
      <div className="absolute left-[800px] right-[40px] bottom-[110px] h-8 text-xl text-red-300">{msg}</div>
      {drag && <DragGhost x={drag.x} y={drag.y}><HandCard>{text(drag.id)}</HandCard></DragGhost>}
    </div>
  );
}
