export type Phase = 'title' | 'intro' | 'board' | 'room' | 'result' | 'ending' | 'summary';

export interface ZodiacSlot { month: number; id: string; name: string; page: number; verified: boolean }
export interface ChairBoard { id: string; name: string; label: string; page: number }
export interface SkyData { zodiac: ZodiacSlot[]; boards: ChairBoard[] }

export interface MoonPosition { pos: number; name: string | null; page: number; verified: boolean }
export interface MoonData { positions: MoonPosition[] }

export interface Order {
  id: string; title: string; room: string; minigame: string;
  pages: number[]; requires: string[]; cards: string[];
}

export interface DialogConfig { npcName: string; intro: string[]; orders: Record<string, string>; ending: string[] }
export interface MinigameConfig {
  inputLockMs: number; stars: { two: number; three: number };
  earthSpin: { turns: number };
  dayStars: { tolerance: number };
  shadow: { totalTol: number; partialTol: number };
}
