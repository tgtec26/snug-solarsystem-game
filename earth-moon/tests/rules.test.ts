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

import { spinAccumulate, spinDone, rotatesCounterclockwise, starMotionOk, nearestSlot, isWaxing, eclipseKind } from '@/game/rules';

describe('지구 자전 돌리기 (244쪽)', () => {
  it('서→동 회전만 쌓이고 한 바퀴면 완료', () => {
    let t = spinAccumulate(0, 90);
    t = spinAccumulate(t, -50);
    expect(t).toBe(90);
    t = spinAccumulate(t, 270);
    expect(spinDone(t, 1)).toBe(true);
    expect(spinDone(359, 1)).toBe(false);
  });
});

describe('하루 동안 별의 운동 (245쪽)', () => {
  const c = { x: 0, y: 0 };
  it('북쪽 하늘: 북극성 중심 시계 반대 방향', () => {
    expect(rotatesCounterclockwise(c, { x: 1, y: 0 }, { x: 0, y: -1 })).toBe(true);
    expect(rotatesCounterclockwise(c, { x: 1, y: 0 }, { x: 0, y: 1 })).toBe(false);
  });
  it('동쪽은 오른쪽 위, 남쪽은 오른쪽, 서쪽은 오른쪽 아래로 이동', () => {
    expect(starMotionOk('east', 10, -17, 40)).toBe(true);
    expect(starMotionOk('east', 10, 17, 40)).toBe(false);
    expect(starMotionOk('south', 20, 0, 40)).toBe(true);
    expect(starMotionOk('south', -20, 0, 40)).toBe(false);
    expect(starMotionOk('west', 10, 17, 40)).toBe(true);
    expect(starMotionOk('west', 10, -17, 40)).toBe(false);
  });
});

describe('자리 찾기와 달 모양', () => {
  it('가장 가까운 자리', () => {
    expect(nearestSlot(10, 4)).toBe(0);
    expect(nearestSlot(80, 4)).toBe(1);
    expect(nearestSlot(350, 8)).toBe(0);
    expect(nearestSlot(-20, 8)).toBe(0);
  });
  it('차오르는 위치는 2~4, 기우는 위치는 6~8', () => {
    [2, 3, 4].forEach(p => expect(isWaxing(p)).toBe(true));
    [1, 5, 6, 7, 8].forEach(p => expect(isWaxing(p)).toBe(false));
  });
});

describe('그림자 모형 (252~253쪽)', () => {
  const cfg = { shadow: { totalTol: 14, partialTol: 48 } } as MinigameConfig;
  const sun = { x: 0, y: 0 };
  it('태양-달-지구 일직선이면 개기일식, 조금 벗어나면 부분일식', () => {
    expect(eclipseKind(sun, { x: 400, y: 0 }, { x: 200, y: 5 }, cfg)).toEqual({ kind: 'solar', degree: 'total' });
    expect(eclipseKind(sun, { x: 400, y: 0 }, { x: 200, y: 30 }, cfg)).toEqual({ kind: 'solar', degree: 'partial' });
    expect(eclipseKind(sun, { x: 400, y: 0 }, { x: 200, y: 90 }, cfg)).toBeNull();
  });
  it('태양-지구-달 일직선이면 개기월식, 조금 벗어나면 부분월식', () => {
    expect(eclipseKind(sun, { x: 200, y: 0 }, { x: 400, y: 0 }, cfg)).toEqual({ kind: 'lunar', degree: 'total' });
    expect(eclipseKind(sun, { x: 200, y: 0 }, { x: 400, y: 50 }, cfg)?.degree).toBe('partial');
  });
  it('태양이 가운데이거나 같은 쪽에 있으면 식이 없다', () => {
    expect(eclipseKind({ x: 200, y: 0 }, { x: 400, y: 0 }, { x: 0, y: 0 }, cfg)).toBeNull();
  });
});
