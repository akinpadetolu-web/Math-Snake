/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Play, 
  Pause, 
  Trophy, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  ArrowLeft,
  User,
  Lock,
  Mail,
  Gamepad2,
  LogOut,
  Settings
} from 'lucide-react';
import { GameStatus, Position, Equation, FoodItem, StageConfig, Difficulty } from './types';
import { generateEquationForStage, STAGE_CONFIGS } from './utils/mathGenerator';
import { playSound } from './utils/audio';
import { ModernTouchControls } from './components/ModernTouchControls';

// Firebase Integrations and global sync helpers
import { onAuthStateChanged, signOut, updateProfile, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { 
  auth, 
  googleProvider, 
  syncPlayerProfile, 
  updatePlayerDisplayName, 
  fetchPlayerProfile, 
  subscribeToLeaderboard, 
  PlayerProfile 
} from './lib/firebase';

// Neon arcade snake mascot hero image
// @ts-ignore
import snakeHeroImg from './assets/images/snake_hero_1781221694636.jpg';

const GRID_SIZE = 16;

interface MathParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

const STAGE_THEMES: { [key: number]: { primary: string; glow: string; badge: string; name: string } } = {
  1: { primary: '#10B981', glow: 'rgba(16,185,129,0.3)', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', name: 'Stage 1: Warm-Up' },
  2: { primary: '#3B82F6', glow: 'rgba(59,130,246,0.3)', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', name: 'Stage 2: Subtraction' },
  3: { primary: '#F59E0B', glow: 'rgba(245,158,11,0.3)', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', name: 'Stage 3: Multiplication' },
  4: { primary: '#EF4444', glow: 'rgba(239,68,68,0.3)', badge: 'bg-red-500/20 text-red-500 border-red-500/30', name: 'Stage 4: Division' },
  5: { primary: '#A855F7', glow: 'rgba(168,85,247,0.3)', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', name: 'Stage 5: Extreme Boss' },
};

const PALETTES: Record<string, { id: string; name: string; primary: string; glow: string; arenaBg: string; badge: string }> = {
  DEFAULT: {
    id: 'DEFAULT',
    name: 'Stage Colors',
    primary: '',
    glow: '',
    arenaBg: 'bg-slate-950',
    badge: ''
  },
  CLASSIC_NOKIA: {
    id: 'CLASSIC_NOKIA',
    name: 'Classic Nokia',
    primary: '#1f2937',
    glow: 'rgba(31,41,55,0.3)',
    arenaBg: 'bg-[#9bbc0f]',
    badge: 'bg-slate-900/20 text-slate-900 border-slate-900/30'
  },
  NEON_BLUE: {
    id: 'NEON_BLUE',
    name: 'Neon Blue',
    primary: '#00e5ff',
    glow: 'rgba(0,229,255,0.35)',
    arenaBg: 'bg-[#030712]',
    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  },
  MATRIX_GREEN: {
    id: 'MATRIX_GREEN',
    name: 'Matrix Green',
    primary: '#39ff14',
    glow: 'rgba(57,255,20,0.35)',
    arenaBg: 'bg-[#020202]',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30'
  }
};

const getFoodStyle = (food: FoodItem, isCorrect: boolean, difficulty: Difficulty, activeThemeId: string, stagePrimary: string) => {
  if (activeThemeId === 'CLASSIC_NOKIA') {
    if (difficulty === 'EASY' && isCorrect) {
      return {
        classes: 'text-[#9bbc0f] font-black border border-[#1f2937] scale-110 shadow-sm animate-pulse',
        style: { backgroundColor: '#1f2937' }
      };
    } else {
      return {
        classes: 'bg-[#306230] text-[#9bbc0f] border border-[#1f2937]/50 font-bold',
        style: {}
      };
    }
  }

  if (activeThemeId === 'MATRIX_GREEN') {
    if (difficulty === 'EASY' && isCorrect) {
      return {
        classes: 'text-black font-black border border-[#39ff14] shadow-[0_0_8px_#39ff14] scale-110 animate-pulse',
        style: { backgroundColor: '#39ff14' }
      };
    } else {
      return {
        classes: 'bg-black text-[#39ff14] border border-[#39ff14]/40 font-bold',
        style: {}
      };
    }
  }

  if (activeThemeId === 'NEON_BLUE') {
    if (difficulty === 'EASY' && isCorrect) {
      return {
        classes: 'text-black font-black border border-[#00e5ff] shadow-[0_0_10px_#00e5ff] scale-110 animate-pulse',
        style: { backgroundColor: '#00e5ff' }
      };
    } else {
      return {
        classes: 'bg-[#0b1329] text-[#00e5ff] border border-[#00e5ff]/30 font-bold',
        style: {}
      };
    }
  }

  // DEFAULT (Dynamic Stage Theme)
  if (difficulty === 'EASY' && isCorrect) {
    return {
      classes: 'text-slate-950 font-extrabold scale-110 animate-pulse',
      style: { backgroundColor: stagePrimary }
    };
  } else {
    return {
      classes: 'bg-slate-900 text-slate-200 border border-slate-800',
      style: {}
    };
  }
};

const getInitialSnake = (): Position[] => [
  { x: 7, y: 7 },
  { x: 6, y: 7 },
  { x: 5, y: 7 },
];

export default function App() {
  // Game states
  const [gameStatus, setGameStatus] = useState<GameStatus>('START');
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    try {
      const stored = localStorage.getItem('MathSnake_Difficulty');
      return (stored === 'MODERATE' || stored === 'HARD' || stored === 'EASY') ? stored : 'EASY';
    } catch {
      return 'EASY';
    }
  });
  const [stageId, setStageId] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [highScores, setHighScores] = useState<Record<Difficulty, number>>(() => {
    try {
      const easyStr = localStorage.getItem('MathSnake_HighScore_EASY');
      const modStr = localStorage.getItem('MathSnake_HighScore_MODERATE');
      const hardStr = localStorage.getItem('MathSnake_HighScore_HARD');
      
      const legacy = localStorage.getItem('MathSnake_HighScore');
      const legacyVal = legacy ? parseInt(legacy, 10) : 0;

      return {
        EASY: easyStr ? parseInt(easyStr, 10) : legacyVal,
        MODERATE: modStr ? parseInt(modStr, 10) : 0,
        HARD: hardStr ? parseInt(hardStr, 10) : 0,
      };
    } catch {
      return { EASY: 0, MODERATE: 0, HARD: 0 };
    }
  });

  const highScore = highScores[difficulty];

  const [controlType, setControlType] = useState<'SWIPE' | 'ARROWS'>(() => {
    try {
      const stored = localStorage.getItem('MathSnake_ControlType');
      return stored === 'ARROWS' ? 'ARROWS' : 'SWIPE';
    } catch {
      return 'SWIPE';
    }
  });
  
  const [snake, setSnake] = useState<Position[]>(getInitialSnake());
  const [direction, setDirection] = useState<Position>({ x: 1, y: 0 });
  const [nextDirection, setNextDirection] = useState<Position>({ x: 1, y: 0 });
  const [equation, setEquation] = useState<Equation | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [obstacles, setObstacles] = useState<Position[]>([]);
  const [lives, setLives] = useState<number>(3);
  const [stageCorrectCount, setStageCorrectCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('MathSnake_SoundEnabled');
      return stored !== 'false';
    } catch {
      return true;
    }
  });
  const [penaltyFlash, setPenaltyFlash] = useState<boolean>(false);
  const [correctFlash, setCorrectFlash] = useState<boolean>(false);
  const [lastActionMsg, setLastActionMsg] = useState<string>('SWIPE ON SCREEN TO PLAY');
  const [tickCount, setTickCount] = useState<number>(0);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState<boolean>(false);
  const [showSettingsPage, setShowSettingsPage] = useState<boolean>(false);
  const [showLeaderboardPage, setShowLeaderboardPage] = useState<boolean>(false);
  const [hasSavedGame, setHasSavedGame] = useState<boolean>(false);
  
  const [paletteId, setPaletteId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('MathSnake_ColorPalette');
      return (stored === 'CLASSIC_NOKIA' || stored === 'NEON_BLUE' || stored === 'MATRIX_GREEN') ? stored : 'DEFAULT';
    } catch {
      return 'DEFAULT';
    }
  });

  // Firebase Auth and syncing states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Name editing for profile details
  const [editingName, setEditingName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Leaderboard states
  const [leaderboard, setLeaderboard] = useState<PlayerProfile[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(false);

  const lastLoggedInUserId = useRef<string | null>(null);
  const registeringNameRef = useRef<string | null>(null);

  // Auth synchronization listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      if (user && user.uid !== lastLoggedInUserId.current) {
        lastLoggedInUserId.current = user.uid;
        try {
          const profile = await fetchPlayerProfile(user.uid);
          
          const localEasy = parseInt(localStorage.getItem('MathSnake_HighScore_EASY') || '0', 10);
          const localModerate = parseInt(localStorage.getItem('MathSnake_HighScore_MODERATE') || '0', 10);
          const localHard = parseInt(localStorage.getItem('MathSnake_HighScore_HARD') || '0', 10);
          const localScores = { EASY: localEasy, MODERATE: localModerate, HARD: localHard };

          if (profile) {
            const merged = {
              EASY: Math.max(localEasy, profile.highScoreEasy || 0),
              MODERATE: Math.max(localModerate, profile.highScoreModerate || 0),
              HARD: Math.max(localHard, profile.highScoreHard || 0),
            };
            
            localStorage.setItem('MathSnake_HighScore_EASY', merged.EASY.toString());
            localStorage.setItem('MathSnake_HighScore_MODERATE', merged.MODERATE.toString());
            localStorage.setItem('MathSnake_HighScore_HARD', merged.HARD.toString());
            
            setHighScores(merged);
            
            // Sync current profile back to Firestore asynchronously
            const finalName = user.displayName || profile.displayName || registeringNameRef.current || `Player_${user.uid.substring(0, 5)}`;
            await syncPlayerProfile(user.uid, finalName, merged);
          } else {
            const chosenName = registeringNameRef.current || user.displayName || `Player_${user.uid.substring(0, 5)}`;
            setHighScores(localScores);
            await syncPlayerProfile(user.uid, chosenName, localScores);
          }
          registeringNameRef.current = null;
        } catch (err) {
          console.error("Failed to sync profile on state change:", err);
        }
      } else if (!user) {
        lastLoggedInUserId.current = null;
        registeringNameRef.current = null;
      }
    });
    return () => unsubscribe();
  }, []);

  // Leaderboard Subscription Listener
  useEffect(() => {
    if (gameStatus !== 'START') return;
    
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    
    const unsubscribe = subscribeToLeaderboard(
      difficulty,
      (players) => {
        setLeaderboard(players);
        setLeaderboardLoading(false);
      },
      (err) => {
        console.error("Leaderboard loading/offline state initialized:", err);
        setLeaderboardError("Leaderboard unavailable offline.");
        setLeaderboardLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [difficulty, gameStatus]);

  // Auth Registration/Login Handlers
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      if (isRegistering) {
        if (!authDisplayName.trim()) {
          throw new Error("Display Name is required.");
        }
        if (authDisplayName.length < 2 || authDisplayName.length > 20) {
          throw new Error("Display Name must be 2-20 characters.");
        }
        registeringNameRef.current = authDisplayName;
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await updateProfile(res.user, { displayName: authDisplayName });
        await syncPlayerProfile(res.user.uid, authDisplayName, highScores);
        // Force React auth state update to capture the newly set display name immediately description
        if (auth.currentUser) {
          setCurrentUser({ ...auth.currentUser });
        }
        setIsRegistering(false);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setAuthEmail("");
      setAuthPassword("");
      setAuthDisplayName("");
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Authentication failed.";
      if (err.code === "auth/invalid-email") msg = "Invalid email format.";
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") msg = "Invalid credential. Please check email or password.";
      if (err.code === "auth/wrong-password") msg = "Incorrect password.";
      if (err.code === "auth/email-already-in-use") msg = "Email address already matches an active account.";
      if (err.code === "auth/weak-password") msg = "Password must be at least 6 characters.";
      if (err.code === "auth/unauthorized-domain") {
        msg = `Domain '${window.location.hostname}' is unauthorized. Access Firebase Console -> Authentication -> Settings -> Authorized Domains and add it.`;
      }
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await syncPlayerProfile(res.user.uid, res.user.displayName || `Player_${res.user.uid.substring(0, 5)}`, highScores);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Google Sign-In failed.";
      if (err.code === "auth/unauthorized-domain") {
        msg = `Domain '${window.location.hostname}' is unauthorized. Access Firebase Console -> Authentication -> Settings -> Authorized Domains and add it.`;
      }
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    if (!editingName.trim()) return;
    if (editingName.length < 2 || editingName.length > 20) {
      setNameError("Name must be 2-20 characters.");
      return;
    }

    try {
      setIsEditingName(false);
      if (currentUser) {
        await updatePlayerDisplayName(currentUser.uid, editingName);
        await updateProfile(auth.currentUser!, { displayName: editingName });
        setCurrentUser({ ...auth.currentUser });
      }
    } catch (err: any) {
      console.error(err);
      setNameError("Failed to update name.");
    }
  };

  const [particles, setParticles] = useState<MathParticle[]>([]);

  // Particle updates on animation frames
  useEffect(() => {
    if (particles.length === 0) return;
    const id = requestAnimationFrame(() => {
      setParticles((prev) => 
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            alpha: Math.max(0, (p.life - 1) / p.maxLife),
            life: p.life - 1,
          }))
          .filter((p) => p.life > 0)
      );
    });
    return () => cancelAnimationFrame(id);
  }, [particles]);

  const spawnExplosion = useCallback((gridX: number, gridY: number, colorToUse: string) => {
    const freshParticles: MathParticle[] = [];
    const count = 22;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.16; // Travel bounds
      const lifeMax = 12 + Math.floor(Math.random() * 18); // Spark longevity
      freshParticles.push({
        id: Math.random() + i,
        x: gridX,
        y: gridY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colorToUse,
        size: 3 + Math.random() * 4,
        alpha: 1,
        life: lifeMax,
        maxLife: lifeMax,
      });
    }
    setParticles((prev) => [...prev, ...freshParticles]);
  }, []);

  // Focus and config refs
  const currentStageConfig = STAGE_CONFIGS[stageId] as StageConfig;

  // Sound play helper
  const playRetroSound = useCallback((type: 'eat_correct' | 'eat_incorrect' | 'game_over' | 'level_up' | 'click' | 'step') => {
    if (soundEnabled) {
      playSound(type);
    }
  }, [soundEnabled]);

  // Haptic feedback simulator
  const triggerHaptics = useCallback((type: 'success' | 'fail' | 'move') => {
    if ('vibrate' in navigator) {
      try {
        if (type === 'success') {
          navigator.vibrate([40, 20, 40]);
        } else if (type === 'fail') {
          navigator.vibrate(200);
        } else if (type === 'move') {
          navigator.vibrate(8);
        }
      } catch {
        // Safe wrap for sandboxed frames
      }
    }
  }, []);

  // Update high score persistent state per difficulty
  const updateHighScore = useCallback((newScore: number, gameDifficulty: Difficulty) => {
    let updatedScores: Record<Difficulty, number> | null = null;
    
    setHighScores((prev) => {
      const currentHighScore = prev[gameDifficulty] || 0;
      if (newScore > currentHighScore) {
        const next = { ...prev, [gameDifficulty]: newScore };
        updatedScores = next;
        try {
          localStorage.setItem(`MathSnake_HighScore_${gameDifficulty}`, newScore.toString());
        } catch (err) {
          console.error('LocalStorage write failed:', err);
        }
        return next;
      }
      return prev;
    });

    if (auth.currentUser && updatedScores) {
      syncPlayerProfile(
        auth.currentUser.uid,
        auth.currentUser.displayName || '',
        updatedScores
      ).catch((err) => console.error('Failed to sync high score online:', err));
    }
  }, []);

  // Check if position is occupied
  const isPosOccupied = (pos: Position, snakeBody: Position[], otherFoods: FoodItem[], activeObstacles: Position[] = []): boolean => {
    const collidesWithSnake = snakeBody.some(segment => segment.x === pos.x && segment.y === pos.y);
    const collidesWithFood = otherFoods.some(food => food.position.x === pos.x && food.position.y === pos.y);
    const collidesWithObstacle = activeObstacles.some(obs => obs.x === pos.x && obs.y === pos.y);
    return collidesWithSnake || collidesWithFood || collidesWithObstacle;
  };

  // Safe foods allocator
  const spawnFoods = useCallback((eq: Equation, currentSnake: Position[], activeObstacles: Position[] = []): FoodItem[] => {
    const spawned: FoodItem[] = [];
    const options = eq.options;

    options.forEach((value) => {
      let attempts = 0;
      let pos: Position = { x: 0, y: 0 };
      let occupied = true;

      while (occupied && attempts < 200) {
        pos = {
          x: Math.floor(Math.random() * GRID_SIZE),
          // Offset y slightly to let numbers scatter but not cluster heavily
          y: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
        };
        occupied = isPosOccupied(pos, currentSnake, spawned, activeObstacles);
        attempts++;
      }

      spawned.push({
        position: pos,
        value,
        isCorrect: value === eq.answer,
      });
    });

    return spawned;
  }, []);

  // Set up next question
  const generateNewQuestion = useCallback((targetStage: number, activeSnake: Position[], activeObstacles: Position[] = []) => {
    const eq = generateEquationForStage(targetStage, difficulty);
    setEquation(eq);
    const spawnedFoods = spawnFoods(eq, activeSnake, activeObstacles);
    setFoods(spawnedFoods);
  }, [spawnFoods, difficulty]);

  // Stage initializer
  const startStage = useCallback((stgId: number, resetOverallStats: boolean) => {
    playRetroSound('click');
    setStageId(stgId);
    setSnake(getInitialSnake());
    setDirection({ x: 1, y: 0 });
    setNextDirection({ x: 1, y: 0 });
    setStageCorrectCount(0);
    setTickCount(0);
    
    const config = STAGE_CONFIGS[stgId];
    setLastActionMsg(`LEVEL ${stgId}: SOLVE ${config.targetToWin} QUESTIONS`);
    
    // Configure static obstacles for Stage 4 and 5
    let activeObstacles: Position[] = [];
    if (config.hasObstacles) {
      activeObstacles = [
        { x: 3, y: 3 },
        { x: 12, y: 3 },
        { x: 3, y: 12 },
        { x: 12, y: 12 },
        { x: 8, y: 5 },
        { x: 8, y: 10 },
      ];
    }
    setObstacles(activeObstacles);
    
    if (resetOverallStats) {
      setScore(0);
      setLives(3);
    }

    const currentSnake = getInitialSnake();
    const eq = generateEquationForStage(stgId, difficulty);
    setEquation(eq);
    const spawnedFoods = spawnFoods(eq, currentSnake, activeObstacles);
    setFoods(spawnedFoods);

    setGameStatus('STAGE_INTRO');
  }, [playRetroSound, spawnFoods, difficulty]);

  // Read saved game presence
  useEffect(() => {
    try {
      const saved = localStorage.getItem('MathSnake_SavedGame');
      setHasSavedGame(!!saved);
    } catch {
      setHasSavedGame(false);
    }
  }, [gameStatus]);

  // Auto-save active gameplay states
  useEffect(() => {
    if (['PLAYING', 'PAUSED', 'STAGE_INTRO'].includes(gameStatus)) {
      try {
        const activeState = {
          snake,
          score,
          stageId,
          difficulty,
          lives,
          stageCorrectCount,
          equation,
          foods,
          obstacles,
          direction,
          nextDirection
        };
        localStorage.setItem('MathSnake_SavedGame', JSON.stringify(activeState));
      } catch (err) {
        console.error('Failed to auto-save game progress:', err);
      }
    } else if (gameStatus === 'GAMEOVER' || gameStatus === 'VICTORY') {
      try {
        localStorage.removeItem('MathSnake_SavedGame');
      } catch (err) {
        console.error('Failed to clear saved stage progress:', err);
      }
    }
  }, [gameStatus, snake, score, stageId, difficulty, lives, stageCorrectCount, equation, foods, obstacles, direction, nextDirection]);

  const handleResumeGame = () => {
    try {
      const savedStr = localStorage.getItem('MathSnake_SavedGame');
      if (!savedStr) return;
      const saved = JSON.parse(savedStr);
      if (saved) {
        setSnake(saved.snake);
        setScore(saved.score);
        setStageId(saved.stageId);
        setDifficulty(saved.difficulty);
        setLives(saved.lives);
        setStageCorrectCount(saved.stageCorrectCount);
        setEquation(saved.equation);
        setFoods(saved.foods);
        setObstacles(saved.obstacles);
        setDirection(saved.direction);
        setNextDirection(saved.nextDirection);
        // Start paused so the user has a moment to orient before action ticks continue
        setGameStatus('PAUSED');
        setLastActionMsg('GAME RESUMED! TAP PLAY TO CONTINUE');
        playRetroSound('click');
      }
    } catch (err) {
      console.error('Failed to resume stage save state:', err);
    }
  };

  const handleStartGame = useCallback((initialStage: number = 1) => {
    try {
      localStorage.removeItem('MathSnake_SavedGame');
    } catch {}
    startStage(initialStage, true);
  }, [startStage]);

  // Shift heading vector
  const changeDirection = useCallback((newDir: Position) => {
    if (direction.x + newDir.x === 0 && direction.y + newDir.y === 0) {
      return;
    }
    setNextDirection(newDir);
    playRetroSound('step');
  }, [direction, playRetroSound]);

  // Touch Swipe coordinates state hooks
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (controlType !== 'SWIPE') return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (controlType !== 'SWIPE') return;
    if (!touchStartRef.current) return;

    if (gameStatus === 'PAUSED') {
      playRetroSound('click');
      setGameStatus('PLAYING');
      setLastActionMsg('RESUMED CONTROLS');
      touchStartRef.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    
    const minSwipeDistance = 25; // responsive trigger size
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > minSwipeDistance) {
        if (diffX > 0) {
          changeDirection({ x: 1, y: 0 }); // swipe right
        } else {
          changeDirection({ x: -1, y: 0 }); // swipe left
        }
      }
    } else {
      if (Math.abs(diffY) > minSwipeDistance) {
        if (diffY > 0) {
          changeDirection({ x: 0, y: 1 }); // swipe down
        } else {
          changeDirection({ x: 0, y: -1 }); // swipe up
        }
      }
    }
    touchStartRef.current = null;
  };

  // Main tick game effect loop with requestAnimationFrame logic limiter
  useEffect(() => {
    if (gameStatus !== 'PLAYING') return;

    let lastTickTime = performance.now();
    let animationFrameId: number;

    const tick = () => {
      setDirection(nextDirection);
      setTickCount((prevTick) => prevTick + 1);

      setSnake((prevSnake) => {
        const head = prevSnake[0];
        let newHeadX = head.x + nextDirection.x;
        let newHeadY = head.y + nextDirection.y;

        // 1. End borders handling
        if (difficulty === 'HARD') {
          if (
            newHeadX < 0 ||
            newHeadX >= GRID_SIZE ||
            newHeadY < 0 ||
            newHeadY >= GRID_SIZE
          ) {
            playRetroSound('game_over');
            triggerHaptics('fail');
            setLastActionMsg('CRASHED INTO WALL!');
            setGameStatus('GAMEOVER');
            updateHighScore(score, difficulty);
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 350);
            return prevSnake;
          }
        } else {
          // Wrap around for EASY and MODERATE difficulties
          newHeadX = (newHeadX + GRID_SIZE) % GRID_SIZE;
          newHeadY = (newHeadY + GRID_SIZE) % GRID_SIZE;
        }

        const newHead = { x: newHeadX, y: newHeadY };

        // 2. Obstacles collision
        const hitObs = obstacles.some(obs => obs.x === newHead.x && obs.y === newHead.y);
        if (hitObs) {
          playRetroSound('game_over');
          triggerHaptics('fail');
          setLastActionMsg('HIT BRICK BARRIER!');
          setGameStatus('GAMEOVER');
          updateHighScore(score, difficulty);
          if (difficulty === 'HARD') {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 350);
          }
          return prevSnake;
        }

        // 3. Self-crash collision
        const selfCrash = prevSnake.slice(0, -1).some(
          (segment) => segment.x === newHead.x && segment.y === newHead.y
        );
        if (selfCrash) {
          playRetroSound('game_over');
          triggerHaptics('fail');
          setLastActionMsg('BIT YOUR Retro TAIL!');
          setGameStatus('GAMEOVER');
          updateHighScore(score, difficulty);
          return prevSnake;
        }

        let nextSnake = [newHead, ...prevSnake];

        // 4. Food collision check
        const foodEatenIndex = foods.findIndex(
          (f) => f.position.x === newHead.x && f.position.y === newHead.y
        );

        if (foodEatenIndex !== -1) {
          const eatenFood = foods[foodEatenIndex];
          
          if (eatenFood.isCorrect) {
            // Correct Answer eaten
            spawnExplosion(eatenFood.position.x, eatenFood.position.y, STAGE_THEMES[stageId]?.primary || '#10B981');
            playRetroSound('eat_correct');
            triggerHaptics('success');
            setCorrectFlash(true);
            setTimeout(() => setCorrectFlash(false), 250);

            const nextCorrectCount = stageCorrectCount + 1;
            setStageCorrectCount(nextCorrectCount);

            let multiplier = 1;
            if (nextCorrectCount >= 3) {
              if (difficulty === 'EASY') {
                multiplier = 2;
              } else if (difficulty === 'MODERATE') {
                multiplier = 3;
              } else if (difficulty === 'HARD') {
                multiplier = 4;
              }
            }

            const basePoints = currentStageConfig.pointsScale * prevSnake.length;
            const pointsEarned = basePoints * multiplier;
            const updatedScore = score + pointsEarned;
            setScore(updatedScore);

            if (multiplier > 1) {
              setLastActionMsg(`CORRECT SOLUTIONS: ${nextCorrectCount} (${multiplier}X MULTIPLIER!)`);
            } else {
              setLastActionMsg(`CORRECT SOLUTIONS: ${nextCorrectCount}`);
            }

            // Level Clear and advance logic
            if (nextCorrectCount >= currentStageConfig.targetToWin) {
              setGameStatus('PAUSED'); // Halt ticks briefly
              setTimeout(() => {
                if (stageId < 5) {
                  playRetroSound('level_up');
                  setStageId(stageId + 1);
                  startStage(stageId + 1, false);
                } else {
                  playRetroSound('level_up');
                  setGameStatus('VICTORY');
                  updateHighScore(updatedScore, difficulty);
                }
              }, 100);
            } else {
              // Generate next matching equation
              setTimeout(() => {
                generateNewQuestion(stageId, nextSnake, obstacles);
              }, 10);
            }

            return nextSnake;
          } else {
            // Incorrect answer penalty
            spawnExplosion(eatenFood.position.x, eatenFood.position.y, '#EF4444');
            playRetroSound('eat_incorrect');
            setPenaltyFlash(true);
            triggerHaptics('fail');
            setTimeout(() => setPenaltyFlash(false), 300);

            setLives((prevLives) => {
              const remainingLives = prevLives - 1;
              if (remainingLives <= 0) {
                setLastActionMsg(`WRONG ANSWER! NO LIVES REMAINING`);
                setGameStatus('GAMEOVER');
                updateHighScore(score, difficulty);
              } else {
                setLastActionMsg(`PENALTY! WRONG ANSWER SUCKED: ${eatenFood.value}`);
                // Shrink snake back and reshuffle equations
                setSnake((currentBody) => currentBody.slice(0, 3));
                setTimeout(() => {
                  generateNewQuestion(stageId, nextSnake.slice(0, 3), obstacles);
                }, 10);
              }
              return remainingLives;
            });

            nextSnake.pop();
            return nextSnake;
          }
        }

        nextSnake.pop();
        return nextSnake;
      });
    };

    const loop = (timestamp: number) => {
      const elapsed = timestamp - lastTickTime;
      if (elapsed >= currentStageConfig.speed) {
        tick();
        lastTickTime = timestamp - (elapsed % currentStageConfig.speed);
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    gameStatus,
    foods,
    obstacles,
    snake,
    direction,
    nextDirection,
    stageId,
    score,
    equation,
    currentStageConfig,
    playRetroSound,
    triggerHaptics,
    generateNewQuestion,
    startStage,
    updateHighScore,
    stageCorrectCount,
    difficulty
  ]);

  // Global keybind controls for quick desktop testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus === 'PAUSED' && ['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        playRetroSound('click');
        setGameStatus('PLAYING');
        setLastActionMsg('RESUMED CONTROLS');
        if (['ArrowUp', 'KeyW'].includes(e.code)) changeDirection({ x: 0, y: -1 });
        else if (['ArrowDown', 'KeyS'].includes(e.code)) changeDirection({ x: 0, y: 1 });
        else if (['ArrowLeft', 'KeyA'].includes(e.code)) changeDirection({ x: -1, y: 0 });
        else if (['ArrowRight', 'KeyD'].includes(e.code)) changeDirection({ x: 1, y: 0 });
        return;
      }

      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        changeDirection({ x: 0, y: -1 });
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        changeDirection({ x: 0, y: 1 });
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        changeDirection({ x: -1, y: 0 });
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        changeDirection({ x: 1, y: 0 });
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (gameStatus === 'PLAYING') {
          playRetroSound('click');
          setGameStatus('PAUSED');
          setLastActionMsg('GAME PAUSED (SPACE)');
        } else if (gameStatus === 'PAUSED') {
          playRetroSound('click');
          setGameStatus('PLAYING');
          setLastActionMsg('RESUMED CONTROLS');
        } else if (gameStatus === 'STAGE_INTRO') {
          playRetroSound('click');
          setGameStatus('PLAYING');
          setLastActionMsg('DRAG OR USE KEYS');
        } else if (gameStatus === 'START') {
          handleStartGame(stageId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus, changeDirection, playRetroSound, handleStartGame, stageId]);

  const stageTheme = STAGE_THEMES[stageId] || STAGE_THEMES[1];
  const selectedPalette = PALETTES[paletteId] || PALETTES.DEFAULT;
  const activeTheme = {
    primary: selectedPalette.id === 'DEFAULT' ? stageTheme.primary : selectedPalette.primary,
    glow: selectedPalette.id === 'DEFAULT' ? stageTheme.glow : selectedPalette.glow,
    badge: selectedPalette.id === 'DEFAULT' ? stageTheme.badge : selectedPalette.badge,
    arenaBg: selectedPalette.arenaBg,
    id: selectedPalette.id,
    name: selectedPalette.id === 'DEFAULT' ? stageTheme.name : selectedPalette.name
  };
  
  const isControllerVisible = controlType === 'ARROWS' && (gameStatus === 'PLAYING' || gameStatus === 'PAUSED' || gameStatus === 'STAGE_INTRO');
  const arenaBottomClass = isControllerVisible ? 'ios-safe-arena-with-controller' : 'ios-safe-arena-no-controller';

  return (
    <div id="math-snake-single-screen" className="w-screen h-[100dvh] bg-slate-950 flex items-center justify-center relative overflow-hidden select-none">
      
      {/* Decorative Minimal background visual glow */}
      <div className="absolute inset-x-0 top-0 h-[400px] bg-gradient-to-b from-emerald-500/10 via-slate-950 to-transparent blur-[120px] pointer-events-none" />

      {/* Primary Gameboard Viewport - Centered modern standalone smartphone mockup on desktop, fits full-screen on mobile */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full max-w-md h-full sm:h-[820px] sm:max-h-[92dvh] sm:rounded-[36px] sm:border-[8px] sm:border-slate-900 sm:ring-4 sm:ring-slate-800/10 bg-slate-950 overflow-hidden flex flex-col justify-between text-slate-100 font-sans shadow-2xl touch-none ${isShaking ? 'animate-shake' : ''}`}
      >
        
        {/* Correct/Incorrect Screen Reaction Flash */}
        {penaltyFlash && (
          <div className="absolute inset-0 bg-red-600/20 z-40 animate-pulse pointer-events-none" />
        )}
        {correctFlash && (
          <div className="absolute inset-0 bg-emerald-500/15 z-40 animate-pulse pointer-events-none" />
        )}

        {/* ==========================================================
            HUD (Heads-Up Display)
           ========================================================== */}
        <div className="absolute top-0 left-0 right-0 ios-safe-hud bg-slate-950/90 border-b border-slate-900 z-30 px-5 flex items-center justify-between shadow-lg">
          {/* Back Arrow button + Active Math Formula block */}
          <div className="flex items-center gap-3">
            {gameStatus !== 'START' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playRetroSound('click');
                  setGameStatus('START');
                }}
                className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition cursor-pointer flex items-center justify-center shadow-sm"
                title="Back to Game Main Page"
                id="hud-back-arrow-btn"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Solve</span>
              <span 
                className="text-lg font-bold font-mono tracking-wide"
                style={{ color: activeTheme.primary }}
              >
                {(gameStatus === 'PLAYING' || gameStatus === 'PAUSED') && equation ? equation.text : '...'}
              </span>
            </div>
          </div>

          {/* Core Level and score analytics block */}
          <div className="flex items-center gap-4">
            
            {/* Lives */}
            <div className="flex items-center gap-1 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
              {[...Array(3)].map((_, i) => (
                <span 
                  key={i} 
                  className={`text-xs transition-opacity duration-300 ${i < lives ? 'text-red-500 opacity-100' : 'text-slate-800 opacity-20'}`}
                >
                  ❤️
                </span>
              ))}
            </div>

            {/* Score block */}
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Score</span>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-sm font-bold font-mono text-slate-100">{score}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  Lvl {stageId}
                </span>
              </div>
            </div>

            {/* Controls */}
            {(gameStatus === 'PLAYING' || gameStatus === 'PAUSED') && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-900">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playRetroSound('click');
                    if (gameStatus === 'PLAYING') {
                      setGameStatus('PAUSED');
                      setLastActionMsg('GAME PAUSED');
                    } else {
                      setGameStatus('PLAYING');
                      setLastActionMsg('RESUMED CONTROLS');
                    }
                  }}
                  className={`p-1.5 rounded-lg border bg-slate-900 border-slate-800 hover:text-white transition ${gameStatus === 'PAUSED' ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}
                  title={gameStatus === 'PLAYING' ? 'Pause' : 'Resume'}
                  id="hud-pause-btn"
                >
                  {gameStatus === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ==========================================================
            GAME PLAYFIELD ARENA
           ========================================================== */}
        <div className={`absolute inset-x-0 ${arenaBottomClass} ios-safe-arena z-10 grid grid-cols-16 grid-rows-16 ${activeTheme.arenaBg} p-[8px] transition-colors duration-300`}>
          {[...Array(GRID_SIZE * GRID_SIZE)].map((_, idx) => {
            const x = idx % GRID_SIZE;
            const y = Math.floor(idx / GRID_SIZE);

            const isHead = snake[0] && snake[0].x === x && snake[0].y === y;
            const isBody = snake.slice(1).some(segment => segment.x === x && segment.y === y);
            const isObstacle = obstacles.some(obs => obs.x === x && obs.y === y);

            const foodIndex = foods.findIndex(f => f.position.x === x && f.position.y === y);
            const food = foodIndex !== -1 ? foods[foodIndex] : null;

            const foodStyle = food ? getFoodStyle(food, food.isCorrect, difficulty, activeTheme.id, STAGE_THEMES[stageId]?.primary || '#10B981') : null;

            return (
              <div 
                key={idx}
                className="relative aspect-square flex items-center justify-center w-full h-full"
              >
                {/* Brick obstacles representation */}
                {isObstacle && (
                  <div className={`absolute inset-[2px] ${activeTheme.id === 'CLASSIC_NOKIA' ? 'bg-[#1f2937]/80 border border-[#1f2937]/35' : 'bg-slate-900 border border-slate-700/60'} rounded-sm z-25`} />
                )}

                {/* Snake Head */}
                {isHead && (
                  <div 
                    className="absolute inset-[1px] rounded-md z-20 flex items-center justify-center scale-105"
                    style={{
                      backgroundColor: activeTheme.primary,
                    }}
                  >
                    <div className="flex gap-1.5">
                      <span className={`w-1.5 h-1.5 ${activeTheme.id === 'CLASSIC_NOKIA' ? 'bg-[#9bbc0f]' : 'bg-slate-950'} rounded-full`} />
                      <span className={`w-1.5 h-1.5 ${activeTheme.id === 'CLASSIC_NOKIA' ? 'bg-[#9bbc0f]' : 'bg-slate-950'} rounded-full`} />
                    </div>
                  </div>
                )}

                {/* Snake Body Segment */}
                {isBody && (
                  <div 
                    className="absolute inset-[2.5px] rounded-sm z-10 transition-opacity"
                    style={{
                      backgroundColor: activeTheme.primary,
                      opacity: Math.max(0.3, 1.0 - (snake.findIndex(s => s.x === x && s.y === y) / snake.length) * 0.6),
                    }}
                  />
                )}

                {/* Numeric Choices */}
                {food && foodStyle && (
                  <div 
                    className={`absolute inset-[1px] rounded-full z-20 flex items-center justify-center font-mono font-bold shadow-md transition-all ${foodStyle.classes}`}
                    style={foodStyle.style}
                  >
                    <span className="text-xs select-none leading-none">{food.value}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Particle Explosions Overlay Layer */}
        <div className={`absolute inset-x-0 ${arenaBottomClass} ios-safe-arena z-20 pointer-events-none overflow-hidden`}>
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${(p.x / GRID_SIZE) * 100}%`,
                top: `${(p.y / GRID_SIZE) * 100}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                opacity: p.alpha,
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 10px ${p.color}, 0 0 4px ${p.color}`,
              }}
            />
          ))}
        </div>

        {/* 6. ON-SCREEN ANALOG ARROW D-PAD */}
        {isControllerVisible && (
          <div className="absolute inset-x-0 bottom-0 ios-safe-controller bg-slate-950/95 border-t border-slate-900 flex items-center justify-center z-30 shadow-2xl">
            <ModernTouchControls
              onDirectionChange={changeDirection}
              gameStatus={gameStatus}
              onPauseToggle={() => {
                playRetroSound('click');
                setGameStatus('PAUSED');
                setLastActionMsg('GAME PAUSED');
              }}
              onResume={() => {
                playRetroSound('click');
                setGameStatus('PLAYING');
                setLastActionMsg('RESUMED CONTROLS');
              }}
            />
          </div>
        )}

        {/* ==========================================================
            FLOW PAGES & SCENE MENUS (START, PAUSE, Stage Intro, Gameover)
           ========================================================== */}
        
        {/* Pause Screen Overlay */}
        {gameStatus === 'PAUSED' && (
          <div 
            id="paused-toast-overlay"
            className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px] z-40 flex items-center justify-center p-6"
            onClick={() => {
              playRetroSound('click');
              setGameStatus('PLAYING');
              setLastActionMsg('RESUMED CONTROLS');
            }}
          >
            <div className="bg-slate-905 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center gap-2 shadow-2xl max-w-[240px] w-full text-center cursor-pointer select-none">
              <div className="p-2 bg-slate-850 bg-slate-800 text-amber-400 rounded-full">
                <Pause className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Game Paused</h4>
                <p className="text-xs text-slate-400 mt-1">Tap anywhere to resume calculations</p>
              </div>
            </div>
          </div>
        )}
                {/* 1. START OVERLAY */}
        {gameStatus === 'START' && !showSettingsPage && !showLeaderboardPage && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 md:p-8 overflow-hidden select-none ios-safe-overlay">
            
            {/* Inline custom animations */}
            <style>{`
              @keyframes snakeFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-12px) rotate(2deg); }
              }
              .animate-snake-float {
                animation: snakeFloat 5s ease-in-out infinite;
              }
            `}</style>

            {/* Backdrops / Subtle radial background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Main content centered container */}
            <div className="w-full max-w-sm flex flex-col items-center justify-between h-full py-4 z-10">
              
              {/* Top: Title precisely replicating the sketch */}
              <div className="flex flex-col items-center text-center mt-3 shrink-0">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950/40 border border-emerald-900/35 px-2.5 py-0.5 rounded-full mb-3">
                  ★ PLAY & PREVENT CRASH ★
                </span>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase font-sans drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                  MATH<span className="text-emerald-400">SNAKE</span>
                </h1>
                <p className="text-[10.5px] text-slate-400 max-w-[280px] mt-2 font-medium">
                  The ultimate mathematical retro puzzle. Steer, solve, and thrive!
                </p>
              </div>

              {/* Center: The Winding Vector Snake precisely duplicating the user hand representation */}
              <div className="flex-1 flex items-center justify-center py-6 animate-snake-float">
                <svg viewBox="0 0 200 240" className="w-48 h-56 md:w-56 md:h-64 drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Glowing background path */}
                  <path 
                    d="M 60 70 C 130 50, 150 110, 100 130 C 50 150, 70 210, 140 190" 
                    stroke="#10b981" 
                    strokeWidth="20" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="opacity-20 blur-[6px]"
                  />
                  {/* Main Snake body */}
                  <path 
                    d="M 60 70 C 130 50, 150 110, 100 130 C 50 150, 70 210, 140 190" 
                    stroke="url(#snakeGradient)" 
                    strokeWidth="15" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  
                  {/* Cute Head at (60, 70) */}
                  <g transform="translate(60, 70) rotate(-15)">
                    <ellipse cx="0" cy="0" rx="14" ry="11" fill="#34d399" />
                    
                    {/* Cute glowing eyes */}
                    <circle cx="-5" cy="-3" r="2.5" fill="#020617" />
                    <circle cx="-6" cy="-4" r="1" fill="#ffffff" />
                    <circle cx="5" cy="-3" r="2.5" fill="#020617" />
                    <circle cx="4" cy="-4" r="1" fill="#ffffff" />
                    
                    {/* Little cute smile */}
                    <path d="M -4 4 Q 0 7, 4 4" stroke="#020617" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    
                    {/* Little tongue peaking out */}
                    <path d="M 0 5 L 0 10 L -2 12 M 0 10 L 2 12" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Cute Tail rattle at (140, 190) */}
                  <g transform="translate(140, 190) rotate(15)">
                    <circle cx="2" cy="0" r="4.5" fill="#10b981" />
                    <circle cx="7" cy="-1" r="3.5" fill="#047857" />
                  </g>

                  <defs>
                    <linearGradient id="snakeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Bottom: The Buttons Panel matching the handwritten layout */}
              <div className="w-full flex flex-col gap-3.5 shrink-0 mt-auto">
                
                {/* Row 1: Side by Side options precisely from sketch */}
                <div className="grid grid-cols-2 gap-3 w-full">
                  
                  {/* Left: Hall of Fame */}
                  <button
                    type="button"
                    onClick={() => {
                      playRetroSound('click');
                      setShowLeaderboardPage(true);
                    }}
                    className="py-3 px-4 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-850 text-slate-200 hover:text-amber-400 hover:border-amber-500/30 hover:shadow-[0_0_12px_rgba(245,158,11,0.15)] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95 duration-150 font-sans font-bold text-xs uppercase"
                    id="btn-hall-of-fame-landing"
                  >
                    <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Hall of Fame</span>
                  </button>

                  {/* Right: Game Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      playRetroSound('click');
                      setShowSettingsPage(true);
                    }}
                    className="py-3 px-4 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-850 text-slate-200 hover:text-emerald-400 hover:border-emerald-500/30 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95 duration-150 font-sans font-bold text-xs uppercase"
                    id="btn-settings-landing"
                  >
                    <Settings className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Game Settings</span>
                  </button>

                </div>

                {hasSavedGame && (
                  <button 
                    type="button"
                    onClick={handleResumeGame}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl uppercase tracking-wider transition-all shadow-xl active:scale-95 duration-150 flex items-center justify-center gap-2 cursor-pointer border border-amber-400/30 shadow-[0_4px_20px_rgba(245,158,11,0.3)]"
                    id="start-overlay-resume-btn"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />
                    RESUME GAME (Lvl {(() => {
                      try {
                        const saved = localStorage.getItem('MathSnake_SavedGame');
                        return saved ? JSON.parse(saved).stageId : 1;
                      } catch {
                        return 1;
                      }
                    })()})
                  </button>
                )}

                {/* Row 2: Centers "start game." precisely matching the sketch */}
                <button 
                  type="button"
                  onClick={() => handleStartGame(1)}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl uppercase tracking-wider transition-all shadow-xl active:scale-95 duration-150 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30 shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
                  id="start-overlay-play-btn"
                >
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  START GAME.
                </button>

                {/* Tiny Footer info */}
                <div className="flex items-center justify-between text-[8px] text-slate-600 font-mono mt-1 px-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playRetroSound('click');
                      setShowPrivacyPolicy(true);
                    }}
                    className="hover:text-emerald-400 underline transition-colors cursor-pointer"
                    id="btn-privacy-policy"
                  >
                    Privacy & Data Safety Policy
                  </button>
                  <span>v1.3.2 • Secure Cloud Sync</span>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* HALL OF FAME LEADERBOARD OVERLAY PAGE */}
        {gameStatus === 'START' && showLeaderboardPage && (
          <div className="absolute inset-0 bg-slate-950/98 z-55 flex flex-col items-center justify-between p-4 md:p-6 overflow-hidden select-none ios-safe-overlay">
            
            {/* Back Button */}
            <button
              onClick={() => {
                playRetroSound('click');
                setShowLeaderboardPage(false);
              }}
              className="absolute top-4 left-4 p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition cursor-pointer flex items-center justify-center shadow-lg animate-pulse"
              title="Back to Landing Page"
              id="leaderboard-back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center text-center mt-6 mb-2 shrink-0">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 mb-1.5 shadow-[0_0_12px_rgba(245,158,11,0.15)] flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-white uppercase font-sans">
                HALL OF <span className="text-amber-400">FAME</span>
              </h2>
              <p className="text-[10px] text-slate-400 max-w-sm mt-0.5">
                View top world scores and sync your achievements to the global database.
              </p>
            </div>

            {/* Dashboard Central Card Panel */}
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col p-4 shadow-2xl relative overflow-hidden flex-1 my-3">
              
              {/* Header Title for Central Card */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3.5 shrink-0">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 animate-pulse" />
                  Global Hall of Fame
                </span>
                <span className="text-[8.5px] font-mono text-emerald-400/80 bg-emerald-950/40 border border-emerald-950/30 px-1.5 py-0.5 rounded">
                  Cloud Secured
                </span>
              </div>

              {/* Leaderboard content directly visible */}
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                  
                  {/* Live Cloud Backup Profile Card */}
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[10.5px] shrink-0">
                    {authLoading ? (
                      <div className="flex items-center justify-center py-1 gap-2">
                        <div className="w-3 h-3 border border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[9.5px] text-slate-500 font-mono">Syncing Status...</span>
                      </div>
                    ) : currentUser ? (
                      <div className="flex items-center justify-between">
                        <div className="truncate pr-2">
                          <span className="text-[8px] text-slate-500 uppercase font-mono block">Backup Connected</span>
                          {isEditingName ? (
                            <form onSubmit={handleUpdateName} className="flex gap-1 mt-0.5">
                              <input 
                                type="text" 
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10.5px] text-white uppercase font-bold focus:outline-none focus:border-emerald-500 max-w-[110px]"
                                placeholder="NAME"
                                maxLength={20}
                              />
                              <button 
                                type="submit" 
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[9px] font-black px-1.5 rounded uppercase cursor-pointer"
                              >
                                Save
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-emerald-400 uppercase tracking-wide truncate max-w-[130px]">
                                {currentUser.displayName || `Player_${currentUser.uid.substring(0, 5)}`}
                              </span>
                              <button 
                                type="button"
                                onClick={() => {
                                  setEditingName(currentUser.displayName || `Player_${currentUser.uid.substring(0, 5)}`);
                                  setIsEditingName(true);
                                  setNameError(null);
                                }}
                                className="text-[9px] text-slate-400 hover:text-emerald-300 underline cursor-pointer"
                              >
                                Rename
                              </button>
                            </div>
                          )}
                          {nameError && <p className="text-[8px] text-rose-400 font-mono mt-0.5">{nameError}</p>}
                        </div>

                        <button 
                          type="button"
                          onClick={() => {
                            playRetroSound('click');
                            signOut(auth).catch(console.error);
                          }}
                          className="py-0.5 px-2 bg-rose-955/20 text-rose-400 border border-rose-900/40 hover:bg-rose-900/10 hover:text-rose-300 rounded text-[9px] font-black cursor-pointer uppercase shrink-0"
                        >
                          Logout
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleEmailAuth} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-0.5">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">Dynamic Achievements Sync</span>
                          <button
                            type="button"
                            onClick={() => {
                              playRetroSound('click');
                              setIsRegistering(!isRegistering);
                              setAuthError(null);
                            }}
                            className="text-[9px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer font-bold font-sans"
                          >
                            {isRegistering ? 'Login Instead' : 'Register Here'}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1">
                          {isRegistering && (
                            <input 
                              type="text"
                              value={authDisplayName}
                              onChange={(e) => setAuthDisplayName(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-emerald-500 uppercase font-mono placeholder:text-[9px]"
                              placeholder="CHOOSE DISPLAY NAME"
                              maxLength={20}
                              required
                            />
                          )}
                          <input 
                            type="email"
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            className={`w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-emerald-500 font-mono placeholder:text-[9px] ${!isRegistering ? 'col-span-2' : ''}`}
                            placeholder="YOUR EMAIL"
                            required
                          />
                          <input 
                            type="password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-emerald-500 font-mono col-span-2 placeholder:text-[9px]"
                            placeholder="YOUR PASSWORD"
                            required
                            minLength={6}
                          />
                        </div>

                        {authError && (
                          <p className="text-[9px] text-rose-400 leading-normal break-words whitespace-pre-wrap">{authError}</p>
                        )}

                        <div className="flex gap-1 mt-0.5">
                          <button
                            type="submit"
                            disabled={authSubmitting}
                            className="flex-grow py-1 bg-emerald-500 text-slate-950 text-[9px] font-black rounded hover:bg-emerald-400 transition-colors uppercase cursor-pointer flex items-center justify-center disabled:opacity-40"
                          >
                            {authSubmitting ? '...' : (isRegistering ? 'CREATE ACCOUNT' : 'SECURE SIGN IN')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playRetroSound('click');
                              handleGoogleAuth();
                            }}
                            disabled={authSubmitting}
                            className="px-2 bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-300 text-[9px] font-black rounded transition-colors uppercase cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40"
                          >
                            <svg className="w-2.5 h-2.5 text-red-500 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.133 1 1.18 5.927 1.18 12s4.953 11 11.06 11c6.377 0 10.613-4.437 10.613-10.78 0-.726-.08-1.284-.176-1.833H12.24z"/>
                            </svg>
                            GOOGLE
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* World Rankings scrolling wrapper */}
                  <div className="flex-1 flex flex-col min-h-0 bg-slate-950/60 rounded-xl border border-slate-800/60 p-2 overflow-hidden">
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-900 shrink-0">
                      <span className="text-[9px] font-black text-amber-400/90 flex items-center gap-1 select-none font-sans">
                        🏆 GLOBAL LEADERBOARD ({difficulty})
                      </span>
                    </div>

                    {leaderboardLoading ? (
                      <div className="flex flex-col items-center justify-center py-6 flex-1">
                        <div className="w-4 h-4 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : leaderboardError ? (
                      <div className="flex flex-col items-center justify-center py-4 text-center flex-1">
                        <p className="text-[9.5px] text-slate-500 font-mono">Leaderboard loading in backup mode.</p>
                      </div>
                    ) : leaderboard.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-4 text-center flex-1">
                        <p className="text-[9.5px] text-slate-500 font-mono">No live records registered yet.</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto space-y-0.5 text-slate-300 font-mono text-[9.5px] pr-0.5 min-h-0">
                        {leaderboard.map((player, index) => {
                          const rank = index + 1;
                          const scoreToDisplay = difficulty === 'EASY' 
                            ? player.highScoreEasy 
                            : difficulty === 'MODERATE' 
                            ? player.highScoreModerate 
                            : player.highScoreHard;
                            
                          const isPlayerCurrentUser = currentUser && player.userId === currentUser.uid;

                          if (scoreToDisplay === 0) return null;

                          return (
                            <div 
                              key={player.userId}
                              className={`flex justify-between items-center py-1 px-2 rounded border transition-colors ${
                                isPlayerCurrentUser 
                                  ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-400 font-bold shadow-[0_0_8px_rgba(16,185,129,0.1)]' 
                                  : 'bg-slate-950/50 border-slate-900/65 text-slate-350'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                                <span className={`w-4 font-bold shrink-0 ${
                                  rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-slate-600'
                                }`}>
                                  #{rank}
                                </span>
                                <span className="truncate uppercase font-bold text-slate-200">
                                  {player.displayName}
                                </span>
                              </div>
                              <span className="font-bold text-emerald-400 shrink-0">
                                {scoreToDisplay}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>

            {/* Back to main menu footer */}
            <div className="w-full max-w-md flex justify-center shrink-0 border-t border-slate-900 pt-3">
              <button
                type="button"
                onClick={() => {
                  playRetroSound('click');
                  setShowLeaderboardPage(false);
                }}
                className="w-full px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-lg active:scale-95 duration-150 flex items-center justify-center gap-1.5 cursor-pointer border border-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                id="btn-close-leaderboard-page"
              >
                BACK TO MAIN MENU
              </button>
            </div>
          </div>
        )}

        {/* GAME SETTINGS OVERLAY PAGE */}
        {gameStatus === 'START' && showSettingsPage && (
          <div className="absolute inset-0 bg-slate-950/98 z-55 flex flex-col items-center justify-between p-4 md:p-6 overflow-hidden select-none ios-safe-overlay">
            
            {/* Back Button */}
            <button
              onClick={() => {
                playRetroSound('click');
                setShowSettingsPage(false);
              }}
              className="absolute top-4 left-4 p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition cursor-pointer flex items-center justify-center shadow-lg"
              title="Back to Landing Page"
              id="settings-back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center text-center mt-6 mb-2 shrink-0">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 mb-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)] flex items-center justify-center">
                <Settings className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-white uppercase font-sans">
                GAME <span className="text-emerald-400">SETTINGS</span>
              </h2>
              <p className="text-[10px] text-slate-400 max-w-sm mt-0.5">
                Customize your gameplay mechanics, difficulty level, color theme, and sounds.
              </p>
            </div>

            {/* Config Board / Options Panel */}
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col p-4 shadow-2xl relative overflow-y-auto flex-1 my-3 custom-scrollbar gap-4">
              
              {/* 1. Skill Level */}
              <div className="flex flex-col gap-1">
                <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest pl-0.5">1. Skill Level (Difficulty)</span>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 border border-slate-800/80 p-0.5 rounded-lg">
                  {(['EASY', 'MODERATE', 'HARD'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        playRetroSound('click');
                        setDifficulty(d);
                        try {
                          localStorage.setItem('MathSnake_Difficulty', d);
                        } catch {}
                      }}
                      className={`py-1.5 text-[10px] font-extrabold tracking-wider rounded transition-all cursor-pointer ${
                        difficulty === d
                          ? d === 'EASY'
                            ? 'bg-emerald-500 text-slate-950'
                            : d === 'MODERATE'
                            ? 'bg-blue-500 text-white'
                            : 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-[9.5px] text-slate-400 min-h-[25px] italic pl-0.5 leading-relaxed">
                  {difficulty === 'EASY' && '★ friendly speed • correct equation glows • wrap enabled'}
                  {difficulty === 'MODERATE' && '★ normal speed • high score multiplier x2 • wrap enabled'}
                  {difficulty === 'HARD' && '★ extreme speed • high score multiplier x3 • solid borders'}
                </p>
              </div>

              {/* 2. Controls Mechanic */}
              <div className="flex flex-col gap-1">
                <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest pl-0.5">2. Controls Mechanic</span>
                <div className="grid grid-cols-2 gap-1 bg-slate-950 border border-slate-800/80 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      playRetroSound('click');
                      setControlType('SWIPE');
                      try {
                        localStorage.setItem('MathSnake_ControlType', 'SWIPE');
                      } catch {}
                    }}
                    className={`py-1.5 text-[10px] font-extrabold rounded cursor-pointer transition-all ${
                      controlType === 'SWIPE' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    SWIPE ON SCREEN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playRetroSound('click');
                      setControlType('ARROWS');
                      try {
                        localStorage.setItem('MathSnake_ControlType', 'ARROWS');
                      } catch {}
                    }}
                    className={`py-1.5 text-[10px] font-extrabold rounded cursor-pointer transition-all ${
                      controlType === 'ARROWS' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    TAP SPEED KEYS
                  </button>
                </div>
                <p className="text-[9.5px] text-slate-400 min-h-[14px] italic pl-0.5">
                  {controlType === 'SWIPE' ? '• Drag anywhere to steer (best for desktop players)' : '• Touch glowing direction keys (best for mobile devices)'}
                </p>
              </div>

              {/* 3. Color Palette */}
              <div className="flex flex-col gap-1">
                <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest pl-0.5">3. Color Palette</span>
                <div className="grid grid-cols-4 gap-1 bg-slate-950 border border-slate-800/80 p-0.5 rounded-lg">
                  {Object.values(PALETTES).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        playRetroSound('click');
                        setPaletteId(p.id);
                        try {
                          localStorage.setItem('MathSnake_ColorPalette', p.id);
                        } catch {}
                      }}
                      className={`py-1 text-[8.5px] font-extrabold rounded cursor-pointer transition-all truncate text-center ${
                        paletteId === p.id 
                          ? p.id === 'DEFAULT' 
                            ? 'bg-emerald-500 text-slate-950 font-black' 
                            : p.id === 'CLASSIC_NOKIA'
                            ? 'bg-[#1f2937] text-[#9bbc0f] font-black'
                            : p.id === 'NEON_BLUE'
                            ? 'bg-[#00e5ff] text-slate-950 font-black shadow-[0_0_8px_#00e5ff]'
                            : 'bg-[#39ff14] text-slate-950 font-black shadow-[0_0_8px_#39ff14]'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      id={`palette-btn-page-${p.id.toLowerCase()}`}
                    >
                      {p.id === 'DEFAULT' ? 'DYNAMIC' : p.id === 'CLASSIC_NOKIA' ? 'NOKIA' : p.id === 'NEON_BLUE' ? 'NEON' : 'MATRIX'}
                    </button>
                  ))}
                </div>
                <p className="text-[9.5px] text-slate-400 min-h-[14px] italic pl-0.5">
                  {paletteId === 'DEFAULT' && '• Theme adjusts automatically on next level advancement'}
                  {paletteId === 'CLASSIC_NOKIA' && '• Iconic green LCD screen snake retro nostalgia feel'}
                  {paletteId === 'NEON_BLUE' && '• Futuristic radiant cyan and cosmic deep space arena'}
                  {paletteId === 'MATRIX_GREEN' && '• Cyberpunk digital terminal hacker green command line grid'}
                </p>
              </div>

              {/* 4. Audio Sound */}
              <div className="grid grid-cols-2 gap-3 mt-1 border-t border-slate-800/40 pt-3 flex-1 items-end shrink-0">
                <div className="flex flex-col gap-1">
                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest pl-0.5">4. Audio sound</span>
                  <div className="grid grid-cols-2 gap-1 bg-slate-950 border border-slate-800/80 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setSoundEnabled(true);
                        playSound('click');
                        try {
                          localStorage.setItem('MathSnake_SoundEnabled', 'true');
                        } catch {}
                      }}
                      className={`py-1 rounded text-[9.5px] font-bold uppercase cursor-pointer transition-all ${
                        soundEnabled ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ON
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSoundEnabled(false);
                        try {
                          localStorage.setItem('MathSnake_SoundEnabled', 'false');
                        } catch {}
                      }}
                      className={`py-1 rounded text-[9.5px] font-bold uppercase cursor-pointer transition-all ${
                        !soundEnabled ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      OFF
                    </button>
                  </div>
                </div>

                {/* Local Device High Score */}
                <div className="bg-slate-950 border border-slate-850 p-2 rounded-lg flex items-center justify-between text-xs h-[32px] mb-0.5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-emerald-400" />
                    Best
                  </span>
                  <span className="font-bold font-mono text-emerald-400 text-sm tracking-tight">{highScore} PTS</span>
                </div>
              </div>

            </div>

            {/* Apply panel */}
            <div className="w-full max-w-md flex justify-center shrink-0 border-t border-slate-900 pt-3">
              <button
                type="button"
                onClick={() => {
                  playRetroSound('click');
                  setShowSettingsPage(false);
                }}
                className="w-full px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-lg active:scale-95 duration-150 flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-400/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                id="btn-apply-settings-page"
              >
                APPLY & SAVE SETTINGS
              </button>
            </div>
          </div>
        )}

        {/* 2. STAGE INTRO OVERLAY */}
        {gameStatus === 'STAGE_INTRO' && (
          <div className="absolute inset-0 bg-slate-950/95 z-40 flex flex-col items-center justify-between text-center p-6 ios-safe-overlay">
            <button
              onClick={() => {
                playRetroSound('click');
                setGameStatus('START');
              }}
              className="absolute top-4 left-4 p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition cursor-pointer flex items-center justify-center shadow-lg"
              title="Back to Main Menu"
              id="intro-back-arrow-btn"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Level Start</span>
              <h3 
                className="text-xl font-bold tracking-tight uppercase"
                style={{ color: activeTheme.primary }}
              >
                {currentStageConfig.name}
              </h3>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl w-full max-w-[260px] flex flex-col items-center text-center">
              <p className="text-xs leading-relaxed text-slate-400">
                {currentStageConfig.description}
              </p>
              <div className="w-full h-[1px] bg-slate-800 m-3" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Target: {currentStageConfig.targetToWin} Solutions
              </span>
            </div>

            <button 
              onClick={() => {
                playRetroSound('click');
                setGameStatus('PLAYING');
              }}
              style={{ backgroundColor: activeTheme.primary }}
              className="w-full max-w-[260px] text-slate-950 text-xs font-bold py-3.5 rounded-lg uppercase tracking-wider transition-colors"
            >
              Start Level
            </button>
          </div>
        )}

        {/* 3. GAME OVER SCREEN */}
        {gameStatus === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-slate-950/95 z-40 flex flex-col items-center justify-between text-center p-6 ios-safe-overlay">
            <button
              onClick={() => {
                playRetroSound('click');
                setGameStatus('START');
              }}
              className="absolute top-4 left-4 p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition cursor-pointer flex items-center justify-center shadow-lg"
              title="Back to Main Menu"
              id="gameover-back-arrow-btn"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center">
              <h1 className="text-3xl font-black text-rose-500 tracking-tight uppercase">Game Over</h1>
              <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded text-slate-400 font-mono text-[10px] uppercase mt-2 max-w-[230px] truncate">
                {lastActionMsg}
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-slate-900/60 w-full max-w-[260px] py-4 px-5 rounded-xl border border-slate-800 font-mono text-left text-slate-300">
              <p className="flex justify-between text-xs">
                <span>Total Score:</span>
                <strong className="text-emerald-400 font-bold">{score} PTS</strong>
              </p>
              <p className="flex justify-between text-xs border-t border-slate-800 pt-2.5">
                <span>Stage Reached:</span>
                <strong className="text-white">Level {stageId}</strong>
              </p>
            </div>

            <button
              onClick={() => handleStartGame(1)}
              className="w-full max-w-[260px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold py-3.5 rounded-lg uppercase tracking-wider transition-colors"
            >
              Play Again
            </button>
          </div>
        )}

        {/* 4. VICTORY SCREEN */}
        {gameStatus === 'VICTORY' && (
          <div className="absolute inset-0 bg-slate-950/95 z-40 flex flex-col items-center justify-between text-center p-6 ios-safe-overlay">
            <button
              onClick={() => {
                playRetroSound('click');
                setGameStatus('START');
              }}
              className="absolute top-4 left-4 p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition cursor-pointer flex items-center justify-center shadow-lg"
              title="Back to Main Menu"
              id="victory-back-arrow-btn"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center gap-2">
              <span className="text-amber-400 text-3xl">🏆</span>
              <h1 className="text-2xl font-bold text-amber-400 tracking-wide">Victory!</h1>
              <p className="text-xs text-slate-400 max-w-[240px]">You have successfully conquered all 5 math levels.</p>
            </div>

            <div className="bg-amber-400/5 py-4 px-6 rounded-xl border border-amber-500/10 w-full max-w-[260px] font-mono text-xs">
              <p className="text-slate-500 mb-1">Final Score</p>
              <p className="text-lg font-bold text-amber-400">{score} POINTS</p>
            </div>

            <button
              onClick={() => handleStartGame(1)}
              className="w-full max-w-[260px] bg-amber-400 text-slate-950 text-xs font-bold py-3.5 rounded-lg uppercase tracking-wider hover:bg-amber-300 transition-colors"
            >
              Play Again
            </button>
          </div>
        )}

        {/* 5. PRIVACY POLICY OVERLAY MODAL */}
        {showPrivacyPolicy && (
          <div 
            id="privacy-policy-overlay"
            className="absolute inset-0 bg-slate-950/98 z-50 flex flex-col items-center justify-between p-6 pt-10 pb-8 text-center"
          >
            <div className="flex flex-col items-center w-full max-w-[280px]">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 mb-3">
                <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wide">Privacy & Data Safety</h2>
              <p className="text-[10px] text-slate-500 font-mono mt-1">Google Play Policy Compliance v1.1.0</p>
            </div>

            <div className="flex-1 w-full max-w-[280px] bg-slate-900 border border-slate-800 rounded-lg p-3.5 my-4 overflow-y-auto text-left font-sans space-y-3 shadow-inner">
              <div>
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">1. Personal Information Collection</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                  Math Snake complies fully with COPPA and Google Play Family Policies. We do NOT collect, harvest, request, or transmit any user names, emails, contacts, phone data, locations, or account credentials.
                </p>
              </div>

              <div className="border-t border-slate-800/80 pt-2.5">
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">2. Device & Usage Identifiers</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                  The app is fully offline-functional. We do not integrate any third-party ads networks, trackers, analytics, telemetry SDKs or cookies that log device behaviors.
                </p>
              </div>

              <div className="border-t border-slate-800/80 pt-2.5">
                <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">3. Storage & Settings Preservation</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                  Your retro Game High Score, difficulty choices, and sound settings are processed and stored strictly client-side on your own device's sandboxed local storage registry.
                </p>
              </div>
              
              <div className="border-t border-slate-800/80 pt-2.5 text-center">
                <span className="text-[9px] text-slate-500 block">Developed under direct compliance of COPPA, GDPR, & Google Families policies.</span>
              </div>
            </div>

            <button
              onClick={() => {
                playRetroSound('click');
                setShowPrivacyPolicy(false);
              }}
              className="w-full max-w-[280px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-100 hover:text-white text-xs font-bold py-3 rounded-lg uppercase tracking-wider transition-all cursor-pointer"
            >
              Go Back to Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
