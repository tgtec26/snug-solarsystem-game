import { describe, it, expect } from 'vitest';
import sky from '@/public/data/sky.json';
import moon from '@/public/data/moon.json';
import orders from '@/public/data/orders.json';
import type { MinigameConfig, MoonData, Order, SkyData } from '@/game/types';
import {
  allOrdersDone, chairBoards, isEastward, litFraction, midnightConstellation, moonLabelOk, moonPositionAngle,
  orderUnlocked, phaseName, starsFor, sunConstellation, zodiacSlotOk,
} from '@/game/rules';

const S = sky as SkyData;
const M = moon as MoonData;
const O = orders as unknown as Order[];
const CFG = { inputLockMs: 1000, stars: { two: 0.6, three: 0.9 }, earthSpin: { turns: 1 } } as MinigameConfig;

describe('황도 12궁 (247쪽)', () => {
  it('8월 태양 쪽은 게자리, 한밤중 남쪽은 염소자리', () => {
    expect(sunConstellation(S, 8)).toBe('cancer');
    expect(midnightConstellation(S, 8)).toBe('capricorn');
  });
  it('4월 태양 쪽은 물고기자리', () => expect(sunConstellation(S, 4)).toBe('pisces'));
  it('한밤중 별자리는 항상 6개월 차이(태양 반대쪽)', () => {
    for (let m = 1; m <= 12; m++) expect(midnightConstellation(S, m)).toBe(sunConstellation(S, ((m + 5) % 12) + 1));
  });
  it('카드는 자기 달 슬롯에만 붙는다', () => {
    for (const z of S.zodiac) for (const w of S.zodiac) expect(zodiacSlotOk(S, z.id, w.month)).toBe(z.id === w.id);
  });
});

describe('별자리 회전의자 (246~247쪽)', () => {
  it('교사용 답: 앉은 자리의 반대편 판이 태양 쪽', () => {
    expect(chairBoards(S, 'sagittarius')).toEqual({ night: 'sagittarius', sun: 'gemini' });
    expect(chairBoards(S, 'pisces')).toEqual({ night: 'pisces', sun: 'virgo' });
    expect(chairBoards(S, 'gemini')).toEqual({ night: 'gemini', sun: 'sagittarius' });
    expect(chairBoards(S, 'virgo')).toEqual({ night: 'virgo', sun: 'pisces' });
  });
  it('없는 판은 null', () => expect(chairBoards(S, 'leo')).toBeNull());
});

describe('지구 자전 방향 (244쪽)', () => {
  it('서→동만 맞다', () => {
    expect(isEastward(30)).toBe(true);
    expect(isEastward(-30)).toBe(false);
  });
});

describe('달 위상판 (248~250쪽)', () => {
  it('위치 각도는 태양 방향에서 시계 반대 45°씩', () => {
    expect(moonPositionAngle(1)).toBe(0);
    expect(moonPositionAngle(3)).toBe(90);
    expect(moonPositionAngle(5)).toBe(180);
    expect(moonPositionAngle(8)).toBe(315);
  });
  it('밝은 비율: 삭 0, 상현 0.5, 보름 1', () => {
    expect(litFraction(1)).toBeCloseTo(0);
    expect(litFraction(3)).toBeCloseTo(0.5);
    expect(litFraction(5)).toBeCloseTo(1);
    expect(litFraction(7)).toBeCloseTo(0.5);
  });
  it('이름: 4·6은 없다, 이름표는 자기 위치에만', () => {
    expect(phaseName(M, 1)).toBe('삭');
    expect(phaseName(M, 4)).toBeNull();
    expect(phaseName(M, 6)).toBeNull();
    expect(moonLabelOk(M, '보름달', 5)).toBe(true);
    expect(moonLabelOk(M, '보름달', 1)).toBe(false);
  });
});

describe('별점', () => {
  it('정확도와 첫 시도', () => {
    expect(starsFor(1, true, CFG)).toBe(3);
    expect(starsFor(1, false, CFG)).toBe(2);
    expect(starsFor(0.3, false, CFG)).toBe(1);
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
  it('일지 카드는 28장이고 중복이 없다', () => {
    const cards = O.flatMap(o => o.cards);
    expect(cards).toHaveLength(28);
    expect(new Set(cards).size).toBe(28);
  });
});
