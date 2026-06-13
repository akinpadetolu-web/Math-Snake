import React from 'react';
import { Trophy, Award, Sparkles } from 'lucide-react';
import { STAGE_CONFIGS } from '../utils/mathGenerator';

interface SidebarStatsProps {
  highScore: number;
  score: number;
  lives: number;
  stageId: number;
  onSelectStage: (stage: number) => void;
}

export const SidebarStats: React.FC<SidebarStatsProps> = ({
  highScore,
  score,
  lives,
  stageId,
  onSelectStage,
}) => {
  const currentStage = STAGE_CONFIGS[stageId];

  return (
    <div className="flex flex-col gap-5 justify-between w-full">
      {/* High Scores block */}
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
        <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 pb-2 border-b border-slate-800/60">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>LEADERBOARD STATS</span>
        </h2>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-mono">HIGH SCORE</p>
            <p className="text-2xl font-black tracking-tight text-white font-mono">
              {String(highScore).padStart(5, '0')}
            </p>
          </div>
          <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-500">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800/50">
          <div>
            <p className="text-[10px] text-slate-400 font-mono">CURRENT RUN</p>
            <p className="text-xl font-bold font-mono text-emerald-400">
              {String(score).padStart(5, '0')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-mono font-medium">ANDROID LIVES</p>
            <div className="flex gap-1 justify-end mt-1.5">
              {[...Array(3)].map((_, i) => (
                <span 
                  key={i} 
                  className={`h-3 w-3 rounded-full ${
                    i < lives 
                      ? 'bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]' 
                      : 'bg-slate-800 border border-slate-700/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Levels / Mode select */}
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 pb-2 border-b border-slate-800/60">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>PORT LEVEL SELECT</span>
        </h2>
        
        <p className="text-xs text-slate-400 leading-relaxed mb-1.5">
          Select level to train and unlock:
        </p>

        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((stg) => {
            const config = STAGE_CONFIGS[stg];
            return (
              <button
                key={stg}
                id={`lvl-select-${stg}`}
                onClick={() => onSelectStage(stg)}
                className={`py-2 text-xs font-black font-mono rounded-lg border transition ${
                  stageId === stg 
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
                title={config.name}
              >
                L{stg}
              </button>
            );
          })}
        </div>
        
        <div className="mt-2 text-[10px] leading-snug text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800/50 font-mono">
          <span className="text-emerald-400 font-bold block mb-1">SELECTED CAMPAIGN:</span>
          <span className="font-sans font-medium text-slate-200 block text-xs">{currentStage.name}</span>
          <p className="mt-1 opacity-75">{currentStage.description}</p>
        </div>
      </div>
    </div>
  );
};
