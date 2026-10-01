import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createJournal } from '@snug/shared/src/journal';
import type { Order, Phase } from '@/game/types';
import { allOrdersDone, orderUnlocked } from '@/game/rules';

export const journal = createJournal('solar-dex-journal-v1');

export interface GameState {
  phase: Phase;
  orders: Order[];               // 진행 판에서 쓰는 의뢰 목록 (dataStore에서 start 때 복사)
  current: string | null;        // 수락한 의뢰 id
  completed: string[];
  stars: Record<string, number>;
  newCards: string[];            // 이번 판에 새로 등록한 일지 카드
  startedAt: number | null;
  elapsedMs: number;
}
interface Actions {
  start: (orders: Order[]) => void;
  next: () => void;
  acceptOrder: (id: string) => void;
  completeRoom: (id: string, stars: number) => void;
  restartRun: () => void;
  reset: () => void;
}
const fresh = (): GameState => ({
  phase: 'title', orders: [], current: null, completed: [], stars: {}, newCards: [], startedAt: null, elapsedMs: 0,
});
/** 버튼·연출이 끝나면 넘어가는 단순 전이 */
const NEXT: Partial<Record<Phase, Phase>> = { intro: 'board', finale: 'ending', ending: 'summary' };

export const useGameStore = create<GameState & Actions>()(persist((set) => ({
  ...fresh(),
  start: (orders) => set({ ...fresh(), orders, phase: 'intro', startedAt: Date.now() }),
  next: () => set(s => {
    if (s.phase === 'result') {
      return allOrdersDone(s.orders, s.completed)
        ? { phase: 'finale', current: null, elapsedMs: s.startedAt ? Date.now() - s.startedAt : 0 }
        : { phase: 'board', current: null };
    }
    const to = NEXT[s.phase];
    return to ? { phase: to } : {};
  }),
  acceptOrder: (id) => set(s => (s.phase === 'board' && orderUnlocked(s.orders, id, s.completed) ? { current: id, phase: 'room' } : {})),
  completeRoom: (id, stars) => set(s => {
    if (s.phase !== 'room' || s.current !== id) return {};   // 수락하지 않은 의뢰 완료 금지
    const order = s.orders.find(o => o.id === id);
    if (!order) return {};
    const fresh = order.cards.filter(c => journal.add(c));
    return {
      completed: s.completed.includes(id) ? s.completed : [...s.completed, id],
      stars: { ...s.stars, [id]: Math.min(3, Math.max(1, Math.round(stars))) },
      newCards: [...s.newCards, ...fresh],
      phase: 'result',
    };
  }),
  restartRun: () => set(s => ({ ...fresh(), orders: s.orders, phase: 'intro', startedAt: Date.now() })),
  reset: () => set(fresh()),
}), {
  name: 'solar-dex-run-v1',
  version: 1,
  storage: createJSONStorage(() => localStorage),
}));
