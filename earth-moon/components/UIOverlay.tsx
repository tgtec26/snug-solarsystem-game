'use client';

import { useEffect, useRef } from 'react';
import { createInputLock } from '@snug/shared/src/inputLock';
import { toggleFullscreen } from '@snug/shared/src/fullscreen';
import { useGameStore } from '@/game/store';
import { useDataStore } from '@/game/dataStore';
import { TitleOverlay } from '@/components/overlays/TitleOverlay';
import { DialogOverlay } from '@/components/overlays/DialogOverlay';
import { OrderBoardOverlay } from '@/components/overlays/OrderBoardOverlay';
import { RoomPlaceholder } from '@/components/overlays/RoomPlaceholder';
import { ResultOverlay } from '@/components/overlays/ResultOverlay';

/** 화면이 바뀐 직후 연타가 다음 화면으로 넘어가지 않도록 입력을 잠깐 잠근다 */
export const inputLock = createInputLock();

export function UIOverlay() {
  const phase = useGameStore(s => s.phase);
  const lockMs = useDataStore(s => s.minigame?.inputLockMs ?? 1000);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    inputLock.lock(lockMs);
  }, [phase, lockMs]);

  return (
    <div className="absolute inset-0 text-white select-none" style={{ background: 'radial-gradient(ellipse at 50% 120%, #1c2a5a 0%, #0a0f25 55%, #04060f 100%)' }}>
      <button
        type="button"
        aria-label="전체 화면"
        className="absolute top-3 right-3 z-50 w-12 h-12 rounded-xl bg-white/10 border border-white/30 flex items-center justify-center"
        onClick={e => { toggleFullscreen(); e.currentTarget.blur(); }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
      </button>
      {phase === 'title' && <TitleOverlay />}
      {phase === 'intro' && <DialogOverlay kind="intro" />}
      {phase === 'board' && <OrderBoardOverlay />}
      {phase === 'room' && <RoomPlaceholder />}
      {phase === 'result' && <ResultOverlay />}
      {phase === 'ending' && <DialogOverlay kind="ending" />}
      {phase === 'summary' && <ResultOverlay summary />}
    </div>
  );
}
