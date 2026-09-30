/** 화면 전환 직후 연타가 다음 화면으로 넘어가는 것을 막는다 (입력 견고성). */
export function createInputLock(now: () => number = Date.now) {
  let until = 0;
  return {
    lock: (ms: number) => { until = now() + ms; },
    isLocked: () => now() < until,
  };
}
