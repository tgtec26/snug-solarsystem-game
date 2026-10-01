'use client';

import { useGameStore } from '@/game/store';
import { orderUnlocked } from '@/game/rules';
import { inputLock } from '@/components/UIOverlay';

const TILT = [-2.2, 1.6, -1.2, 2, -1.8, 1.2];

/** 천문대 벽의 관측 의뢰서. 카드의 그림이 어떤 활동인지 알려 준다. 잠긴 의뢰는 흐리게 자물쇠, 끝낸 의뢰는 도장, 다음 의뢰는 반짝인다. */
export function OrderBoardOverlay() {
  const orders = useGameStore(s => s.orders);
  const completed = useGameStore(s => s.completed);
  const stars = useGameStore(s => s.stars);
  const accept = useGameStore(s => s.acceptOrder);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <div className="text-4xl font-bold" style={{ textShadow: '0 2px 8px #000' }}>관측 의뢰서</div>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 w-[1040px]">
        {orders.map((o, i) => {
          const done = completed.includes(o.id);
          const open = orderUnlocked(orders, o.id, completed);
          return (
            <button
              key={o.id}
              type="button"
              disabled={!open}
              aria-label={o.title}
              onClick={() => { if (!inputLock.isLocked()) accept(o.id); }}
              className={`relative w-[320px] h-[240px] ${open ? 'animate-pulse cursor-pointer hover:scale-105' : ''} transition-transform`}
              style={{ transform: `rotate(${TILT[i % TILT.length]}deg)`, filter: !open && !done ? 'grayscale(0.7) brightness(0.55)' : done ? 'brightness(0.92)' : 'drop-shadow(0 0 18px rgba(253,224,71,0.7))' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/orders/card-paper.webp" alt="" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/orders/${o.minigame}.webp`} alt="" draggable={false} className="absolute left-1/2 -translate-x-1/2 top-[30px] w-[210px] h-[130px] object-contain pointer-events-none" />
              <div className="absolute left-0 right-0 top-[160px] text-center text-xl font-bold text-[#3b2a14] px-6 leading-tight">{o.title}</div>
              {done && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/orders/stamp-done.webp" alt="" draggable={false} className="absolute right-3 top-8 w-[84px] h-[84px] pointer-events-none anim-pop" />
                  <div className="absolute left-0 right-0 bottom-5 flex justify-center gap-1 text-3xl text-amber-500" aria-label={`별 ${stars[o.id] ?? 0}개`}>
                    {[1, 2, 3].map(n => <span key={n} style={{ opacity: n <= (stars[o.id] ?? 0) ? 1 : 0.25 }}>★</span>)}
                  </div>
                </>
              )}
              {!open && !done && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/assets/orders/lock.webp" alt="" draggable={false} className="absolute right-5 top-9 w-[60px] h-[60px] pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
