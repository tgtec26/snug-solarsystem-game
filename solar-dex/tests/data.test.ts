import { describe, it, expect } from 'vitest';
import bodies from '@/public/data/bodies.json';
import sun from '@/public/data/sun.json';
import orders from '@/public/data/orders.json';
import dialog from '@/public/data/dialog-config.json';
import minigame from '@/public/data/minigame-config.json';
import { VALIDATORS, validateOrders, validateBodies } from '@/game/systems/validators';

const FILES = { bodies, sun, orders, 'dialog-config': dialog, 'minigame-config': minigame } as const;

describe('데이터 JSON 검증', () => {
  (Object.keys(FILES) as (keyof typeof FILES)[]).forEach(f => {
    it(`${f}.json 통과`, () => expect(VALIDATORS[f](FILES[f] as never)).toEqual([]));
  });
  it('의뢰 6개, 천체 6·행성 8', () => {
    expect(orders).toHaveLength(6);
    expect(bodies.bodies).toHaveLength(6);
    expect(bodies.planets).toHaveLength(8);
  });
  it('순환 선행 의뢰를 거부한다', () => {
    const bad = [{ id: 'a', title: 't', room: 'r', minigame: 'm', pages: [1], requires: ['b'], cards: [] }, { id: 'b', title: 't', room: 'r', minigame: 'm', pages: [1], requires: ['a'], cards: [] }];
    expect(validateOrders(bad as never).join()).toContain('순환');
  });
  it('행성 집단이 교과서와 다르면 거부한다', () => {
    const bad = JSON.parse(JSON.stringify(bodies));
    bad.planets.find((p: { id: string }) => p.id === 'mars').group = 'jovian';
    expect(validateBodies(bad).join()).toContain('mars');
  });
});
