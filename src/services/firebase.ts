import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SoundProfile, Workout } from '../types/workout';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with specific database ID from config
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || '(default)'
);

export interface AthleteProfile {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  soundProfile: SoundProfile;
  volumeBoost: number;
  ttsEnabled: boolean;
  beepsEnabled: boolean;
  vibrationEnabled: boolean;
  weeklyGoalKm: number;
  runningLevel: 'iniciante' | 'intermediario' | 'avancado';
  createdAt: number;
  updatedAt: number;
}

export interface RunHistoryItem {
  id: string;
  userId: string;
  workoutId?: string;
  workoutName: string;
  totalElapsedSeconds: number;
  distanceMeters: number;
  averagePace: string;
  speedKmh: number;
  stepsCompleted: number;
  totalSteps: number;
  completedAt: number;
}

/**
 * Creates or updates user athlete profile in Firestore
 */
export async function syncUserProfile(user: User, customData?: Partial<AthleteProfile>): Promise<AthleteProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  let profile: AthleteProfile;

  if (snap.exists()) {
    const existing = snap.data() as AthleteProfile;
    profile = {
      ...existing,
      ...customData,
      email: user.email || existing.email || 'atleta@ritmointerval.com',
      displayName: customData?.displayName || user.displayName || existing.displayName || 'Corredor',
      photoURL: user.photoURL || existing.photoURL || '',
      updatedAt: Date.now(),
    };
  } else {
    profile = {
      userId: user.uid,
      email: user.email || 'atleta@ritmointerval.com',
      displayName: user.displayName || (user.isAnonymous ? 'Corredor Convidado' : 'Meu Perfil'),
      photoURL: user.photoURL || '',
      soundProfile: 'whistle',
      volumeBoost: 1.0,
      ttsEnabled: true,
      beepsEnabled: true,
      vibrationEnabled: true,
      weeklyGoalKm: 15,
      runningLevel: 'intermediario',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...customData,
    };
  }

  await setDoc(userRef, profile, { merge: true });
  return profile;
}

/**
 * Saves a custom interval workout to the individual user's database
 */
export async function saveUserWorkoutToCloud(userId: string, workout: Workout): Promise<void> {
  const workoutRef = doc(db, 'users', userId, 'workouts', workout.id);
  await setDoc(workoutRef, {
    ...workout,
    userId,
    updatedAt: Date.now(),
  });
}

/**
 * Deletes a workout from user's individual database
 */
export async function deleteUserWorkoutFromCloud(userId: string, workoutId: string): Promise<void> {
  const workoutRef = doc(db, 'users', userId, 'workouts', workoutId);
  await deleteDoc(workoutRef);
}

/**
 * Records a finished run to user's personal cloud history
 */
export async function saveRunHistoryToCloud(userId: string, run: Omit<RunHistoryItem, 'userId'>): Promise<void> {
  const runRef = doc(db, 'users', userId, 'runs', run.id);
  await setDoc(runRef, {
    ...run,
    userId,
    completedAt: Date.now(),
  });
}
