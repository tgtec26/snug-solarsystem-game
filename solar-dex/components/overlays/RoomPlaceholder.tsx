'use client';

import { useGameStore } from '@/game/store';

/** 미니게임이 들어올 자리. 개발 모드에서만 "완료" 단추로 흐름을 확인한다. */
export function RoomPlaceholder() {
  const current = useGameStore(s => s.current);
  const order = useGameStore(s => s.orders.find(o => o.id === s.current));
  const complete = useGameStore(s => s.completeRoom);
  if (!order || !current) return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
      <div className="text-4xl font-bold">{order.title}</div>
      <div className="text-xl text-white/60">{order.room} · {order.minigame}</div>
      {process.env.NODE_ENV !== 'production' && (
        <button type="button" className="px-8 py-3 rounded-xl bg-white/15 border border-white/40 text-xl" onClick={() => complete(current, 3)}>
          개발용: 미니게임 완료
        </button>
      )}
    </div>
  );
}
