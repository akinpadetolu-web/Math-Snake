import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, Square } from 'lucide-react';
import { Position } from '../types';

interface ModernTouchControlsProps {
  onDirectionChange: (newDir: Position) => void;
  gameStatus: string;
  onPauseToggle: () => void;
  onResume: () => void;
}

export const ModernTouchControls: React.FC<ModernTouchControlsProps> = ({
  onDirectionChange,
  gameStatus,
  onPauseToggle,
  onResume,
}) => {
  return (
    <div className="w-full flex flex-col items-center justify-center gap-3">
      {/* Mini Info */}
      <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mb-1">
        TAP KEYPAD Segment OR SWIPE SCREEN to Turn
      </p>

      {/* On-Screen Minimalist D-pad */}
      <div className="relative w-36 h-36 flex items-center justify-center bg-slate-900/60 rounded-full border border-slate-800 shadow-xl p-3">
        {/* Outer Circle background accent */}
        <div className="absolute inset-2 rounded-full bg-slate-950/40 border border-slate-900/50 pointer-events-none" />

        {/* UP BUTTON */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            if (gameStatus === 'PLAYING') onDirectionChange({ x: 0, y: -1 });
          }}
          onClick={() => {
            if (gameStatus === 'PLAYING') onDirectionChange({ x: 0, y: -1 });
          }}
          disabled={gameStatus !== 'PLAYING'}
          className="absolute top-2 w-10 h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700/50 shadow-md active:bg-emerald-600 active:text-slate-950 transition-colors"
          title="Turn Up"
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        {/* LEFT BUTTON */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            if (gameStatus === 'PLAYING') onDirectionChange({ x: -1, y: 0 });
          }}
          onClick={() => {
            if (gameStatus === 'PLAYING') onDirectionChange({ x: -1, y: 0 });
          }}
          disabled={gameStatus !== 'PLAYING'}
          className="absolute left-2 w-10 h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700/50 shadow-md active:bg-emerald-600 active:text-slate-950 transition-colors"
          title="Turn Left"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* CENTER BUTTON - PAUSE / PLAY */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            if (gameStatus === 'PLAYING') {
              onPauseToggle();
            } else {
              onResume();
            }
          }}
          onClick={() => {
            if (gameStatus === 'PLAYING') {
              onPauseToggle();
            } else {
              onResume();
            }
          }}
          className="w-10 h-10 bg-slate-950 hover:bg-slate-900 rounded-full flex items-center justify-center text-emerald-400 border border-slate-850 shadow-inner active:scale-95 transition-transform z-10"
          title={gameStatus === 'PLAYING' ? 'Pause Game' : 'Play Game'}
        >
          {gameStatus === 'PLAYING' ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* RIGHT BUTTON */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            if (gameStatus === 'PLAYING') onDirectionChange({ x: 1, y: 0 });
          }}
          onClick={() => {
            if (gameStatus === 'PLAYING') onDirectionChange({ x: 1, y: 0 });
          }}
          disabled={gameStatus !== 'PLAYING'}
          className="absolute right-2 w-10 h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700/50 shadow-md active:bg-emerald-600 active:text-slate-950 transition-colors"
          title="Turn Right"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* DOWN BUTTON */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            if (gameStatus === 'PLAYING') onDirectionChange({ x: 0, y: 1 });
          }}
          onClick={() => {
            if (gameStatus === 'PLAYING') onDirectionChange({ x: 0, y: 1 });
          }}
          disabled={gameStatus !== 'PLAYING'}
          className="absolute bottom-2 w-10 h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl flex items-center justify-center text-slate-300 border border-slate-700/50 shadow-md active:bg-emerald-600 active:text-slate-950 transition-colors"
          title="Turn Down"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
