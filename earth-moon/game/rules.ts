import type { MinigameConfig, MoonData, Order, SkyData } from '@/game/types';

/** 황도 12궁: 그 달에 태양이 있는 쪽 별자리 (247쪽 그림 VII-8) */
export function sunConstellation(sky: SkyData, month: number): string | null {
  return sky.zodiac.find(z => z.month === month)?.id ?? null;
}

/** 한밤중 남쪽 하늘에 보이는 별자리 = 태양 반대쪽, 6개월 차이 (247쪽) */
export function midnightConstellation(sky: SkyData, month: number): string | null {
  return sunConstellation(sky, ((month + 5) % 12) + 1);
}

/** 12궁 링: 카드는 배열표의 자기 달 슬롯에만 붙는다 */
export function zodiacSlotOk(sky: SkyData, cardId: string, month: number): boolean {
  return sky.zodiac.find(z => z.month === month)?.id === cardId;
}

/** 별자리 회전의자: 관찰자가 판 X에 앉으면 X는 태양 반대쪽, 전등 건너편 판이 태양 쪽 (246~247쪽, 판 4장 90° 간격) */
export function chairBoards(sky: SkyData, seat: string): { night: string; sun: string } | null {
  const i = sky.boards.findIndex(b => b.id === seat);
  if (i < 0) return null;
  return { night: sky.boards[i].id, sun: sky.boards[(i + 2) % sky.boards.length].id };
}

/** 지구는 서쪽에서 동쪽으로 자전·공전한다 (244, 247쪽). 북쪽 위에서 볼 때 시계 반대 방향 = 각도 증가(수학 좌표) */
export function isEastward(deltaDeg: number): boolean {
  return deltaDeg > 0;
}

/** 달 위치 1~8의 각도(도): 태양 방향(0°)에서 시계 반대 방향으로 45°씩 (248~249쪽 탐구 모형) */
export function moonPositionAngle(pos: number): number {
  return (((pos - 1) * 45) % 360 + 360) % 360;
}

/** 지구에서 보이는 달의 밝은 부분 비율 0~1 (삭 0, 보름달 1) */
export function litFraction(pos: number): number {
  return (1 - Math.cos((moonPositionAngle(pos) * Math.PI) / 180)) / 2;
}

/** 위치의 교과서 이름. 4·6은 이름이 없다(모양만 기록) */
export function phaseName(moon: MoonData, pos: number): string | null {
  return moon.positions.find(p => p.pos === pos)?.name ?? null;
}

/** 이름표는 그 이름의 위치에만 붙는다 */
export function moonLabelOk(moon: MoonData, label: string, pos: number): boolean {
  return phaseName(moon, pos) === label;
}

/** 정확도와 첫 시도로 별 1~3개 */
export function starsFor(accuracy: number, firstTry: boolean, cfg: MinigameConfig): 1 | 2 | 3 {
  if (accuracy >= cfg.stars.three && firstTry) return 3;
  if (accuracy >= cfg.stars.two) return 2;
  return 1;
}

export function orderUnlocked(orders: Order[], id: string, completed: string[]): boolean {
  const o = orders.find(x => x.id === id);
  return !!o && !completed.includes(id) && o.requires.every(r => completed.includes(r));
}

export function allOrdersDone(orders: Order[], completed: string[]): boolean {
  return orders.every(o => completed.includes(o.id));
}

/** 자전 누적: 서쪽에서 동쪽 방향 회전만 쌓는다 (244쪽). 반대로 돌리면 그대로 */
export function spinAccumulate(total: number, deltaDeg: number): number {
  return isEastward(deltaDeg) ? total + deltaDeg : total;
}
export function spinDone(total: number, turns: number): boolean {
  return total >= turns * 360;
}

export type SkyDirection = 'north' | 'east' | 'south' | 'west';
/** 동쪽 하늘은 비스듬히 떠오르고, 남쪽은 동쪽에서 서쪽로 지나고, 서쪽은 비스듬히 진다 (245쪽). 화면 각도(도, 오른쪽 0°·아래 +90°) */
const SKY_MOTION: Record<Exclude<SkyDirection, 'north'>, number> = { east: -60, south: 0, west: 60 };

/** 북쪽 하늘: 북극성을 중심으로 시계 반대 방향 (245쪽). 화면 좌표(아래가 +y)에서 from에서 to가 중심 기준 시계 반대인지 */
export function rotatesCounterclockwise(center: { x: number; y: number }, from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  return (from.x - center.x) * (to.y - center.y) - (from.y - center.y) * (to.x - center.x) < 0;
}

/** 끌어서 그린 별의 이동 방향이 그 방향 하늘의 일주 운동과 맞는지. 북쪽은 rotatesCounterclockwise로 따로 판정한다 */
export function starMotionOk(dir: Exclude<SkyDirection, 'north'>, dx: number, dy: number, tol: number): boolean {
  const a = (Math.atan2(dy, dx) * 180) / Math.PI;
  return Math.abs(((a - SKY_MOTION[dir] + 540) % 360) - 180) <= tol;
}

/** 각도(도, 0°~360°)에서 가장 가까운 자리 번호 0..n-1 (자리는 0°부터 360/n 간격) */
export function nearestSlot(angleDeg: number, n: number): number {
  const step = 360 / n;
  return Math.round((((angleDeg % 360) + 360) % 360) / step) % n;
}

/** 초승달~상현~(4)~보름: 위치 2~4는 차오르는 쪽(오른쪽이 밝음), 6~8은 기우는 쪽(왼쪽이 밝음) (북반구, 248~249쪽) */
export function isWaxing(pos: number): boolean {
  const a = moonPositionAngle(pos);
  return a > 0 && a < 180;
}

export type EclipseKind = { kind: 'solar' | 'lunar'; degree: 'total' | 'partial' };
/**
 * 그림자 모형 (252~253쪽): 태양에 가까운 공이 가운데면 일직선인지 본다. 태양-달-지구면 일식, 태양-지구-달이면 월식.
 * 가운데 공이 태양과 먼 공을 잇는 직선에서 벗어난 거리로 전체(개기)·일부(부분)를 가른다. 가운데 공은 태양과 먼 공 사이에 있어야 한다.
 */
export function eclipseKind(sun: { x: number; y: number }, earth: { x: number; y: number }, moon: { x: number; y: number }, cfg: MinigameConfig): EclipseKind | null {
  const moonMiddle = Math.hypot(moon.x - sun.x, moon.y - sun.y) < Math.hypot(earth.x - sun.x, earth.y - sun.y);
  const mid = moonMiddle ? moon : earth;
  const far = moonMiddle ? earth : moon;
  const dx = far.x - sun.x, dy = far.y - sun.y;
  const len = Math.hypot(dx, dy);
  const t = ((mid.x - sun.x) * dx + (mid.y - sun.y) * dy) / (len * len);
  if (!(t > 0 && t < 1)) return null;
  const off = Math.abs((mid.x - sun.x) * dy - (mid.y - sun.y) * dx) / len;
  const { totalTol, partialTol } = cfg.shadow;
  const degree = off <= totalTol ? 'total' : off <= partialTol ? 'partial' : null;
  return degree ? { kind: moonMiddle ? 'solar' : 'lunar', degree } : null;
}
