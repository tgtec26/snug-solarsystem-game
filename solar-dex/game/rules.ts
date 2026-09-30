import type { BodiesData, MinigameConfig, Order, SunData, SunLevels } from '@/game/types';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 특징 카드는 대응표에 적힌 천체에만 붙는다 (229~231, 241쪽) */
export function matchTrait(data: BodiesData, traitId: string, bodyId: string): boolean {
  return data.traits.find(t => t.id === traitId)?.body === bodyId;
}

/** 수·금·지·화 = 지구형, 목·토·천·해 = 목성형 (241쪽) */
export function planetGroup(data: BodiesData, planetId: string): string | null {
  return data.planets.find(p => p.id === planetId)?.group ?? null;
}

/** 235쪽 집단 표의 정성 값을 행성에 배정한다. 수치는 돌려주지 않는다. */
export function criterionValue(data: BodiesData, planetId: string, criterionId: string): string | null {
  const g = planetGroup(data, planetId);
  return data.groups.find(x => x.id === g)?.values[criterionId] ?? null;
}

/** 활동 세기가 오르면 흑점 수·홍염·플레어·코로나·태양풍이 함께 단조 증가한다 (238쪽) */
export function sunActivity(level: number, sun: SunData): SunLevels {
  const v = clamp(Math.round(level), 0, sun.maxLevel);
  return { sunspots: v, prominence: v, flare: v, corona: v, wind: v };
}

/** 활발한 시기에만 지구 영향 5가지가 켜진다 (239쪽). 기준 세기는 연출용 설정이다. */
export function earthEffects(level: number, sun: SunData): string[] {
  return level >= sun.activeLevel ? sun.effects.map(e => e.id) : [];
}

/** 혜성 꼬리는 항상 태양 반대쪽, 태양에 가까울수록(rank가 클수록) 길다 (230쪽). 길이 수치는 상대값이다. */
export function cometTail(rank: number, maxRank: number): { direction: 'away-from-sun'; length: number } {
  return { direction: 'away-from-sun', length: clamp(Math.round(rank), 0, maxRank) + 1 };
}

/** 정확도와 첫 시도로 별 1~3개 */
export function starsFor(accuracy: number, firstTry: boolean, cfg: MinigameConfig): 1 | 2 | 3 {
  if (accuracy >= cfg.stars.three && firstTry) return 3;
  if (accuracy >= cfg.stars.two) return 2;
  return 1;
}

export type UnsafeAction = 'aim-sun-without-filter' | 'light-into-eyes' | 'safe';
/** 태양을 직접 보거나 손전등을 눈에 비추는 행동은 거부한다 (236, 252쪽) */
export function safetyCheck(action: UnsafeAction): { ok: boolean; reason: string } {
  if (action === 'aim-sun-without-filter') return { ok: false, reason: '태양을 직접 보면 안 돼요' };
  if (action === 'light-into-eyes') return { ok: false, reason: '빛을 눈에 비추면 안 돼요' };
  return { ok: true, reason: '' };
}

export function orderUnlocked(orders: Order[], id: string, completed: string[]): boolean {
  const o = orders.find(x => x.id === id);
  return !!o && !completed.includes(id) && o.requires.every(r => completed.includes(r));
}

export function allOrdersDone(orders: Order[], completed: string[]): boolean {
  return orders.every(o => completed.includes(o.id));
}

/** 카드 n장을 뽑는다: 천체마다 1장 이상(가능한 만큼), 나머지는 무작위. rng는 0~1 난수 함수 */
export function pickTraitCards(data: BodiesData, n: number, rng: () => number = Math.random): string[] {
  const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const chosen: string[] = [];
  data.bodies.forEach(b => { const c = shuffle(data.traits.filter(t => t.body === b.id))[0]; if (c) chosen.push(c.id); });
  const rest = shuffle(data.traits.filter(t => !chosen.includes(t.id)).map(t => t.id));
  return shuffle([...chosen, ...rest].slice(0, Math.max(n, chosen.length)));
}

/** 행성 나눔판: 상자 두 개. 같은 무리끼리만 한 상자에 모은다 (235쪽) */
export function sortPlacement(data: BodiesData, boxes: Record<'A' | 'B', string[]>, planetId: string, box: 'A' | 'B'): { ok: boolean; reason: string } {
  const g = planetGroup(data, planetId);
  const other = box === 'A' ? 'B' : 'A';
  const groupOf = (list: string[]) => (list.length ? planetGroup(data, list[0]) : null);
  const here = groupOf(boxes[box]);
  const there = groupOf(boxes[other]);
  if (here !== null && here !== g) return { ok: false, reason: '특징이 다른 행성이에요' };
  if (here === null && there === g) return { ok: false, reason: '같은 무리는 한 상자에 모아요' };
  return { ok: true, reason: '' };
}

/** 혜성 꼬리 방향(도, 화면 좌표: 오른쪽 0°, 아래 90°). 태양에서 혜성을 향한 방향 = 태양 반대쪽 (230쪽) */
export function tailAngle(sun: { x: number; y: number }, comet: { x: number; y: number }): number {
  return (Math.atan2(comet.y - sun.y, comet.x - sun.x) * 180) / Math.PI;
}
/** 꼬리 각도가 태양 반대쪽과 허용 오차 안이면 true */
export function tailPointsAway(sun: { x: number; y: number }, comet: { x: number; y: number }, angle: number, tol: number): boolean {
  const d = Math.abs(((angle - tailAngle(sun, comet) + 540) % 360) - 180);
  return d <= tol;
}

/** 활동 예보: 영향 카드는 정해진 지구 지도 자리에만 붙는다 (239쪽) */
export function effectZoneOk(sun: SunData, effectId: string, zone: string): boolean {
  return sun.effects.find(e => e.id === effectId)?.zone === zone;
}
