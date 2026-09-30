/**
 * 여러 판에 걸쳐 모으는 관측 일지. 진행 중인 판 저장과 분리한다.
 * localStorage를 쓸 수 없어도(개인 창 등) 게임은 계속되므로 모든 접근을 try/catch로 감싼다.
 */
export function createJournal(key: string) {
  const load = (): string[] => {
    try {
      const v: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  };
  /** 새로 등록하면 true, 이미 있으면 false */
  const add = (id: string): boolean => {
    const cur = load();
    if (cur.includes(id)) return false;
    try { localStorage.setItem(key, JSON.stringify([...cur, id])); } catch { /* 저장 불가 — 이번 판 표시는 계속 */ }
    return true;
  };
  return { load, add };
}
