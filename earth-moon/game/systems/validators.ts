import { isNum, isStr } from '@snug/shared/src/validate';
import type { DialogConfig, MinigameConfig, MoonData, Order, SkyData } from '@/game/types';

// 247쪽 그림 VII-8: 월별 황도 12궁 배열
const ZODIAC = ['sagittarius', 'capricorn', 'aquarius', 'pisces', 'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio'];
// 246쪽 탐구: 판 네 장(가~라)
const BOARDS = ['sagittarius', 'pisces', 'gemini', 'virgo'];
// 248~249쪽: 위치 1~8의 이름. 4·6은 이름 없음
const PHASES: (string | null)[] = ['삭', '초승달', '상현달', null, '보름달', null, '하현달', '그믐달'];

export function validateSky(d: SkyData): string[] {
  if (!d || !Array.isArray(d.zodiac) || !Array.isArray(d.boards)) return ['sky: zodiac/boards 배열 필요'];
  const errs: string[] = [];
  if (d.zodiac.length !== 12) errs.push('sky: 황도 12궁은 12개 (247쪽)');
  ZODIAC.forEach((id, i) => {
    const z = d.zodiac.find(x => x.month === i + 1);
    if (!z) errs.push(`sky: ${i + 1}월 누락`);
    else {
      if (z.id !== id) errs.push(`sky: ${i + 1}월은 ${id} (247쪽)`);
      if (!isStr(z.name)) errs.push(`sky: ${i + 1}월 이름 필요`);
      if (!isNum(z.page)) errs.push(`sky: ${i + 1}월 쪽수 필요`);
    }
  });
  if (d.boards.length !== 4) errs.push('sky: 별자리판은 4장 (246쪽)');
  BOARDS.forEach((id, i) => { if (d.boards[i]?.id !== id) errs.push(`sky: 판 ${i + 1}은 ${id} (246쪽)`); });
  return errs;
}

export function validateMoon(d: MoonData): string[] {
  if (!d || !Array.isArray(d.positions)) return ['moon: positions 배열 필요'];
  const errs: string[] = [];
  if (d.positions.length !== 8) errs.push('moon: 위치는 8개 (248쪽)');
  PHASES.forEach((name, i) => {
    const p = d.positions.find(x => x.pos === i + 1);
    if (!p) errs.push(`moon: 위치 ${i + 1} 누락`);
    else {
      if (p.name !== name) errs.push(`moon: 위치 ${i + 1}은 ${name ?? '이름 없음'} (249쪽)`);
      if (!isNum(p.page)) errs.push(`moon: 위치 ${i + 1} 쪽수 필요`);
    }
  });
  return errs;
}

export function validateOrders(orders: Order[]): string[] {
  if (!Array.isArray(orders)) return ['orders: 배열 필요'];
  const errs: string[] = [];
  const ids = new Set<string>();
  orders.forEach((o, i) => {
    if (!isStr(o.id) || ids.has(o.id)) errs.push(`orders[${i}]: id 필요·중복 불가`);
    ids.add(o.id);
    if (!isStr(o.title) || !isStr(o.room) || !isStr(o.minigame)) errs.push(`orders[${i}]: title/room/minigame 필요`);
    if (!Array.isArray(o.pages) || !o.pages.every(isNum)) errs.push(`orders[${i}]: pages 숫자 배열`);
    if (!Array.isArray(o.cards)) errs.push(`orders[${i}]: cards 배열`);
  });
  orders.forEach(o => (o.requires ?? []).forEach(r => { if (!ids.has(r)) errs.push(`orders: ${o.id}의 선행 의뢰 없음 ${r}`); }));
  const done = new Set<string>();
  let progress = true;
  while (progress) {
    progress = false;
    orders.forEach(o => { if (!done.has(o.id) && (o.requires ?? []).every(r => done.has(r))) { done.add(o.id); progress = true; } });
  }
  if (done.size !== orders.length) errs.push('orders: 선행 의뢰가 순환해 완료할 수 없음');
  return errs;
}

export function validateDialog(d: DialogConfig): string[] {
  if (!d) return ['dialog: 객체 필요'];
  const errs: string[] = [];
  if (!isStr(d.npcName)) errs.push('dialog: npcName 필요');
  (['intro', 'ending'] as const).forEach(k => {
    if (!Array.isArray(d[k]) || d[k].length === 0 || !d[k].every(isStr)) errs.push(`dialog: ${k} 1줄 이상`);
    else if (d[k].length > 2) errs.push(`dialog: ${k} 는 2문장 이내`);
  });
  if (!d.orders || typeof d.orders !== 'object') errs.push('dialog: orders 필요');
  return errs;
}

export function validateMinigame(c: MinigameConfig): string[] {
  if (!c || typeof c !== 'object') return ['minigame: 객체 필요'];
  const errs: string[] = [];
  if (!isNum(c.inputLockMs) || c.inputLockMs < 700 || c.inputLockMs > 1500) errs.push('minigame: inputLockMs는 700~1500');
  if (!c.stars || !isNum(c.stars.two) || !isNum(c.stars.three) || !(c.stars.two < c.stars.three) || c.stars.three > 1 || c.stars.two <= 0) {
    errs.push('minigame: stars는 0 < two < three ≤ 1');
  }
  if (!c.earthSpin || !isNum(c.earthSpin.turns) || c.earthSpin.turns < 1 || c.earthSpin.turns > 3) errs.push('minigame: earthSpin.turns는 1~3');
  if (!c.dayStars || !isNum(c.dayStars.tolerance) || c.dayStars.tolerance < 15 || c.dayStars.tolerance > 60) errs.push('minigame: dayStars.tolerance는 15~60');
  const sh = c.shadow;
  if (!sh || !isNum(sh.totalTol) || !isNum(sh.partialTol) || sh.totalTol <= 0 || !(sh.totalTol < sh.partialTol) || sh.partialTol > 90) errs.push('minigame: shadow는 0 < totalTol < partialTol ≤ 90');
  return errs;
}

export const DATA_FILES = ['sky', 'moon', 'orders', 'dialog-config', 'minigame-config'] as const;
export type DataFile = typeof DATA_FILES[number];
export const VALIDATORS: Record<DataFile, (v: never) => string[]> = {
  'sky': validateSky as (v: never) => string[],
  'moon': validateMoon as (v: never) => string[],
  'orders': validateOrders as (v: never) => string[],
  'dialog-config': validateDialog as (v: never) => string[],
  'minigame-config': validateMinigame as (v: never) => string[],
};
