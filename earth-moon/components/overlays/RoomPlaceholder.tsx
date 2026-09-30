'use client';

import { useGameStore } from '@/game/store';
import { EarthSpinOverlay } from '@/components/overlays/EarthSpinOverlay';
import { DayStarsOverlay } from '@/components/overlays/DayStarsOverlay';
import { ConstellationOverlay } from '@/components/overlays/ConstellationOverlay';
import { MoonPhaseOverlay } from '@/components/overlays/MoonPhaseOverlay';
import { ShadowOverlay } from '@/components/overlays/ShadowOverlay';

/** 방: `minigame` id로 오버레이를 고른다. 없는 id는 개발 모드 "완료" 단추로 대신한다. */
export function RoomPlaceholder() {
  const current = useGameStore(s => s.current);
  const order = useGameStore(s => s.orders.find(o => o.id === s.current));
  const complete = useGameStore(s => s.completeRoom);
  if (!order || !current) return null;
  const done = (stars: number) => complete(current, stars);
  if (order.minigame === 'earthSpin') return <EarthSpinOverlay key={current} onDone={done} />;
  if (order.minigame === 'dayStars') return <DayStarsOverlay key={current} onDone={done} />;
  if (order.minigame === 'constellation') return <ConstellationOverlay key={current} onDone={done} />;
  if (order.minigame === 'moonPhase') return <MoonPhaseOverlay key={current} onDone={done} />;
  if (order.minigame === 'shadow') return <ShadowOverlay key={current} onDone={done} />;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
      <div className="text-4xl font-bold">{order.title}</div>
      <div className="text-xl text-white/60">{order.room} · {order.minigame} (준비 중)</div>
      {process.env.NODE_ENV !== 'production' && (
        <button type="button" className="px-8 py-3 rounded-xl bg-white/15 border border-white/40 text-xl" onClick={() => done(3)}>
          개발용: 미니게임 완료
        </button>
      )}
    </div>
  );
}
