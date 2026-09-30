'use client';

import { useGameStore } from '@/game/store';
import { BodiesOverlay } from '@/components/overlays/BodiesOverlay';
import { PlanetSortOverlay } from '@/components/overlays/PlanetSortOverlay';
import { CometOverlay } from '@/components/overlays/CometOverlay';
import { ForecastOverlay } from '@/components/overlays/ForecastOverlay';
import { TelescopeOverlay } from '@/components/overlays/TelescopeOverlay';
import { ProjectionOverlay } from '@/components/overlays/ProjectionOverlay';

/** 방: 미니게임 id로 오버레이를 고른다. 아직 없는 미니게임은 개발 모드 "완료" 단추로 대신한다. */
export function RoomPlaceholder() {
  const current = useGameStore(s => s.current);
  const order = useGameStore(s => s.orders.find(o => o.id === s.current));
  const complete = useGameStore(s => s.completeRoom);
  if (!order || !current) return null;
  const done = (stars: number) => complete(current, stars);
  if (order.minigame === 'bodies') return <BodiesOverlay key={current} onDone={done} />;
  if (order.minigame === 'planets') return <PlanetSortOverlay key={current} onDone={done} />;
  if (order.minigame === 'comet') return <CometOverlay key={current} onDone={done} />;
  if (order.minigame === 'telescope') return <TelescopeOverlay key={current} onDone={done} />;
  if (order.minigame === 'projection') return <ProjectionOverlay key={current} onDone={done} />;
  if (order.minigame === 'forecast') return <ForecastOverlay key={current} onDone={done} />;
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
