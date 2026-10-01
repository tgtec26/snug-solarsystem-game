import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// 이모지·화살표 기호는 소스(주석 포함)에 쓰지 않는다. 지침 U6.
const BAD = /[\p{Extended_Pictographic}←-⇿➠-➿⤀-⥿]/u;
const ROOT = path.resolve(__dirname, '..');
function walk(dir: string, out: string[] = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.(tsx?|json|css)$/.test(f.name)) out.push(p);
  }
  return out;
}

describe('이모지·화살표 기호 금지', () => {
  ['app', 'components', 'game', 'public/data'].forEach(d => {
    it(`${d}에 없다`, () => {
      const hits = walk(path.join(ROOT, d)).filter(f => BAD.test(fs.readFileSync(f, 'utf8')));
      expect(hits.map(h => path.relative(ROOT, h))).toEqual([]);
    });
  });
});
