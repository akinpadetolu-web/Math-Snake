import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  linkWithCredential,
  EmailAuthProvider,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  updateDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  type DocumentData
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Difficulty } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Error logging helper as mandated by firebase-integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on initialization as requested by guidelines
async function testFirestoreConnection() {
  try {
    const testPath = 'test/connection';
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore: client appears to be offline. Local caching is enabled.");
    }
  }
}
testFirestoreConnection();

/**
 * Player model interface
 */
export interface PlayerProfile {
  userId: string;
  displayName: string;
  highScoreEasy: number;
  highScoreModerate: number;
  highScoreHard: number;
  createdAt: any;
  updatedAt: any;
}

/**
 * Creates/Syncs a player profile in Firestore.
 */
export async function syncPlayerProfile(
  userId: string, 
  displayName: string, 
  highScores: { EASY: number; MODERATE: number; HARD: number }
): Promise<PlayerProfile> {
  const userRef = doc(db, 'users', userId);
  const pathName = `users/${userId}`;
  
  try {
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      const newProfile: Omit<PlayerProfile, 'createdAt' | 'updatedAt'> & { createdAt: any; updatedAt: any } = {
        userId,
        displayName: displayName || `Player_${userId.substring(0, 5)}`,
        highScoreEasy: highScores.EASY,
        highScoreModerate: highScores.MODERATE,
        highScoreHard: highScores.HARD,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(userRef, newProfile);
      return {
        ...newProfile,
        createdAt: new Date(),
        updatedAt: new Date()
      } as PlayerProfile;
    } else {
      const data = docSnap.data();
      const needsUpdate = 
        highScores.EASY > (data.highScoreEasy || 0) ||
        highScores.MODERATE > (data.highScoreModerate || 0) ||
        highScores.HARD > (data.highScoreHard || 0);

      if (needsUpdate) {
        const updates = {
          highScoreEasy: Math.max(data.highScoreEasy || 0, highScores.EASY),
          highScoreModerate: Math.max(data.highScoreModerate || 0, highScores.MODERATE),
          highScoreHard: Math.max(data.highScoreHard || 0, highScores.HARD),
          updatedAt: serverTimestamp()
        };
        await updateDoc(userRef, updates);
        return {
          ...data,
          ...updates,
          updatedAt: new Date(),
          createdAt: data.createdAt?.toDate() || new Date()
        } as PlayerProfile;
      }
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PlayerProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathName);
    throw error;
  }
}

/**
 * Updates user's screen name in the Firestore db.
 */
export async function updatePlayerDisplayName(userId: string, newName: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const pathName = `users/${userId}`;
  try {
    await updateDoc(userRef, {
      displayName: newName,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pathName);
    throw error;
  }
}

/**
 * Fetches the user's high score profile.
 */
export async function fetchPlayerProfile(userId: string): Promise<PlayerProfile | null> {
  const userRef = doc(db, 'users', userId);
  const pathName = `users/${userId}`;
  try {
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        userId: data.userId,
        displayName: data.displayName,
        highScoreEasy: data.highScoreEasy || 0,
        highScoreModerate: data.highScoreModerate || 0,
        highScoreHard: data.highScoreHard || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, pathName);
    throw error;
  }
}

/**
 * Subscribes to the world leaderboard for a specific difficulty
 */
export function subscribeToLeaderboard(
  difficulty: Difficulty, 
  onUpdate: (players: PlayerProfile[]) => void,
  onError: (err: any) => void
) {
  const usersCollection = collection(db, 'users');
  const scoreField = difficulty === 'EASY' 
    ? 'highScoreEasy' 
    : difficulty === 'MODERATE' 
    ? 'highScoreModerate' 
    : 'highScoreHard';

  // Construct a query to get top 20 players ordered by the score desc.
  const leaderboardQuery = query(
    usersCollection,
    orderBy(scoreField, 'desc'),
    limit(20)
  );

  return onSnapshot(
    leaderboardQuery,
    (snapshot) => {
      const players: PlayerProfile[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        players.push({
          userId: d.userId,
          displayName: d.displayName || 'Anonymous Snake',
          highScoreEasy: d.highScoreEasy || 0,
          highScoreModerate: d.highScoreModerate || 0,
          highScoreHard: d.highScoreHard || 0,
          createdAt: d.createdAt?.toDate() || new Date(),
          updatedAt: d.updatedAt?.toDate() || new Date()
        });
      });
      onUpdate(players);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      onError(error);
    }
  );
}
