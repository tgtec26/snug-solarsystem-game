'use client';

import { requestFullscreen } from '@snug/shared/src/fullscreen';
import { music } from '@snug/shared/src/audio';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';

/** 첫 터치(시작 조작)가 곧 전체 화면 전환이다. 배경·엠블럼·로고·리본·단추는 `public/assets/title/`의 그림이고, 없으면 글자만 보인다. */
export function TitleOverlay() {
  const start = useGameStore(s => s.start);
  const orders = useDataStore(s => s.orders);
  const go = () => { requestFullscreen(); music.start(); start(orders); };
  return (
    <button
      type="button"
      className="absolute inset-0 w-full h-full overflow-hidden cursor-pointer"
      style={{ background: 'url(/assets/title/title-bg.webp) center / cover, #04060f' }}
      onClick={go}
      onKeyDown={e => { if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) go(); }}
    >
      <div className="absolute inset-0 title-vignette" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/title/title-stars.webp" alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover opacity-80 title-twinkle pointer-events-none" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/title/title-emblem-solar.webp" alt="" draggable={false} className="w-[310px] h-[310px] mt-6 title-float pointer-events-none" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/title/title-logo.webp" alt="별빛 천문대" draggable={false} className="w-[600px] -mt-6 title-glow pointer-events-none" />
        <div className="relative -mt-2 w-[340px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/title/title-ribbon.webp" alt="" draggable={false} className="w-full pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-yellow-100 tracking-wide" style={{ textShadow: '0 2px 6px #000' }}>태양계 도감</div>
        </div>
        <div className="relative mt-3 w-[300px] title-pulse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/title/title-button.webp" alt="" draggable={false} className="w-full pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-[#3b2400]">화면을 눌러 시작</div>
        </div>
      </div>
    </button>
  );
}
