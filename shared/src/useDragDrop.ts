'use client';

import { useCallback, useRef, useState, type PointerEvent } from 'react';

export interface DragState { id: string; x: number; y: number }

/**
 * 끌어서 놓기 + 탭-탭(카드 선택 후 자리 선택) + 키보드(Enter)를 한 번에 지원한다.
 * 놓을 자리는 요소에 `data-drop="<id>"`를 달아 두면 된다. 캔버스 밖에서 손을 떼도(pointercancel 포함) 끌기가 풀린다.
 */
export function useDragDrop(onDrop: (cardId: string, targetId: string) => void, enabled = true) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const start = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);

  const finish = useCallback((e: PointerEvent, cancel: boolean) => {
    const s = start.current;
    start.current = null;
    setDrag(null);
    if (!s) return;
    if (!s.moved) { if (!cancel) setSelected(cur => (cur === s.id ? null : s.id)); return; }
    if (cancel) return;
    const el = document.elementsFromPoint(e.clientX, e.clientY).find(n => (n as HTMLElement).dataset?.drop) as HTMLElement | undefined;
    if (el?.dataset.drop) { setSelected(null); onDrop(s.id, el.dataset.drop); }
  }, [onDrop]);

  const bindCard = (id: string) => ({
    onPointerDown: (e: PointerEvent) => {
      if (!enabled) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      start.current = { id, x: e.clientX, y: e.clientY, moved: false };
    },
    onPointerMove: (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8) s.moved = true;
      if (s.moved) setDrag({ id, x: e.clientX, y: e.clientY });
    },
    onPointerUp: (e: PointerEvent) => finish(e, false),
    onPointerCancel: (e: PointerEvent) => finish(e, true),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (enabled && !e.repeat && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelected(cur => (cur === id ? null : id)); }
    },
  });

  /** 선택된 카드를 자리에 놓는다 (탭-탭, 키보드) */
  const placeSelected = (targetId: string) => {
    if (!enabled || !selected) return;
    const id = selected;
    setSelected(null);
    onDrop(id, targetId);
  };

  return { drag, selected, bindCard, placeSelected };
}
