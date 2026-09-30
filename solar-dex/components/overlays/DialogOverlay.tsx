'use client';

import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { inputLock } from '@/components/UIOverlay';

/** 천문대지기 대사 (한 번에 1~2문장). 전환 직후 입력 잠금 동안은 넘어가지 않는다. */
export function DialogOverlay({ kind }: { kind: 'intro' | 'ending' }) {
  const dialog = useDataStore(s => s.dialog);
  const next = useGameStore(s => s.next);
  if (!dialog) return null;
  const lines = dialog[kind];
  const go = () => { if (!inputLock.isLocked()) next(); };
  return (
    <button
      type="button"
      className="absolute inset-0 w-full h-full flex items-end justify-center pb-24 cursor-pointer"
      onClick={go}
      onKeyDown={e => { if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) go(); }}
    >
      <div className="w-[980px] rounded-3xl bg-black/60 border-2 border-white/30 px-10 py-8 text-left">
        <div className="text-2xl font-bold text-yellow-200 mb-3">{dialog.npcName}</div>
        {lines.map(l => <p key={l} className="text-3xl leading-relaxed">{l}</p>)}
      </div>
    </button>
  );
}
