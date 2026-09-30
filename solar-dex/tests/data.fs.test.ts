import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DATA_FILES } from '@/game/systems/validators';

describe('admin 대상 파일', () => {
  it('DATA_FILES는 public/data에 모두 존재한다', () => {
    DATA_FILES.forEach(f => expect(fs.existsSync(path.resolve(__dirname, '..', 'public', 'data', `${f}.json`))).toBe(true));
  });
});
