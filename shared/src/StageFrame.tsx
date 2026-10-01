'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';
import { GAME_WIDTH, GAME_HEIGHT } from './config';

/** 무대 1280×800을 뷰포트에 letterbox로 맞추고, 안의 UI는 transform scale로 키운다. */
export function StageFrame({ children }: { children: ReactNode }) {
  const [size, setSize] = useState({ w: GAME_WIDTH, h: GAME_HEIGHT, scale: 1 });

  useLayoutEffect(() => {
    const update = () => {
      const s = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
      setSize({ w: GAME_WIDTH * s, h: GAME_HEIGHT * s, scale: s });
      document.documentElement.style.setProperty('--stage-scale', String(s)); // 끌기 그림자(DragGhost)가 쓴다
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black flex items-center justify-center">
      <div className="relative bg-black overflow-hidden" style={{ width: size.w, height: size.h }}>
        <div className="absolute top-0 left-0" style={{ width: GAME_WIDTH, height: GAME_HEIGHT, transform: `scale(${size.scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </main>
  );
}
