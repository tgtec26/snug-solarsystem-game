import { isNum, isStr } from '@snug/shared/src/validate';
import type { BodiesData, DialogConfig, MinigameConfig, Order, SunData } from '@/game/types';

const PLANET_IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const BODY_IDS = ['sun', 'planet', 'dwarf', 'asteroid', 'comet', 'moon'];
const CRITERIA = ['mass', 'radius', 'surface', 'ring', 'moons'];
const TERRESTRIAL = ['mercury', 'venus', 'earth', 'mars'];

export function validateBodies(d: BodiesData): string[] {
  if (!d || !Array.isArray(d.bodies) || !Array.isArray(d.traits) || !Array.isArray(d.criteria) || !Array.isArray(d.groups) || !Array.isArray(d.planets)) {
    return ['bodies: bodies/traits/criteria/groups/planets 배열 필요'];
  }
  const errs: string[] = [];
  BODY_IDS.forEach(id => { if (!d.bodies.some(b => b.id === id)) errs.push(`bodies: 천체 누락 ${id}`); });
  const traitIds = new Set<string>();
  d.traits.forEach(t => {
    if (traitIds.has(t.id)) errs.push(`bodies: 특징 id 중복 ${t.id}`);
    traitIds.add(t.id);
    if (!BODY_IDS.includes(t.body)) errs.push(`bodies: 특징 ${t.id} 천체 오류 ${t.body}`);
    if (!isStr(t.text) || t.text.length < 4 || t.text.length > 12) errs.push(`bodies: 특징 ${t.id} 문구는 4~12자`);
    if (!isNum(t.page)) errs.push(`bodies: 특징 ${t.id} 쪽수 필요`);
  });
  BODY_IDS.forEach(id => { if (d.traits.filter(t => t.body === id).length < 1) errs.push(`bodies: ${id} 특징 카드 1장 이상`); });
  CRITERIA.forEach(c => { if (!d.criteria.some(x => x.id === c)) errs.push(`bodies: 기준 누락 ${c}`); });
  d.groups.forEach(g => CRITERIA.forEach(c => { if (!g.values?.[c]) errs.push(`bodies: 집단 ${g.id} 기준 값 누락 ${c}`); }));
  PLANET_IDS.forEach(id => {
    const p = d.planets.find(x => x.id === id);
    if (!p) { errs.push(`bodies: 행성 누락 ${id}`); return; }
    const want = TERRESTRIAL.includes(id) ? 'terrestrial' : 'jovian';
    if (p.group !== want) errs.push(`bodies: ${id}은 ${want} (241쪽)`);
  });
  return errs;
}

export function validateSun(d: SunData): string[] {
  if (!d || !Array.isArray(d.effects)) return ['sun: effects 배열 필요'];
  const errs: string[] = [];
  if (!isNum(d.maxLevel) || d.maxLevel < 1) errs.push('sun: maxLevel은 1 이상');
  if (!isNum(d.activeLevel) || d.activeLevel < 1 || d.activeLevel > d.maxLevel) errs.push('sun: activeLevel은 1~maxLevel');
  if (d.effects.length !== 5) errs.push('sun: 지구 영향은 5가지 (239쪽)');
  else if (new Set(d.effects.map(e => e.zone)).size !== 5 || !d.effects.every(e => isStr(e.zone))) errs.push('sun: 영향마다 서로 다른 지구 지도 자리(zone) 필요');
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
  // 선행 의뢰만으로 모두 풀 수 있어야 한다(순환 금지)
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
  if (!c.bodies || !isNum(c.bodies.cards) || c.bodies.cards < 6 || c.bodies.cards > 11) errs.push('minigame: bodies.cards는 6~11');
  if (!c.comet || !isNum(c.comet.tolerance) || c.comet.tolerance <= 0 || c.comet.tolerance > 60) errs.push('minigame: comet.tolerance는 0~60');
  if (!c.comet || !Array.isArray(c.comet.ranks) || c.comet.ranks.length < 2 || !c.comet.ranks.every(isNum)) errs.push('minigame: comet.ranks 2개 이상');
  const t = c.telescope;
  if (!t || !isNum(t.aimRadius) || t.aimRadius < 15 || t.aimRadius > 80) errs.push('minigame: telescope.aimRadius는 15~80');
  if (!t || !isNum(t.focusTolerance) || t.focusTolerance <= 0.1 || t.focusTolerance > 0.6) errs.push('minigame: telescope.focusTolerance는 0.1 초과~0.6');
  if (!t || !isNum(t.sunGuard) || t.sunGuard < 40 || t.sunGuard > 200) errs.push('minigame: telescope.sunGuard는 40~200');
  const p = c.projection;
  if (!p || !isNum(p.aimRadius) || p.aimRadius < 15 || p.aimRadius > 80) errs.push('minigame: projection.aimRadius는 15~80');
  if (!p || !isNum(p.focusTolerance) || p.focusTolerance <= 0.1 || p.focusTolerance > 0.6) errs.push('minigame: projection.focusTolerance는 0.1 초과~0.6');
  return errs;
}

export const DATA_FILES = ['bodies', 'sun', 'orders', 'dialog-config', 'minigame-config'] as const;
export type DataFile = typeof DATA_FILES[number];
export const VALIDATORS: Record<DataFile, (v: never) => string[]> = {
  'bodies': validateBodies as (v: never) => string[],
  'sun': validateSun as (v: never) => string[],
  'orders': validateOrders as (v: never) => string[],
  'dialog-config': validateDialog as (v: never) => string[],
  'minigame-config': validateMinigame as (v: never) => string[],
};
