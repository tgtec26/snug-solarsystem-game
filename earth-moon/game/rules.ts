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
