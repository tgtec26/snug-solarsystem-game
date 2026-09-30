'use client';

import { useGameStore } from '@/game/store';
import { inputLock } from '@/components/UIOverlay';

/** 의뢰 완료(별·새 카드) 또는 한 판 요약. 결과 PNG 내려받기는 이후 계획에서 추가한다. */
export function ResultOverlay({ summary = false }: { summary?: boolean }) {
  const current = useGameStore(s => s.current);
  const orders = useGameStore(s => s.orders);
  const stars = useGameStore(s => s.stars);
  const newCards = useGameStore(s => s.newCards);
  const completed = useGameStore(s => s.completed);
  const next = useGameStore(s => s.next);
  const restart = useGameStore(s => s.restartRun);
  const last = orders.find(o => o.id === current);
  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-[760px] rounded-3xl bg-black/60 border-2 border-white/30 p-10 flex flex-col items-center gap-5">
        <div className="text-4xl font-bold">{summary ? '오늘의 관측 결과' : '의뢰 완료'}</div>
        {summary ? (
          <>
            <div className="text-2xl">의뢰 {completed.length}/{orders.length} · 별 {total}개</div>
            <div className="text-2xl">새로 모은 일지 카드 {newCards.length}장</div>
            <button type="button" className="mt-4 px-10 py-4 rounded-2xl bg-yellow-300 text-black text-2xl font-bold" onClick={() => { if (!inputLock.isLocked()) restart(); }}>다시 하기</button>
          </>
        ) : (
          <>
            <div className="text-2xl">{last?.title}</div>
            <div className="flex gap-2 text-5xl text-yellow-400">{[1, 2, 3].map(n => <span key={n} style={{ opacity: n <= (stars[current ?? ''] ?? 0) ? 1 : 0.25 }}>★</span>)}</div>
            <button type="button" className="mt-4 px-10 py-4 rounded-2xl bg-yellow-300 text-black text-2xl font-bold" onClick={() => { if (!inputLock.isLocked()) next(); }}>다음</button>
          </>
        )}
      </div>
    </div>
  );
}
