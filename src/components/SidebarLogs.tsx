import React from 'react';
import { History, Info } from 'lucide-react';
import { HistoryLog, StageConfig } from '../types';

interface SidebarLogsProps {
  historyLogs: HistoryLog[];
  currentStageConfig: StageConfig;
  stageCorrectCount: number;
}

export const SidebarLogs: React.FC<SidebarLogsProps> = ({
  historyLogs,
  currentStageConfig,
  stageCorrectCount,
}) => {
  return (
    <div className="flex flex-col gap-5 justify-between w-full">
      {/* Arithmetic Journals logs card */}
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 shadow-lg flex-grow flex flex-col gap-4">
        <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 pb-2 border-b border-slate-800/60">
          <History className="w-3.5 h-3.5 text-emerald-400" />
          <span>RUN LOG METRICS</span>
        </h2>
        
        {historyLogs.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-4 text-slate-500 font-mono text-xs">
            <p>Eat answer food blocks to populate real-time logs.</p>
            <p className="text-[10px] mt-2 text-slate-600">Avoid decoys to prevent speed penalties.</p>
          </div>
        ) : (
          <div className="flex-grow flex flex-col gap-1.5 overflow-y-auto max-h-[180px] lg:max-h-[220px] pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {historyLogs.map((log, index) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono border ${
                  log.correct 
                    ? 'bg-emerald-950/20 text-emerald-400 border-emerald-950/30' 
                    : 'bg-rose-950/10 text-rose-400 border-rose-950/30'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">{log.correct ? '●' : '▲'}</span>
                  <span className="opacity-80">{log.eq.replace(' = ?', '')}</span>
                </div>
                <div className="font-bold">
                  Got {log.ans} {log.correct ? '✓' : '✗'}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/50 flex flex-col gap-1 text-[11px] font-mono leading-relaxed text-slate-400 mt-2">
          <div className="flex justify-between">
            <span>LEVEL STEP VELOCITY:</span>
            <span className="text-emerald-400 font-bold">{currentStageConfig.speed}ms</span>
          </div>
          <div className="flex justify-between">
            <span>EQUATION TARGET:</span>
            <span className="text-blue-400 font-bold">{stageCorrectCount} / {currentStageConfig.targetToWin}</span>
          </div>
        </div>
      </div>

      {/* Control instructions block */}
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
        <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 pb-2 border-b border-slate-800/60">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>GESTURE SUPPORT</span>
        </h3>
        <p className="text-[11px] text-slate-400 leading-normal">
          Designed for high touch sensitivity! Swipe in any direction inside the screen card domain to dynamically rotate direction. Or press any keypad segment below.
        </p>
      </div>
    </div>
  );
};
