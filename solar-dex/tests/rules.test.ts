import { describe, it, expect } from 'vitest';
import bodies from '@/public/data/bodies.json';
import sun from '@/public/data/sun.json';
import orders from '@/public/data/orders.json';
import minigame from '@/public/data/minigame-config.json';
import type { BodiesData, Order, SunData } from '@/game/types';
import { matchTrait, planetGroup, criterionValue, sunActivity, earthEffects, cometTail, starsFor, safetyCheck, orderUnlocked, allOrdersDone } from '@/game/rules';

const B = bodies as unknown as BodiesData;
const S = sun as unknown as SunData;
const O = orders as unknown as Order[];

describe('특징 카드 → 천체 (229~231, 241쪽)', () => {
  it('모든 특징 카드는 대응표의 천체에만 맞는다', () => {
    B.traits.forEach(t => B.bodies.forEach(b => expect(matchTrait(B, t.id, b.id)).toBe(t.body === b.id)));
  });
  it('모르는 카드는 어디에도 맞지 않는다', () => expect(matchTrait(B, 'nope', 'sun')).toBe(false));
});

describe('행성 분류 (235, 241쪽)', () => {
  it('수금지화는 지구형, 목토천해는 목성형', () => {
    ['mercury', 'venus', 'earth', 'mars'].forEach(p => expect(planetGroup(B, p)).toBe('terrestrial'));
    ['jupiter', 'saturn', 'uranus', 'neptune'].forEach(p => expect(planetGroup(B, p)).toBe('jovian'));
  });
  it('5기준 정성 값: 지구형 작다·암석·고리 없다·위성 적다 / 목성형 크다·기체·고리 있다·위성 많다', () => {
    expect(['mass', 'radius', 'surface', 'ring', 'moons'].map(c => criterionValue(B, 'earth', c))).toEqual(['small', 'small', 'rock', 'none', 'few']);
    expect(['mass', 'radius', 'surface', 'ring', 'moons'].map(c => criterionValue(B, 'saturn', c))).toEqual(['large', 'large', 'gas', 'yes', 'many']);
  });
  it('알 수 없는 행성은 null', () => expect(criterionValue(B, 'pluto', 'mass')).toBeNull());
});

describe('태양 활동 (238~239쪽)', () => {
  it('세기가 오르면 다섯 가지가 함께 단조 증가한다', () => {
    let prev = sunActivity(0, S);
    for (let l = 1; l <= S.maxLevel; l++) {
      const cur = sunActivity(l, S);
      (Object.keys(cur) as (keyof typeof cur)[]).forEach(k => expect(cur[k]).toBeGreaterThan(prev[k]));
      prev = cur;
    }
  });
  it('범위를 벗어난 세기는 잘린다', () => {
    expect(sunActivity(-3, S).wind).toBe(0);
    expect(sunActivity(99, S).wind).toBe(S.maxLevel);
  });
  it('활발한 시기(activeLevel 이상)에만 영향 5가지가 켜진다', () => {
    for (let l = 0; l < S.activeLevel; l++) expect(earthEffects(l, S)).toEqual([]);
    expect(earthEffects(S.activeLevel, S)).toHaveLength(5);
  });
});

describe('혜성 꼬리 (230쪽)', () => {
  it('꼬리는 항상 태양 반대쪽, 가까울수록 길다', () => {
    const lens = [0, 1, 2, 3].map(r => cometTail(r, 3));
    lens.forEach(t => expect(t.direction).toBe('away-from-sun'));
    expect(lens.map(t => t.length)).toEqual([1, 2, 3, 4]);
  });
});

describe('별점·안전', () => {
  it('별점: 정확도와 첫 시도', () => {
    expect(starsFor(1, true, minigame)).toBe(3);
    expect(starsFor(1, false, minigame)).toBe(2);
    expect(starsFor(0.7, true, minigame)).toBe(2);
    expect(starsFor(0.2, true, minigame)).toBe(1);
  });
  it('안전 규칙 2건 거부', () => {
    expect(safetyCheck('aim-sun-without-filter').ok).toBe(false);
    expect(safetyCheck('light-into-eyes').ok).toBe(false);
    expect(safetyCheck('safe').ok).toBe(true);
  });
});

describe('의뢰 흐름', () => {
  it('처음에는 튜토리얼만 열려 있다', () => {
    expect(O.filter(o => orderUnlocked(O, o.id, [])).map(o => o.id)).toEqual(['o0']);
  });
  it('순서대로 모두 완료할 수 있다', () => {
    const done: string[] = [];
    for (const o of O) { expect(orderUnlocked(O, o.id, done)).toBe(true); done.push(o.id); }
    expect(allOrdersDone(O, done)).toBe(true);
  });
  it('일지 카드는 21장이고 중복이 없다', () => {
    const cards = O.flatMap(o => o.cards);
    expect(cards).toHaveLength(21);
    expect(new Set(cards).size).toBe(21);
  });
});
