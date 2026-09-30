'use client';

import { requestFullscreen } from '@snug/shared/src/fullscreen';
import { music } from '@snug/shared/src/audio';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';

/** 첫 터치(시작 조작)가 곧 전체 화면 전환이다. */
export function TitleOverlay() {
  const start = useGameStore(s => s.start);
  const orders = useDataStore(s => s.orders);
  const go = () => { requestFullscreen(); music.start(); start(orders); };
  return (
    <button
      type="button"
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-6 cursor-pointer"
      onClick={go}
      onKeyDown={e => { if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) go(); }}
    >
      <svg width="220" height="120" viewBox="0 0 220 120" aria-hidden>
        <circle cx="110" cy="60" r="34" fill="#ffd166" />
        <ellipse cx="110" cy="60" rx="100" ry="22" fill="none" stroke="#9ad1ff" strokeWidth="3" transform="rotate(-18 110 60)" />
        <circle cx="200" cy="34" r="8" fill="#9ad1ff" />
      </svg>
      <div className="text-6xl font-bold tracking-wide">별빛 천문대</div>
      <div className="text-3xl text-yellow-200">지구와 달 모형</div>
      <div className="mt-6 px-10 py-4 rounded-2xl bg-yellow-300 text-black text-2xl font-bold animate-pulse">화면을 눌러 시작</div>
    </button>
  );
}
