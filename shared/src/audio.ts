/**
 * 효과음·배경음. 파일은 각 게임의 `public/assets/audio/`, 장면별 곡·효과음 파일·음량은 `public/data/audio-config.json`(어드민)에서 정한다.
 * 효과음은 WebAudio(아이폰 Safari는 HTMLAudio 음량 조절이 안 됨), 배경음은 HTMLAudio로 재생한다.
 * 브라우저 자동 재생 제한과 저장소 접근 오류는 모두 무시하고 게임을 계속한다.
 */
import { isNum, isStr } from './validate';

const KEY = 'snug-muted-v1';
/** 같은 효과음이 이 시간(ms) 안에 다시 울리면 무시한다 */
export const SFX_MIN_GAP_MS = 90;

export interface AudioConfig {
  volumes: { bgm: number; sfx: number };
  /** 장면(phase) → 배경음 파일 이름. 빈 문자열이면 그 장면은 배경음을 끈다 */
  bgm: Record<string, string>;
  /** 효과음 이름 → 파일 이름과 음량 */
  sfx: Record<string, { file: string; volume: number }>;
}

export function validateAudioConfig(c: AudioConfig): string[] {
  if (!c || typeof c !== 'object') return ['audio: 객체 필요'];
  const errs: string[] = [];
  const vol = (v: unknown) => isNum(v) && v >= 0 && v <= 1;
  if (!c.volumes || !vol(c.volumes.bgm) || !vol(c.volumes.sfx)) errs.push('audio: volumes.bgm·sfx는 0~1');
  if (!c.bgm || typeof c.bgm !== 'object') errs.push('audio: bgm 필요');
  else Object.entries(c.bgm).forEach(([k, v]) => { if (typeof v !== 'string') errs.push(`audio: bgm.${k}는 파일 이름(끄려면 빈 문자열)`); });
  if (!c.sfx || typeof c.sfx !== 'object') errs.push('audio: sfx 필요');
  else Object.entries(c.sfx).forEach(([k, v]) => {
    if (!v || !isStr(v.file)) errs.push(`audio: sfx.${k}.file 필요`);
    if (!v || !vol(v.volume)) errs.push(`audio: sfx.${k}.volume은 0~1`);
  });
  return errs;
}

/** 이 장면에서 틀 배경음 파일. 설정이 없거나 장면이 없으면 빈 문자열(조용히) */
export function trackForScene(cfg: AudioConfig | null, scene: string): string {
  return cfg?.bgm?.[scene] ?? '';
}

/** 같은 이름의 소리가 짧은 간격으로 연타되는 것을 막는다 */
export function createSfxGate(now: () => number = () => Date.now(), gap = SFX_MIN_GAP_MS) {
  const last = new Map<string, number>();
  return (name: string) => {
    const t = now();
    const prev = last.get(name);
    if (prev !== undefined && t - prev < gap) return false;
    last.set(name, t);
    return true;
  };
}

let muted = false;
try { muted = localStorage.getItem(KEY) === '1'; } catch { /* 저장 불가 */ }

let cfg: AudioConfig | null = null;
const gate = createSfxGate();
const url = (file: string) => `/assets/audio/${file}`;

// ---------- 효과음 (WebAudio) ----------
let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
const loading = new Set<string>();

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const g = globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = g.AudioContext ?? g.webkitAudioContext;
    if (Ctor) ctx = new Ctor();
  } catch { /* 만들 수 없음 */ }
  return ctx;
}

function loadBuffer(file: string) {
  const c = getCtx();
  if (!c || buffers.has(file) || loading.has(file)) return;
  loading.add(file);
  fetch(url(file))
    .then(r => r.arrayBuffer())
    .then(data => c.decodeAudioData(data))
    .then(buf => { buffers.set(file, buf); })
    .catch(() => { /* 불러오기 실패 */ })
    .finally(() => loading.delete(file));
}

function play(name: string) {
  const entry = cfg?.sfx[name];
  if (muted || !entry || !gate(name)) return;
  const c = getCtx();
  const buf = buffers.get(entry.file);
  if (!c || !buf) { loadBuffer(entry.file); return; }
  try {
    const src = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = buf;
    gain.gain.value = entry.volume * (cfg?.volumes.sfx ?? 1);
    src.connect(gain).connect(c.destination);
    src.start();
  } catch { /* 재생 불가 */ }
}

export const sfx = {
  correct: () => play('correct'),
  error: () => play('error'),
  success: () => play('success'),
  fanfare: () => play('fanfare'),
  pickup: () => play('pickup'),
};

// ---------- 배경음 (HTMLAudio) ----------
let bgm: HTMLAudioElement | null = null;
let bgmFile = '';
let scene = 'title';
let started = false;   // 첫 사용자 입력에서 시작됨
let hidden = false;    // 탭이 숨겨진 동안 멈춘다

/** 현재 장면의 곡을 튼다. 재생이 시작됐거나 틀 곡이 없으면 true */
function applyScene(): Promise<boolean> {
  if (!started || typeof Audio === 'undefined') return Promise.resolve(false);
  const file = trackForScene(cfg, scene);
  try {
    if (!(file === bgmFile && bgm)) { // 같은 곡이면 이어서 둔다
      if (bgm) { bgm.pause(); bgm = null; }
      bgmFile = file;
      if (file) {
        bgm = new Audio(url(file));
        bgm.loop = true;
        bgm.volume = cfg?.volumes.bgm ?? 0.25;
        bgm.muted = muted;
      }
    }
    if (!bgm) return Promise.resolve(true);
    if (hidden) return Promise.resolve(true);
    return bgm.play().then(() => true, () => false);
  } catch { return Promise.resolve(false); }
}

export const music = {
  /** 첫 사용자 입력에서 부른다: 오디오를 풀고 현재 장면의 배경음을 시작한다 */
  start(): Promise<boolean> {
    started = true;
    const c = getCtx();
    if (c) { void c.resume().catch(() => {}); Object.values(cfg?.sfx ?? {}).forEach(e => loadBuffer(e.file)); }
    return applyScene();
  },
  /** 장면(phase)이 바뀌면 부른다. 시작 전이면 기억만 해 두었다가 start 때 쓴다 */
  setScene(next: string) { scene = next; void applyScene(); },
  isPlaying: () => !!bgm && !bgm.paused,
};

/** 자동 재생이 막힌 채 열린 경우(새로고침 등)를 위해, 첫 터치·키 입력에서 배경음을 시작한다. 시작되면 스스로 해제한다. 해제 함수를 돌려준다. */
export function armAutoUnlock() {
  if (typeof window === 'undefined') return () => {};
  const off = () => { window.removeEventListener('pointerdown', go, true); window.removeEventListener('keydown', go, true); };
  const go = () => { void music.start().then(ok => { if (ok) off(); }); };
  window.addEventListener('pointerdown', go, true);
  window.addEventListener('keydown', go, true);
  return off;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    if (!bgm) return;
    if (hidden) bgm.pause();
    else if (started) void bgm.play().catch(() => {});
  });
}

/** 데이터(audio-config.json)를 읽은 뒤 한 번 부른다 */
export function configureAudio(next: AudioConfig) {
  cfg = next;
  if (bgm) bgm.volume = next.volumes.bgm;
  if (started) { Object.values(next.sfx).forEach(e => loadBuffer(e.file)); void applyScene(); }
}

export function isMuted() { return muted; }
export function toggleMute(): boolean {
  muted = !muted;
  try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* 저장 불가 */ }
  if (bgm) bgm.muted = muted;
  return muted;
}
