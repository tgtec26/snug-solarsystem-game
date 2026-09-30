'use client';

import { useEffect, useState } from 'react';
import { DATA_FILES, type DataFile } from '@/game/systems/validators';

/** 모든 조절 가능한 값은 public/data/*.json에 있고, 여기서 검증 후 저장한다. (개발 모드 전용 저장) */
export default function AdminPage() {
  const [file, setFile] = useState<DataFile>(DATA_FILES[0]);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/${file}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (alive) { setText(JSON.stringify(j, null, 2)); setMsg(''); } });
    return () => { alive = false; };
  }, [file]);

  const save = async () => {
    let body: unknown;
    try { body = JSON.parse(text); } catch { setMsg('JSON 문법 오류'); return; }
    const r = await fetch(`/api/admin/${file}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? `저장됨: ${j.file}` : (j.errors ?? [j.error]).join('\n'));
  };

  return (
    <main className="min-h-screen bg-neutral-900 text-white p-6 flex flex-col gap-3">
      <h1 className="text-2xl font-bold">태양계 도감 admin</h1>
      <div className="flex gap-2 flex-wrap">
        {DATA_FILES.map(f => (
          <button key={f} type="button" onClick={() => setFile(f)} className={`px-4 py-2 rounded-lg border ${f === file ? 'bg-yellow-300 text-black' : 'bg-white/10'}`}>{f}</button>
        ))}
      </div>
      <textarea className="flex-1 min-h-[60vh] font-mono text-sm bg-black/50 border border-white/30 rounded-lg p-3" value={text} onChange={e => setText(e.target.value)} spellCheck={false} />
      <div className="flex items-center gap-4">
        <button type="button" onClick={save} className="px-6 py-2 rounded-lg bg-emerald-400 text-black font-bold">저장</button>
        <pre className="text-sm text-red-300 whitespace-pre-wrap">{msg}</pre>
      </div>
    </main>
  );
}
