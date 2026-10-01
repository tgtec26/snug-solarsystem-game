'use client';

import { useEffect, useRef, useState } from 'react';
import { sfx } from '@snug/shared/src/audio';
import { saveCard } from '@snug/shared/src/saveCard';
import { Confetti } from '@snug/shared/src/Confetti';
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
  const card = useRef<HTMLDivElement>(null);
  const [saveMsg, setSaveMsg] = useState('');
  useEffect(() => { if (summary) sfx.ending(); else sfx.success(); }, [summary]);
  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  const [shown, setShown] = useState(0); // 별 개수 카운트업
  useEffect(() => {
    if (!summary) return;
    const id = window.setInterval(() => setShown(n => (n < total ? n + 1 : n)), 180);
    return () => window.clearInterval(id);
  }, [summary, total]);
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/char/observer-cheer.webp" alt="" draggable={false} className="absolute right-10 bottom-0 h-[430px] pointer-events-none" />
      {(summary || (stars[current ?? ''] ?? 0) === 3) && <Confetti count={summary ? 90 : 40} />}
      <div ref={card} className="w-[760px] rounded-3xl bg-black/60 border-2 border-white/30 p-10 flex flex-col items-center gap-5">
        <div className="text-4xl font-bold">{summary ? '오늘의 관측 결과 · 태양계 도감' : '의뢰 완료'}</div>
        {summary ? (
          <>
            <div className="text-2xl">의뢰 {completed.length}/{orders.length} · 별 {summary ? shown : total}개</div>
            <div className="text-2xl">새로 모은 일지 카드 {newCards.length}장</div>
            <div className="flex gap-4 mt-4" data-no-capture="1">
              <button type="button" className="px-8 py-4 rounded-2xl bg-sky-300 text-black text-2xl font-bold" onClick={async () => { if (card.current) setSaveMsg((await saveCard(card.current, 'solar-dex-result.png')) ? '' : '저장하지 못했어요'); }}>나의 결과 내려받기</button>
              <button type="button" className="px-10 py-4 rounded-2xl bg-yellow-300 text-black text-2xl font-bold" onClick={() => { if (!inputLock.isLocked()) restart(); }}>다시 하기</button>
            </div>
            <div className="h-6 text-lg text-red-300">{saveMsg}</div>
          </>
        ) : (
          <>
            <div className="text-2xl">{last?.title}</div>
            <div className="flex gap-2 text-5xl text-yellow-400">{[1, 2, 3].map(n => <span key={n} className={n <= (stars[current ?? ''] ?? 0) ? 'anim-pop' : ''} style={{ opacity: n <= (stars[current ?? ''] ?? 0) ? 1 : 0.25, animationDelay: `${n * 0.25}s`, animationFillMode: 'backwards', display: 'inline-block' }}>★</span>)}</div>
            <button type="button" className="mt-4 px-10 py-4 rounded-2xl bg-yellow-300 text-black text-2xl font-bold" onClick={() => { if (!inputLock.isLocked()) next(); }}>다음</button>
          </>
        )}
      </div>
    </div>
  );
}
