import React from 'react';
import { motion } from 'motion/react';
import { Gamepad } from 'lucide-react';

interface HowToPlayModalProps {
  show: boolean;
  onClose: () => void;
  playClickSound: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ show, onClose, playClickSound }) => {
  if (!show) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative text-slate-100"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Gamepad className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold">Android Math Snake Guide</h3>
          </div>
          <button 
            id="close-how-to-play"
            onClick={() => { playClickSound(); onClose(); }}
            className="p-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold transition text-xs font-mono"
          >
            CLOSE [X]
          </button>
        </div>

        <div className="flex flex-col gap-4 text-xs leading-relaxed text-slate-300">
          <div>
            <h4 className="font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="text-emerald-400">1.</span> TOUCH CONTROLS (SWIPE / D-PAD)
            </h4>
            <p>
              Designed for Android play! You can swipe <strong>Up, Down, Left, or Right</strong> anywhere on the screen, or use the <strong>On-Screen Touch D-pad</strong> at the bottom of the screen. Standard keyboard filters also work!
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="text-emerald-400">2.</span> SOLVE AND FEED
            </h4>
            <p>
              Watch the dynamic <strong>Math Equation Banner</strong> at the top of the port. Find and eat the food block that displays the <strong>Correct Answer</strong>. Ignore or avoid the 3 decoy wrong answer blocks!
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="text-rose-400">3.</span> TACTICLE & HAPTIC VIBRATION
            </h4>
            <p>
              Each correct bite gives a satisfying double-tap haptic confirmation trigger, whereas crashing or hitting an incorrect decoy triggers a long, heavy alert wiggle!
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="text-yellow-400">4.</span> BITE-SIZED CAMPAIGN PROGRESSION
            </h4>
            <ul className="list-disc pl-5 mt-1 space-y-1 font-mono text-[11px] text-slate-400">
              <li><strong className="text-emerald-400">Level 1 (Addition):</strong> Sums up to 30. Eat 10 to advance.</li>
              <li><strong className="text-yellow-400">Level 2 (Subtraction):</strong> Up to 50. Eat 12 to advance. (Speed increases +10%).</li>
              <li><strong className="text-orange-400">Level 3 (Multiplication):</strong> Decoy answer values start drifting randomly around the grid! Eat 15 to progress.</li>
              <li><strong className="text-red-400">Level 4 (Division):</strong> Brick obstacles appear on the grid! Eat 15 to progress.</li>
              <li><strong className="text-indigo-400">Level 5 (Endless PEMDAS):</strong> True arithmetic test with maximum speed, obstacles, and drifting decoys! High score saves to local memories.</li>
            </ul>
          </div>
        </div>

        <button 
          id="how-to-play-confirm"
          onClick={() => { playClickSound(); onClose(); }}
          className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl transition text-xs uppercase tracking-wider"
        >
          Let's Calculate Fast!
        </button>
      </motion.div>
    </motion.div>
  );
};
