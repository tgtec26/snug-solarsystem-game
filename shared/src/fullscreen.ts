/** 첫 터치(시작 조작)에서 호출한다. 실패해도 게임은 계속. */
export function requestFullscreen(): void {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) void el.requestFullscreen().catch(() => { /* 무시 */ });
  } catch { /* 무시 */ }
}

export function toggleFullscreen(): void {
  try {
    if (document.fullscreenElement) void document.exitFullscreen();
    else requestFullscreen();
  } catch { /* 무시 */ }
}
