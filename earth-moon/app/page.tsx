'use client';

import { useEffect } from 'react';
import { StageFrame } from '@snug/shared/src/StageFrame';
import { useDataStore } from '@/game/dataStore';
import { UIOverlay } from '@/components/UIOverlay';

export default function Home() {
  const loaded = useDataStore(s => s.loaded);
  const error = useDataStore(s => s.error);
  const load = useDataStore(s => s.load);
  useEffect(() => { load(); }, [load]);

  if (!loaded) return <main className="fixed inset-0 bg-black text-white flex items-center justify-center">불러오는 중…</main>;
  if (error) return <main className="fixed inset-0 bg-black text-red-300 flex items-center justify-center p-8 text-center">데이터를 불러오지 못했습니다.<br />{error}</main>;
  return <StageFrame><UIOverlay /></StageFrame>;
}
