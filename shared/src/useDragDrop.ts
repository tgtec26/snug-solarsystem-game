'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { sfx } from './audio';

export interface DragState { id: string; x: number; y: number }

/**
 * 끌어서 놓기 + 탭-탭(카드 선택 후 자리 선택) + 키보드(Enter)를 한 번에 지원한다.
 * 놓을 자리는 요소에 `data-drop="<id>"`를 달아 두면 된다. 캔버스 밖에서 손을 떼도(pointercancel 포함) 끌기가 풀린다.
 */
/** 끌고 있는 카드 크기(무대 단위). 주면 커서 점이 아니라 카드가 가장 많이 겹친 자리를 고른다. */
export interface GhostSize { w: number; h: number }

/** 지금 놓으면 들어갈 자리: 카드가 가장 많이 겹친 `data-drop` 요소, 겹침이 적으면 커서 아래 요소 */
function pickTarget(x: number, y: number, ghost?: GhostSize): string | null {
  if (ghost) {
    const sc = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stage-scale')) || 1;
    const w = ghost.w * sc, h = ghost.h * sc;
    let best: { id: string; area: number } | null = null;
    document.querySelectorAll<HTMLElement>('[data-drop]').forEach(el => {
      const r = el.getBoundingClientRect();
      const ix = Math.min(x + w / 2, r.right) - Math.max(x - w / 2, r.left);
      const iy = Math.min(y + h / 2, r.bottom) - Math.max(y - h / 2, r.top);
      const area = ix > 0 && iy > 0 ? ix * iy : 0;
      if (area > (best?.area ?? 0)) best = { id: el.dataset.drop!, area };
    });
    const found = best as { id: string; area: number } | null;
    if (found && found.area >= w * h * 0.15) return found.id;
  }
  const el = document.elementsFromPoint(x, y).find(n => (n as HTMLElement).dataset?.drop) as HTMLElement | undefined;
  return el?.dataset.drop ?? null;
}

export function useDragDrop(onDrop: (cardId: string, targetId: string) => void, enabled = true, ghost?: GhostSize) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const start = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  // 창 전체에서 포인터를 따라간다. 요소에만 걸면 카드가 다시 그려질 때 이동·뗌 이벤트를 놓쳐 그림자가 커서와 떨어진 채 남는다.
  const latest = useRef({ onDrop, ghost });
  latest.current = { onDrop, ghost };
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => () => stop.current?.(), []);

  const finish = (x: number, y: number, cancel: boolean) => {
    const s = start.current;
    start.current = null;
    stop.current?.();
    setDrag(null);
    setOver(null);
    if (!s) return;
    if (!s.moved) { if (!cancel) { setSelected(cur => (cur === s.id ? null : s.id)); sfx.pickup(); } return; }
    if (cancel) return;
    const target = pickTarget(x, y, latest.current.ghost);
    if (target) { setSelected(null); latest.current.onDrop(s.id, target); }
  };

  const bindCard = (id: string) => ({
    onPointerDown: (e: PointerEvent) => {
      if (!enabled) return;
      stop.current?.();
      start.current = { id, x: e.clientX, y: e.clientY, moved: false };
      const move = (ev: globalThis.PointerEvent) => {
        const st = start.current;
        if (!st) return;
        if (ev.pointerType === 'mouse' && ev.buttons === 0) { finish(ev.clientX, ev.clientY, false); return; } // 놓친 마우스 뗌
        if (!st.moved && Math.hypot(ev.clientX - st.x, ev.clientY - st.y) > 8) { st.moved = true; sfx.pickup(); }
        if (st.moved) { setDrag({ id, x: ev.clientX, y: ev.clientY }); setOver(pickTarget(ev.clientX, ev.clientY, latest.current.ghost)); }
      };
      const up = (ev: globalThis.PointerEvent) => finish(ev.clientX, ev.clientY, false);
      const cancel = (ev: globalThis.PointerEvent) => finish(ev.clientX, ev.clientY, true);
      const blur = () => finish(0, 0, true);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
      window.addEventListener('blur', blur);
      stop.current = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', cancel);
        window.removeEventListener('blur', blur);
        stop.current = null;
      };
    },
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

  return { drag, over, selected, bindCard, placeSelected };
}
