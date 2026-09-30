'use client';

import { useMemo } from 'react';

const COLORS = ['#fde047', '#7dd3fc', '#f9a8d4', '#86efac', '#fdba74'];

/** 최종 성공 피날레용 종이 꽃가루. 위에서 떨어지며 흔들린다. `snug-fall` 키프레임은 각 게임 globals.css에 있다. */
export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: (i * 37 + (i % 7) * 11) % 100,
    delay: (i % 12) * 0.12,
    dur: 2.2 + (i % 5) * 0.4,
    size: 8 + (i % 4) * 4,
    color: COLORS[i % COLORS.length],
    rot: (i * 53) % 360,
  })), [count]);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pieces.map((p, i) => (
        <span key={i} style={{ position: 'absolute', top: -20, left: `${p.left}%`, width: p.size, height: p.size * 0.6, background: p.color, transform: `rotate(${p.rot}deg)`, animation: `snug-fall ${p.dur}s ${p.delay}s ease-in forwards` }} />
      ))}
    </div>
  );
}
