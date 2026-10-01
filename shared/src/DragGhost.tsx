'use client';

import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * 끌고 있는 물체를 커서 한가운데에 그린다. 무대가 transform으로 확대·축소되어 있어 `position: fixed`를 무대 안에 두면
 * 좌표가 어긋나므로, body에 포털로 그리고 무대 배율(`--stage-scale`, StageFrame이 설정)만큼 키운다.
 */
export function DragGhost({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div style={{ position: 'fixed', left: x, top: y, transform: 'translate(-50%, -50%) scale(var(--stage-scale, 1))', pointerEvents: 'none', zIndex: 100 }}>{children}</div>,
    document.body,
  );
}
