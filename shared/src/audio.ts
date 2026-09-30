/**
 * 효과음·배경음. 파일은 각 게임의 `public/assets/audio/<이름>.mp3`.
 * 브라우저 자동 재생 제한과 저장소 접근 오류는 모두 무시하고 게임을 계속한다.
 */
const KEY = 'snug-muted-v1';
let muted = false;
try { muted = localStorage.getItem(KEY) === '1'; } catch { /* 저장 불가 */ }

const cache: Record<string, HTMLAudioElement> = {};
const get = (name: string) => (cache[name] ??= new Audio(`/assets/audio/${name}.mp3`));
let bgm: HTMLAudioElement | null = null;

function play(name: string, volume = 0.7) {
  if (muted || typeof Audio === 'undefined') return;
  try {
    const a = get(name).cloneNode() as HTMLAudioElement;
    a.volume = volume;
    void a.play().catch(() => {});
  } catch { /* 재생 불가 */ }
}

export const sfx = {
  correct: () => play('correct'),
  error: () => play('error', 0.5),
  success: () => play('success'),
  ending: () => play('start_ending'),
};

export const music = {
  start(name = 'quiz-background') {
    if (typeof Audio === 'undefined') return;
    try {
      if (!bgm) { bgm = new Audio(`/assets/audio/${name}.mp3`); bgm.loop = true; bgm.volume = 0.25; }
      bgm.muted = muted;
      void bgm.play().catch(() => {});
    } catch { /* 재생 불가 */ }
  },
};

export function isMuted() { return muted; }
export function toggleMute(): boolean {
  muted = !muted;
  try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* 저장 불가 */ }
  if (bgm) bgm.muted = muted;
  return muted;
}
