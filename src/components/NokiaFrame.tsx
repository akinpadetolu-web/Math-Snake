import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';

interface NokiaFrameProps {
  isWiggling: boolean;
  onPressKey: (key: string) => void;
  children: React.ReactNode;
}

export const NokiaFrame: React.FC<NokiaFrameProps> = ({
  isWiggling,
  onPressKey,
  children,
}) => {
  return (
    <motion.div 
      animate={isWiggling ? { x: [-8, 8, -6, 6, -3, 3, 0], y: [-3, 3, -1, 1, 0] } : {}}
      transition={{ duration: 0.15 }}
      className="w-full max-w-[370px] bg-sky-900 rounded-[55px] p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),inset_0_4px_12px_rgba(255,255,255,0.15),0_0_0_10px_rgba(30,41,59,0.5)] border-2 border-sky-700/50 flex flex-col items-center relative overflow-hidden"
    >
      {/* Nokia Matte Outer Plate reflection lines */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

      {/* Bezels and Top Speaker Grille */}
      <div className="w-full flex flex-col items-center pt-2 pb-3 relative z-10">
        <div className="w-16 h-2 bg-slate-950 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" />
        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-slate-100 text-[10px] font-mono select-none tracking-widest bg-slate-950/40 px-3 py-0.5 rounded-md border border-slate-700/20 font-black">
          NOKIA <span>v3310-EDITION</span>
        </div>
      </div>

      {/* Simulated LCD Screen Frame Bezel */}
      <div className="w-full bg-slate-900 rounded-3xl p-3 shadow-[inset_0_6px_18px_rgba(0,0,0,0.9),0_2px_4px_rgba(255,255,255,0.06)] border border-slate-800 flex flex-col items-center relative">
        {/* Top Bezels Design Indicator */}
        <div className="absolute top-1 left-6 right-6 flex justify-between items-center text-[7px] text-slate-400 font-mono tracking-widest uppercase">
          <span>◀ NO CARRIER</span>
          <span>MATHS v1.0 ▶</span>
        </div>

        {/* The screen rendering placeholder area */}
        <div className="w-full mt-2.5 rounded-lg relative aspect-square bg-slate-950 overflow-hidden shadow-inner">
          {children}
        </div>
      </div>

      {/* 3310 PHYSICAL KEYPAD BLOCK */}
      <div className="w-full mt-5 px-1 relative z-10">
        
        {/* Functional Select/Pause Keys */}
        <div className="flex justify-between gap-6 px-4 mb-4 select-none">
          {/* Menu / Select Bar Left */}
          <button 
            onClick={() => onPressKey('select')}
            className="flex-1 h-6 bg-slate-700 hover:bg-slate-600 rounded-b-xl border-t border-slate-600 active:scale-95 shadow-md flex items-center justify-center transition"
          >
            <div className="w-8 h-1 bg-slate-400 rounded-full" />
          </button>
          
          {/* Back/Clear Bar Right */}
          <button 
            onClick={() => onPressKey('ok')}
            className="flex-1 h-6 bg-slate-700 hover:bg-slate-600 rounded-b-xl border-t border-slate-600 active:scale-95 shadow-md flex items-center justify-center transition"
          >
            <div className="w-8 h-1 bg-slate-400 rounded-full" />
          </button>
        </div>

        {/* Main Retro Alpha-Numeric T9 Keypad Matrix */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 select-none">
          {/* Key 1 */}
          <button 
            onClick={() => onPressKey('1')}
            className="flex flex-col items-center justify-center h-10 bg-slate-750 hover:bg-slate-700 rounded-2xl active:bg-slate-600 border border-slate-700/35 text-slate-100 shadow-[0_3px_5px_rgba(0,0,0,0.3)] hover:shadow-none transition transform active:translate-y-0.5"
          >
            <span className="text-xs font-bold leading-none mt-0.5">1</span>
            <span className="text-[6px] text-slate-400 uppercase tracking-tighter">. , ?</span>
          </button>

          {/* Key 2 (UP) */}
          <button 
            onClick={() => onPressKey('up')}
            className="flex flex-col items-center justify-center h-10 bg-emerald-700 hover:bg-emerald-600 rounded-2xl active:bg-emerald-500 text-slate-100 border border-slate-650/45 shadow-[0_3px_5px_rgba(0,0,0,0.3)] hover:shadow-none transition transform active:translate-y-0.5"
            title="UP Direction"
          >
            <span className="text-xs font-bold leading-none mt-0.5">▲</span>
            <span className="text-[6px] text-slate-200 uppercase tracking-tighter">2 abc</span>
          </button>

          {/* Key 3 */}
          <button 
            onClick={() => onPressKey('3')}
            className="flex flex-col items-center justify-center h-10 bg-slate-755 hover:bg-slate-700 rounded-2xl active:bg-slate-600 border border-slate-700/35 text-slate-100 shadow-[0_3px_5px_rgba(0,0,0,0.3)] hover:shadow-none transition transform active:translate-y-0.5"
          >
            <span className="text-xs font-bold leading-none mt-0.5">3</span>
            <span className="text-[6px] text-slate-400 uppercase tracking-tighter">def</span>
          </button>

          {/* Key 4 (LEFT) */}
          <button 
            onClick={() => onPressKey('left')}
            className="flex flex-col items-center justify-center h-10 bg-emerald-700 hover:bg-emerald-600 rounded-2xl active:bg-emerald-500 text-slate-100 border border-slate-650/45 shadow-[0_3px_5px_rgba(0,0,0,0.3)] hover:shadow-none transition transform active:translate-y-0.5"
            title="LEFT Direction"
          >
            <span className="text-xs font-bold leading-none mt-0.5">◀</span>
            <span className="text-[6px] text-slate-200 uppercase tracking-tighter">4 ghi</span>
          </button>

          {/* Key 5 (OK/START) */}
          <button 
            onClick={() => onPressKey('5')}
            className="flex flex-col items-center justify-center h-10 bg-slate-900 border border-emerald-500 rounded-2xl active:bg-emerald-800 text-emerald-400 shadow-[0_3px_5px_rgba(0,0,0,0.3)] hover:shadow-none transition transform active:translate-y-0.5"
            title="OK select Center button"
          >
            <span className="text-xs font-black leading-none mt-0.5">5 OK</span>
            <span className="text-[6px] text-emerald-500 uppercase tracking-tighter">jkl</span>
          </button>

          {/* Key 6 (RIGHT) */}
          <button 
            onClick={() => onPressKey('right')}
            className="flex flex-col items-center justify-center h-10 bg-emerald-700 hover:bg-emerald-600 rounded-2xl active:bg-emerald-500 text-slate-100 border border-slate-650/45 shadow-[0_3px_5px_rgba(0,0,0,0.3)] hover:shadow-none transition transform active:translate-y-0.5"
            title="RIGHT Direction"
          >
            <span className="text-xs font-bold leading-none mt-0.5">▶</span>
            <span className="text-[6px] text-slate-200 uppercase tracking-tighter">6 mno</span>
          </button>

          {/* Key 7 */}
          <button 
            onClick={() => onPressKey('7')}
            className="flex flex-col items-center justify-center h-10 bg-slate-755 hover:bg-slate-700 rounded-2xl active:bg-slate-600 border border-slate-700/35 text-slate-100 shadow-[0_3px_5px_rgba(0,0,0,0.3)] hover:shadow-none transition transform active:translate-y-0.5"
          >
            <span className="text-xs font-bold leading-none mt-0.5">7</span>
            <span className="text-[6px] text-slate-400 uppercase tracking-tighter">pqrs</span>
          </button>

          {/* Key 8 (DOWN) */}
          <button 
            onClick={() => onPressKey('down')}
            className="flex flex-col items-center justify-center h-10 bg-emerald-700 hover:bg-emerald-600 rounded-2xl active:bg-emerald-500 text-slate-100 border border-slate-650/45 shadow-[0_3px_5px_rgba(0,0,0,0.3)] hover:shadow-none transition transform active:translate-y-0.5"
            title="DOWN Direction"
          >
            <span className="text-xs font-bold leading-none mt-0.5">▼</span>
            <span className="text-[6px] text-slate-200 uppercase tracking-tighter">8 tuv</span>
          </button>

          {/* Key 9 */}
          <button 
            onClick={() => onPressKey('9')}
            className="flex flex-col items-center justify-center h-10 bg-slate-755 hover:bg-slate-700 rounded-2xl active:bg-slate-600 border border-slate-700/35 text-slate-100 shadow-[0_3px_5px_rgba(0,0,0,0.3)] hover:shadow-none transition transform active:translate-y-0.5"
          >
            <span className="text-xs font-bold leading-none mt-0.5">9</span>
            <span className="text-[6px] text-slate-400 uppercase tracking-tighter">wxyz</span>
          </button>

          {/* Key * */}
          <button 
            onClick={() => onPressKey('*')}
            className="flex flex-col items-center justify-center h-10 bg-slate-800 hover:bg-slate-750 rounded-2xl active:bg-slate-700 border border-slate-700/35 text-slate-300 shadow-[0_3px_5px_rgba(0,0,0,0.3)] hover:shadow-none transition transform active:translate-y-0.5"
          >
            <span className="text-xs font-bold leading-none mt-0.5">*</span>
            <span className="text-[6px] text-slate-400 uppercase">VIBE</span>
          </button>

          {/* Key 0 */}
          <button 
            onClick={() => onPressKey('0')}
            className="flex flex-col items-center justify-center h-10 bg-slate-800 hover:bg-slate-750 rounded-2xl active:bg-slate-700 border border-slate-700/35 text-slate-300 shadow-[0_3px_5px_rgba(0,0,0,0.3)] hover:shadow-none transition transform active:translate-y-0.5"
          >
            <span className="text-xs font-bold leading-none mt-0.5">0</span>
            <span className="text-[6px] text-slate-400 uppercase tracking-tighter">space</span>
          </button>

          {/* Key # */}
          <button 
            onClick={() => onPressKey('#')}
            className="flex flex-col items-center justify-center h-10 bg-slate-800 hover:bg-slate-750 rounded-2xl active:bg-slate-700 border border-slate-700/35 text-slate-305 shadow-[0_3px_5px_rgba(0,0,0,0.3)] hover:shadow-none transition transform active:translate-y-0.5"
          >
            <span className="text-xs font-bold leading-none mt-0.5">#</span>
            <span className="text-[5px] text-slate-400 uppercase tracking-tight">LAYOUT</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
