import { describe, it, expect, beforeEach } from 'vitest';
import orders from '@/public/data/orders.json';
import type { Order } from '@/game/types';
import { useGameStore, journal } from '@/game/store';

const O = orders as unknown as Order[];
const s = () => useGameStore.getState();

beforeEach(() => { localStorage.clear(); s().reset(); });

describe('store 전이', () => {
  it('title → intro → board', () => {
    s().start(O);
    expect(s().phase).toBe('intro');
    s().next();
    expect(s().phase).toBe('board');
  });
  it('잠긴 의뢰는 수락할 수 없다', () => {
    s().start(O); s().next();
    s().acceptOrder('o2');
    expect(s().phase).toBe('board');
    s().acceptOrder('o0');
    expect(s().phase).toBe('room');
  });
  it('수락하지 않은 의뢰는 완료할 수 없다', () => {
    s().start(O); s().next(); s().acceptOrder('o0');
    s().completeRoom('o1', 3);
    expect(s().completed).toEqual([]);
  });
  it('의뢰를 끝내면 카드가 일지에 등록되고 중복 등록되지 않는다', () => {
    s().start(O); s().next();
    s().acceptOrder('o0'); s().completeRoom('o0', 2); s().next();
    s().acceptOrder('o1'); s().completeRoom('o1', 3);
    expect(s().newCards).toHaveLength(6);
    expect(journal.load()).toHaveLength(6);
    s().restartRun(); s().next();
    s().acceptOrder('o0'); s().completeRoom('o0', 1); s().next();
    s().acceptOrder('o1'); s().completeRoom('o1', 1);
    expect(s().newCards).toEqual([]);
    expect(journal.load()).toHaveLength(6);
  });
  it('마지막 의뢰 뒤 ending → summary', () => {
    s().start(O); s().next();
    for (const o of O) { s().acceptOrder(o.id); s().completeRoom(o.id, 3); s().next(); }
    expect(s().phase).toBe('ending');
    s().next();
    expect(s().phase).toBe('summary');
    expect(journal.load()).toHaveLength(21);
  });
  it('board가 아닐 때 acceptOrder는 무시된다', () => {
    s().start(O);
    s().acceptOrder('o0');
    expect(s().phase).toBe('intro');
  });
});
