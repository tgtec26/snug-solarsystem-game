import { describe, it, expect } from 'vitest';
import sky from '@/public/data/sky.json';
import moon from '@/public/data/moon.json';
import orders from '@/public/data/orders.json';
import dialog from '@/public/data/dialog-config.json';
import minigame from '@/public/data/minigame-config.json';
import { VALIDATORS, validateOrders, validateSky, validateMoon } from '@/game/systems/validators';

const FILES = { sky, moon, orders, 'dialog-config': dialog, 'minigame-config': minigame } as const;

describe('데이터 JSON 검증', () => {
  (Object.keys(FILES) as (keyof typeof FILES)[]).forEach(f => {
    it(`${f}.json 통과`, () => expect(VALIDATORS[f](FILES[f] as never)).toEqual([]));
  });
  it('의뢰 5개, 12궁 12, 판 4, 달 위치 8', () => {
    expect(orders).toHaveLength(5);
    expect(sky.zodiac).toHaveLength(12);
    expect(sky.boards).toHaveLength(4);
    expect(moon.positions).toHaveLength(8);
  });
  it('순환 선행 의뢰를 거부한다', () => {
    const bad = [{ id: 'a', title: 't', room: 'r', minigame: 'm', pages: [1], requires: ['b'], cards: [] }, { id: 'b', title: 't', room: 'r', minigame: 'm', pages: [1], requires: ['a'], cards: [] }];
    expect(validateOrders(bad as never).join()).toContain('순환');
  });
  it('12궁 배열이 교과서와 다르면 거부한다', () => {
    const bad = JSON.parse(JSON.stringify(sky));
    bad.zodiac[7].id = 'leo';
    expect(validateSky(bad).join()).toContain('8월');
  });
  it('달 위치 이름이 교과서와 다르면 거부한다', () => {
    const bad = JSON.parse(JSON.stringify(moon));
    bad.positions[3].name = '하현달';
    expect(validateMoon(bad).join()).toContain('위치 4');
  });
});
