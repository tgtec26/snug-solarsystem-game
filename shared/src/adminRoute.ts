import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type Validators = Record<string, (v: never) => string[]>;

/** 게임별 admin API 라우트(`app/api/admin/[file]/route.ts`)를 만든다. production에서는 저장을 막는다. */
export function createAdminRoute(validators: Validators) {
  const isFile = (f: string) => Object.prototype.hasOwnProperty.call(validators, f);
  const filePath = (f: string) => path.resolve(process.cwd(), 'public', 'data', `${f}.json`);
  type Ctx = { params: Promise<{ file: string }> };

  async function GET(_req: Request, ctx: Ctx) {
    const { file } = await ctx.params;
    if (!isFile(file)) return NextResponse.json({ error: 'unknown file' }, { status: 400 });
    try {
      return NextResponse.json(JSON.parse(await fs.readFile(filePath(file), 'utf-8')));
    } catch {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
  }

  async function POST(req: Request, ctx: Ctx) {
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Admin API disabled in production' }, { status: 403 });
    const { file } = await ctx.params;
    if (!isFile(file)) return NextResponse.json({ error: 'unknown file' }, { status: 400 });
    const body = await req.json();
    const errors = validators[file](body as never);
    if (errors.length) return NextResponse.json({ errors }, { status: 400 });
    await fs.writeFile(filePath(file), JSON.stringify(body, null, 2) + '\n', 'utf-8');
    return NextResponse.json({ ok: true, file: `${file}.json` });
  }

  return { GET, POST };
}
