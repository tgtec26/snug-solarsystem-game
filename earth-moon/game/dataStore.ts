import { create } from 'zustand';
import type { DialogConfig, MinigameConfig, MoonData, Order, SkyData } from '@/game/types';
import { configureAudio, type AudioConfig } from '@snug/shared/src/audio';
import { VALIDATORS, type DataFile } from '@/game/systems/validators';

interface DataState {
  sky: SkyData | null; moon: MoonData | null; orders: Order[]; dialog: DialogConfig | null; minigame: MinigameConfig | null;
  loaded: boolean; error: string | null;
  load: () => Promise<void>;
}
const getJson = async <T,>(f: DataFile): Promise<T> => {
  const r = await fetch(`/data/${f}.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${f}.json: HTTP ${r.status}`);
  const v = await r.json();
  const errs = VALIDATORS[f](v as never);
  if (errs.length && process.env.NODE_ENV !== 'production') throw new Error(errs.join(' / '));
  return v as T;
};

export const useDataStore = create<DataState>()((set) => ({
  sky: null, moon: null, orders: [], dialog: null, minigame: null, loaded: false, error: null,
  load: async () => {
    try {
      const [sky, moon, orders, dialog, minigame] = await Promise.all([
        getJson<SkyData>('sky'), getJson<MoonData>('moon'), getJson<Order[]>('orders'),
        getJson<DialogConfig>('dialog-config'), getJson<MinigameConfig>('minigame-config'),
      ]);
      configureAudio(await getJson<AudioConfig>('audio-config'));
      set({ sky, moon, orders, dialog, minigame, loaded: true, error: null });
    } catch (e) {
      set({ error: String(e), loaded: true });
    }
  },
}));
