'use client';

import { useGameStore } from '@/game/store';
import { orderUnlocked } from '@/game/rules';
import { inputLock } from '@/components/UIOverlay';

/** 천문대 벽의 의뢰서. 잠긴 의뢰는 흐리게, 다음 의뢰는 반짝인다. */
export function OrderBoardOverlay() {
  const orders = useGameStore(s => s.orders);
  const completed = useGameStore(s => s.completed);
  const stars = useGameStore(s => s.stars);
  const accept = useGameStore(s => s.acceptOrder);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
      <div className="text-4xl font-bold">관측 의뢰서</div>
      <div className="grid grid-cols-3 gap-5 w-[1000px]">
        {orders.map(o => {
          const done = completed.includes(o.id);
          const open = orderUnlocked(orders, o.id, completed);
          return (
            <button
              key={o.id}
              type="button"
              disabled={!open}
              onClick={() => { if (!inputLock.isLocked()) accept(o.id); }}
              className={`h-44 rounded-2xl border-2 p-4 text-left flex flex-col justify-between ${
                done ? 'bg-emerald-900/50 border-emerald-300' : open ? 'bg-yellow-100 text-black border-yellow-300 animate-pulse' : 'bg-white/5 border-white/20 opacity-50'
              }`}
            >
              <div className="text-xl font-bold">{o.title}</div>
              <div className="flex gap-1 text-3xl text-yellow-400" aria-label={`별 ${stars[o.id] ?? 0}개`}>
                {done ? [1, 2, 3].map(n => <span key={n} style={{ opacity: n <= (stars[o.id] ?? 0) ? 1 : 0.25 }}>★</span>) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
