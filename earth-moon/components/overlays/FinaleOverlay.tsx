'use client';

import { useEffect, useState } from 'react';
import { sfx } from '@snug/shared/src/audio';
import { Confetti } from '@snug/shared/src/Confetti';
import { useGameStore } from '@/game/store';
import { inputLock } from '@/components/UIOverlay';

/** 최종 성공 피날레(약 4초): 잠깐 멈춤 → 빛 폭발과 팡파르 → 큰 꽃가루 → 별 카운트업. 입력 잠금이 풀리면 눌러서 건너뛴다. */
export function FinaleOverlay() {
  const stars = useGameStore(s => s.stars);
  const next = useGameStore(s => s.next);
  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  const [step, setStep] = useState(0); // 0 멈춤, 1 폭발, 2 꽃가루·카운트업
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const t1 = window.setTimeout(() => { setStep(1); sfx.success(); }, 700);
    const t2 = window.setTimeout(() => setStep(2), 1500);
    const t3 = window.setTimeout(() => next(), 4600);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3); };
  }, [next]);
  useEffect(() => {
    if (step < 2) return;
    const id = window.setInterval(() => setShown(n => (n < total ? n + 1 : n)), 130);
    return () => window.clearInterval(id);
  }, [step, total]);

  const skip = () => { if (!inputLock.isLocked()) next(); };
  return (
    <button type="button" className="absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer" onClick={skip} onKeyDown={e => { if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) skip(); }}>
      {step >= 1 && <div className="absolute inset-0 anim-flash" style={{ background: 'radial-gradient(circle, #fff 0%, #fde68a 35%, transparent 70%)' }} />}
      {step >= 1 && <div className="absolute w-[900px] h-[900px] rounded-full anim-burst" style={{ background: 'radial-gradient(circle, #fde68acc 0%, #fde68a00 65%)' }} />}
      {step >= 2 && <Confetti count={120} />}
      <div className="relative flex flex-col items-center gap-4" style={{ opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.4s' }}>
        <div className="text-9xl text-yellow-300 anim-pop">★</div>
        <div className="text-7xl font-bold tabular-nums text-yellow-200">{shown}</div>
      </div>
    </button>
  );
}
