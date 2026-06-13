import { Equation, Difficulty } from '../types';

// Helper function to get a random integer in [min, max]
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Ensure options are strictly unique, within reasonable bounds, and matches length
function finalizeOptions(correctAnswer: number, decoys: number[]): number[] {
  const set = new Set<number>();
  set.add(correctAnswer);
  
  // Clean decoys: must be positive (usually), different from answer, and non-negative
  for (const decoy of decoys) {
    if (decoy > 0 && decoy !== correctAnswer) {
      set.add(decoy);
    }
  }
  
  // If we don't have at least 4 options, pad with reasonable numbers
  while (set.size < 4) {
    const drift = getRandomInt(-10, 10);
    const fallback = correctAnswer + (drift === 0 ? 5 : drift);
    if (fallback > 0 && fallback !== correctAnswer) {
      set.add(fallback);
    }
  }
  
  // Shuffle the options
  return Array.from(set).sort(() => Math.random() - 0.5);
}

export function generateEquationForStage(stageId: number, difficulty: Difficulty = 'EASY'): Equation {
  let text = '';
  let answer = 0;
  const decoys: number[] = [];
  const isHard = difficulty === 'HARD';

  switch (stageId) {
    case 1: {
      // Stage 1: Warm-Up (Addition). Numbers 1 to 50.
      const x = isHard ? getRandomInt(15, 95) : getRandomInt(5, 25);
      const y = isHard ? getRandomInt(15, 95) : getRandomInt(5, 25);
      text = `${x} + ${y} = ?`;
      answer = x + y;
      
      // Decoys
      decoys.push(answer + (isHard ? 20 : 10)); // arithmetic offset
      decoys.push(answer - (isHard ? 20 : 10));
      decoys.push(answer + 2);  // close carry error
      decoys.push(answer - 2);
      decoys.push(Math.abs(x - y)); // subtraction trap
      break;
    }
    case 2: {
      // Stage 2: Takeaway (Subtraction). Numbers 1 to 100.
      const x = isHard ? getRandomInt(90, 250) : getRandomInt(30, 90);
      const y = isHard ? getRandomInt(25, 89) : getRandomInt(5, 29); // potential borrowing
      text = `${x} - ${y} = ?`;
      answer = x - y;
      
      // Decoys
      decoys.push(x + y); // addition trap
      decoys.push(answer + 10); // borrowing carry error
      decoys.push(answer - 10);
      decoys.push(answer + (isHard ? 5 : 2));
      decoys.push(answer - (isHard ? 5 : 2));
      break;
    }
    case 3: {
      // Stage 3: The Classic (Multiplication). Times tables from 2 to 12.
      const x = isHard ? getRandomInt(11, 24) : getRandomInt(2, 12);
      const y = isHard ? getRandomInt(3, 15) : getRandomInt(2, 12);
      const symbols = ['×', 'x', '*'];
      const sym = symbols[getRandomInt(0, 1)]; // Clean '×' or 'x'
      text = `${x} ${sym} ${y} = ?`;
      answer = x * y;
      
      // Decoys (Intentionally common multiplication traps)
      decoys.push(x + y); // addition trap (e.g. 7+8=15 instead of 56)
      decoys.push((x - 1) * y); // times table off-by-one trap (7x7 = 49)
      decoys.push(x * (y - 1)); // times table off-by-one trap (8x8 = 64)
      decoys.push((x + 1) * y);
      decoys.push(answer + 2); // close guess
      decoys.push(answer - 2);
      break;
    }
    case 4: {
      // Stage 4: Split (Perfect Division). No remainders.
      const z = isHard ? getRandomInt(6, 22) : getRandomInt(2, 12); // Speed answer
      const y = isHard ? getRandomInt(4, 18) : getRandomInt(2, 12);
      const x = y * z;
      text = `${x} ÷ ${y} = ?`;
      answer = z;
      
      // Decoys
      decoys.push(z + 1);
      decoys.push(z - 1);
      decoys.push(z + 2);
      decoys.push(y); // divisor itself trap
      decoys.push(Math.abs(z - 3) === 0 ? 5 : Math.abs(z - 3));
      break;
    }
    case 5:
    default: {
      // Stage 5: Boss Mode (Mixed PEMDAS)
      // Pick a structure: (X * Y) + Z  or  (X * Y) - Z  or  X + (Y * Z) or X * (Y + Z)
      const type = getRandomInt(1, 3);
      if (type === 1) {
        // (X * Y) + Z
        const x = isHard ? getRandomInt(6, 15) : getRandomInt(3, 8);
        const y = isHard ? getRandomInt(6, 12) : getRandomInt(3, 8);
        const z = isHard ? getRandomInt(15, 60) : getRandomInt(5, 20);
        text = `(${x} × ${y}) + ${z} = ?`;
        answer = (x * y) + z;
        
        // Decoys
        decoys.push(x * (y + z)); // missing parens order trap (PEMDAS error)
        decoys.push((x + y) + z); // addition instead of multiplication
        decoys.push(answer + 10);
        decoys.push(answer - 10);
        decoys.push(answer + 4);
      } else if (type === 2) {
        // (X * Y) - Z
        const x = isHard ? getRandomInt(6, 15) : getRandomInt(4, 9);
        const y = isHard ? getRandomInt(5, 12) : getRandomInt(3, 8);
        const z = isHard ? getRandomInt(5, 40) : getRandomInt(2, 15);
        text = `(${x} × ${y}) - ${z} = ?`;
        answer = (x * y) - z;
        
        // Decoys
        decoys.push(x * (y - z)); // PEMDAS operator precedence trap
        decoys.push((x * y) + z); // incorrect sign
        decoys.push(answer + 5);
        decoys.push(answer - 5);
      } else {
        // X + (Y * Z)
        const x = isHard ? getRandomInt(15, 80) : getRandomInt(5, 20);
        const y = isHard ? getRandomInt(5, 12) : getRandomInt(3, 7);
        const z = isHard ? getRandomInt(5, 12) : getRandomInt(3, 7);
        text = `${x} + (${y} × ${z}) = ?`;
        answer = x + (y * z);
        
        // Decoys
        decoys.push((x + y) * z); // left-to-right evaluation trap (PEMDAS)
        decoys.push(x + y + z);
        decoys.push(answer + 10);
        decoys.push(answer - 10);
      }
      break;
    }
  }

  const options = finalizeOptions(answer, decoys);
  return {
    text,
    answer,
    options,
  };
}

export const STAGE_CONFIGS: { [key: number]: any } = {
  1: {
    id: 1,
    name: 'Stage 1: Warm-Up',
    subtitle: 'Addition',
    speed: 210, // Milliseconds per tick, relaxed
    gridColorClass: 'bg-[#9bbc0f] text-[#0f380f]', // Classic Gameboy / Nokia retro greenish
    glowColorClass: 'shadow-[0_0_15px_rgba(155,188,15,0.4)]',
    mathType: 'addition',
    pointsScale: 10,
    description: 'Addition basics. Target 10. Swipe or D-pad to slither.',
    targetToWin: 10,
  },
  2: {
    id: 2,
    name: 'Stage 2: Takeaway',
    subtitle: 'Subtraction',
    speed: 170, // Slightly faster
    gridColorClass: 'bg-[#c2b213] text-[#2c2600]', // Amber / Deep Yellowish
    glowColorClass: 'shadow-[0_0_15px_rgba(194,178,19,0.4)]',
    mathType: 'subtraction',
    pointsScale: 15,
    description: 'Subtraction with borrowing. Target 12. Snake speed increases.',
    targetToWin: 12,
  },
  3: {
    id: 3,
    name: 'Stage 3: The Classic',
    subtitle: 'Multiplication',
    speed: 130, // Nokia standard
    gridColorClass: 'bg-[#df7d01] text-[#2e1c00]', // Orange Grid Tint
    glowColorClass: 'shadow-[0_0_15px_rgba(223,125,1,0.4)]',
    mathType: 'multiplication',
    pointsScale: 20,
    description: 'Times tables. Target 15. Avoid the trap numbers!',
    targetToWin: 15,
    movingDecoys: false, // Decoys do not move
  },
  4: {
    id: 4,
    name: 'Stage 4: The Split',
    subtitle: 'Division',
    speed: 95, // Quite fast
    gridColorClass: 'bg-[#cf1e1e] text-white', // Red Grid Theme
    glowColorClass: 'shadow-[0_0_15px_rgba(207,30,30,0.4)]',
    mathType: 'division',
    pointsScale: 25,
    description: 'Perfect division. Target 15. Watch out, brick obstacles appear on grid!',
    targetToWin: 15,
    hasObstacles: true, // Grid obstacles appear!
  },
  5: {
    id: 5,
    name: 'Stage 5: Boss/Endless Mode',
    subtitle: 'Mixed PEMDAS',
    speed: 70, // Max intensity speed
    gridColorClass: 'bg-[#121212] border-indigo-500 text-[#00ffcc]', // Cyberpunk Neon
    glowColorClass: 'shadow-[0_0_15px_rgba(0,255,204,0.6)] animate-pulse',
    mathType: 'boss',
    pointsScale: 40,
    description: 'Order of operations. Extreme speed. Survive as long as you can!',
    targetToWin: 20,
    movingDecoys: false,
    hasObstacles: true,
  },
};
