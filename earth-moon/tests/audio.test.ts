import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createSfxGate, trackForScene, validateAudioConfig, type AudioConfig } from '@snug/shared/src/audio';

const cfgFile = path.resolve(__dirname, '..', 'public', 'data', 'audio-config.json');
const cfg: AudioConfig = JSON.parse(fs.readFileSync(cfgFile, 'utf-8'));

describe('audio-config.json', () => {
  it('검증을 통과하고, 가리키는 음원 파일이 모두 있다', () => {
    expect(validateAudioConfig(cfg)).toEqual([]);
    const files = [...Object.values(cfg.bgm).filter(Boolean), ...Object.values(cfg.sfx).map(e => e.file)];
    files.forEach(f => expect(fs.existsSync(path.resolve(__dirname, '..', 'public', 'assets', 'audio', f))).toBe(true));
  });
  it('모든 장면(phase)에 배경음 항목이 있다', () => {
    ['title', 'intro', 'board', 'room', 'result', 'finale', 'ending', 'summary'].forEach(p => expect(cfg.bgm).toHaveProperty(p));
  });
  it('시작·결과는 같은 곡, 플레이는 다른 곡이다', () => {
    expect(trackForScene(cfg, 'title')).toBe(trackForScene(cfg, 'summary'));
    expect(trackForScene(cfg, 'room')).not.toBe(trackForScene(cfg, 'title'));
  });
  it('필수 효과음 이름이 연결돼 있다', () => {
    ['correct', 'error', 'success', 'fanfare', 'pickup'].forEach(n => expect(cfg.sfx[n]?.file).toBeTruthy());
  });
  it('잘못된 설정은 거른다', () => {
    expect(validateAudioConfig({ ...cfg, volumes: { bgm: 2, sfx: 1 } }).length).toBeGreaterThan(0);
    expect(validateAudioConfig({ ...cfg, sfx: { x: { file: '', volume: 0.5 } } }).length).toBeGreaterThan(0);
  });
  it('설정이 없거나 모르는 장면이면 조용하다', () => {
    expect(trackForScene(null, 'room')).toBe('');
    expect(trackForScene(cfg, 'nope')).toBe('');
  });
});

describe('효과음 연타 제한', () => {
  it('같은 소리는 간격 안에서 막고, 다른 소리·간격 뒤는 허용한다', () => {
    let t = 1000;
    const gate = createSfxGate(() => t, 90);
    expect(gate('correct')).toBe(true);
    t += 50; expect(gate('correct')).toBe(false);
    expect(gate('error')).toBe(true);
    t += 50; expect(gate('correct')).toBe(true);
  });
});

class FakeAudio {
  static all: FakeAudio[] = [];
  src: string; loop = false; volume = 1; muted = false; paused = true;
  constructor(src: string) { this.src = src; FakeAudio.all.push(this); }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}

describe('배경음·음소거 동작', () => {
  let audio: typeof import('@snug/shared/src/audio');
  beforeEach(async () => {
    FakeAudio.all = [];
    vi.stubGlobal('Audio', FakeAudio);
    localStorage.clear();
    vi.resetModules();
    audio = await import('@snug/shared/src/audio');
    audio.configureAudio(cfg);
  });

  it('시작 전에는 재생하지 않고, 시작하면 현재 장면의 곡을 튼다', async () => {
    audio.music.setScene('board');
    expect(FakeAudio.all).toHaveLength(0);
    await audio.music.start();
    expect(FakeAudio.all.at(-1)?.src).toBe('/assets/audio/quiz-background.mp3');
    expect(FakeAudio.all.at(-1)?.paused).toBe(false);
    expect(FakeAudio.all.at(-1)?.volume).toBe(cfg.volumes.bgm);
  });

  it('장면이 바뀌면 곡을 바꾸고, 같은 곡이면 이어 둔다', async () => {
    audio.music.setScene('title');
    await audio.music.start();
    const first = FakeAudio.all.at(-1)!;
    audio.music.setScene('intro');
    expect(FakeAudio.all.at(-1)).toBe(first);
    audio.music.setScene('room');
    expect(first.paused).toBe(true);
    expect(FakeAudio.all.at(-1)?.src).toBe('/assets/audio/quiz-background.mp3');
    audio.music.setScene('finale');
    expect(audio.music.isPlaying()).toBe(false);
  });

  it('음소거는 저장돼 다시 불러와도 유지되고 배경음에 적용된다', async () => {
    audio.music.setScene('board');
    await audio.music.start();
    expect(audio.toggleMute()).toBe(true);
    expect(FakeAudio.all.at(-1)?.muted).toBe(true);
    expect(localStorage.getItem('snug-muted-v1')).toBe('1');
    vi.resetModules();
    const again = await import('@snug/shared/src/audio');
    expect(again.isMuted()).toBe(true);
  });

  it('탭이 숨겨지면 멈추고 돌아오면 이어서 튼다', async () => {
    audio.music.setScene('board');
    await audio.music.start();
    const el = FakeAudio.all.at(-1)!;
    const setHidden = (h: boolean) => { Object.defineProperty(document, 'hidden', { value: h, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); };
    setHidden(true);
    expect(el.paused).toBe(true);
    setHidden(false);
    expect(el.paused).toBe(false);
  });
});
