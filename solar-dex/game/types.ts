export type Phase = 'title' | 'intro' | 'board' | 'room' | 'result' | 'finale' | 'ending' | 'summary';

export interface Body { id: string; name: string }
export interface Trait { id: string; body: string; text: string; page: number }
export interface Criterion { id: string; name: string; values: Record<string, string> }
export interface Group { id: string; name: string; values: Record<string, string> }
export interface Planet { id: string; name: string; group: string }
export interface BodiesData { bodies: Body[]; traits: Trait[]; criteria: Criterion[]; groups: Group[]; planets: Planet[] }

export interface SunEffect { id: string; name: string; page: number; zone: string }
export interface SunData { maxLevel: number; activeLevel: number; effects: SunEffect[] }

export interface Order {
  id: string; title: string; room: string; minigame: string;
  pages: number[]; requires: string[]; cards: string[];
}

export interface DialogConfig { npcName: string; intro: string[]; orders: Record<string, string>; ending: string[] }
export interface MinigameConfig {
  inputLockMs: number; stars: { two: number; three: number };
  bodies: { cards: number };
  comet: { tolerance: number; ranks: number[] };
  telescope: { aimRadius: number; focusTolerance: number; sunGuard: number };
  projection: { aimRadius: number; focusTolerance: number };
}

export interface SunLevels { sunspots: number; prominence: number; flare: number; corona: number; wind: number }
