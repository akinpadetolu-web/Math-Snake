export interface Position {
  x: number;
  y: number;
}

export type GameStatus = 'START' | 'STAGE_INTRO' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';
export type Difficulty = 'EASY' | 'MODERATE' | 'HARD';

export interface Equation {
  text: string;
  answer: number;
  options: number[]; // Correct answer + decoys
}

export interface FoodItem {
  position: Position;
  value: number;
  isCorrect: boolean;
}

export interface StageConfig {
  id: number;
  name: string;
  subtitle: string;
  speed: number; // Interval in ms (smaller is faster)
  gridColorClass: string; // Tailwind class for screen tint
  glowColorClass: string; // Glow effect color
  mathType: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'boss';
  pointsScale: number;
  description: string;
  targetToWin: number;
  movingDecoys?: boolean;
  hasObstacles?: boolean;
}

export interface HistoryLog {
  eq: string;
  ans: number;
  correct: boolean;
}
