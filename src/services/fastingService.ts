import {
  FastingProfile,
  FastingSession,
  FASTING_STAGES,
  FastingStage,
} from '../types/fasting';
import { db, auth } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';

const FASTING_PROFILE_KEY = 'ritmo_interval_fasting_profile_v1';
const FASTING_HISTORY_KEY = 'ritmo_interval_fasting_history_v1';

export const DEFAULT_FASTING_PROFILE: FastingProfile = {
  unlockedLevel: 1, // Starts at 2 hours
  totalXp: 0,
  streakDays: 0,
  totalFastingSeconds: 0,
  totalCompletedFasts: 0,
  unlockedBadges: [],
  activeFast: null,
};

/**
 * Loads the local fasting profile
 */
export function loadLocalFastingProfile(): FastingProfile {
  try {
    const raw = localStorage.getItem(FASTING_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_FASTING_PROFILE,
        ...parsed,
        unlockedLevel: Math.max(1, parsed.unlockedLevel || 1),
      };
    }
  } catch (e) {
    console.error('Error reading local fasting profile', e);
  }
  return { ...DEFAULT_FASTING_PROFILE };
}

/**
 * Saves the local fasting profile
 */
export function saveLocalFastingProfile(profile: FastingProfile): void {
  try {
    localStorage.setItem(FASTING_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving local fasting profile', e);
  }
}

/**
 * Loads local fasting history sessions
 */
export function loadLocalFastingHistory(): FastingSession[] {
  try {
    const raw = localStorage.getItem(FASTING_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local fasting history', e);
  }
  return [];
}

/**
 * Saves local fasting history session
 */
export function saveLocalFastingSession(session: FastingSession): FastingSession[] {
  const existing = loadLocalFastingHistory();
  const updated = [session, ...existing.filter((s) => s.id !== session.id)];
  try {
    localStorage.setItem(FASTING_HISTORY_KEY, JSON.stringify(updated.slice(0, 100)));
  } catch (e) {
    console.error('Error saving local fasting session', e);
  }
  return updated;
}

/**
 * Starts a new fasting session
 */
export function startFastSession(
  stageLevel: number,
  customStartTime?: number
): FastingProfile {
  const profile = loadLocalFastingProfile();
  const stage = FASTING_STAGES.find((s) => s.level === stageLevel) || FASTING_STAGES[0];
  const startTime = customStartTime || Date.now();

  const updated: FastingProfile = {
    ...profile,
    activeFast: {
      startTime,
      targetHours: stage.targetHours,
      stageLevel: stage.level,
      awardedMilestones: [],
    },
  };

  saveLocalFastingProfile(updated);
  syncProfileToCloud(updated).catch(() => {});
  return updated;
}

/**
 * Cancels the currently active fast without recording a completed session
 */
export function cancelActiveFast(): FastingProfile {
  const profile = loadLocalFastingProfile();
  const updated: FastingProfile = {
    ...profile,
    activeFast: null,
  };
  saveLocalFastingProfile(updated);
  syncProfileToCloud(updated).catch(() => {});
  return updated;
}

export interface CompleteFastResult {
  updatedProfile: FastingProfile;
  session: FastingSession;
  unlockedNewLevel: boolean;
  newLevelUnlocked?: number;
  newBadgeEarned?: string;
  xpEarned: number;
}

/**
 * Completes the active fast, checks target goals, awards XP and advances stages
 */
export function completeActiveFast(): CompleteFastResult | null {
  const profile = loadLocalFastingProfile();
  if (!profile.activeFast) return null;

  const { startTime, targetHours, stageLevel } = profile.activeFast;
  const now = Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
  const completedHours = elapsedSeconds / 3600;

  const stage = FASTING_STAGES.find((s) => s.level === stageLevel) || FASTING_STAGES[0];
  const meetsGoal = completedHours >= targetHours * 0.98; // 98% or more counts as successful completion

  // Calculate XP: full stage reward if goal met, or proportional if partial
  let xpEarned = 0;
  if (meetsGoal) {
    xpEarned = stage.rewardXp;
  } else {
    xpEarned = Math.round((completedHours / targetHours) * stage.rewardXp * 0.5);
  }

  // Check if this unlocks the next level
  let unlockedNewLevel = false;
  let newLevelUnlocked: number | undefined;
  let nextUnlockedLevel = profile.unlockedLevel;

  if (meetsGoal && stageLevel >= profile.unlockedLevel) {
    const nextLevel = Math.min(FASTING_STAGES.length, stageLevel + 1);
    if (nextLevel > profile.unlockedLevel) {
      unlockedNewLevel = true;
      newLevelUnlocked = nextLevel;
      nextUnlockedLevel = nextLevel;
    }
  }

  // Badges
  const badges = [...profile.unlockedBadges];
  let newBadgeEarned: string | undefined;
  if (meetsGoal && !badges.includes(stage.badgeName)) {
    badges.push(stage.badgeName);
    newBadgeEarned = stage.badgeName;
  }

  // Streak calculation
  const todayStr = new Date().toISOString().split('T')[0];
  let streakDays = profile.streakDays;
  if (profile.lastFastDate !== todayStr && meetsGoal) {
    streakDays += 1;
  }

  const updatedProfile: FastingProfile = {
    ...profile,
    unlockedLevel: nextUnlockedLevel,
    totalXp: profile.totalXp + xpEarned,
    streakDays,
    lastFastDate: todayStr,
    totalFastingSeconds: profile.totalFastingSeconds + elapsedSeconds,
    totalCompletedFasts: profile.totalCompletedFasts + (meetsGoal ? 1 : 0),
    unlockedBadges: badges,
    activeFast: null,
  };

  const session: FastingSession = {
    id: `fast_${Date.now()}`,
    userId: auth.currentUser?.uid,
    startTime,
    endTime: now,
    targetHours,
    stageLevel,
    completedHours: Number(completedHours.toFixed(2)),
    success: meetsGoal,
    xpEarned,
  };

  saveLocalFastingProfile(updatedProfile);
  saveLocalFastingSession(session);

  // Sync to Cloud
  syncProfileToCloud(updatedProfile).catch(() => {});
  syncSessionToCloud(session).catch(() => {});

  return {
    updatedProfile,
    session,
    unlockedNewLevel,
    newLevelUnlocked,
    newBadgeEarned,
    xpEarned,
  };
}

/**
 * Awards a live milestone passed during an active fast session
 */
export function recordLiveMilestonePassed(milestoneHours: number): {
  profile: FastingProfile;
  stage: FastingStage;
  xpEarned: number;
  newLevelUnlocked?: number;
  newBadgeEarned?: string;
} | null {
  const profile = loadLocalFastingProfile();
  if (!profile.activeFast) return null;

  const awarded = profile.activeFast.awardedMilestones || [];
  if (awarded.includes(milestoneHours)) return null; // already awarded

  const stage = FASTING_STAGES.find((s) => s.targetHours === milestoneHours);
  if (!stage) return null;

  const xpEarned = stage.rewardXp;
  const nextUnlockedLevel = Math.max(profile.unlockedLevel, Math.min(FASTING_STAGES.length, stage.level + 1));
  let newLevelUnlocked: number | undefined;
  if (nextUnlockedLevel > profile.unlockedLevel) {
    newLevelUnlocked = nextUnlockedLevel;
  }

  const badges = [...profile.unlockedBadges];
  let newBadgeEarned: string | undefined;
  if (!badges.includes(stage.badgeName)) {
    badges.push(stage.badgeName);
    newBadgeEarned = stage.badgeName;
  }

  const updatedProfile: FastingProfile = {
    ...profile,
    unlockedLevel: nextUnlockedLevel,
    totalXp: profile.totalXp + xpEarned,
    unlockedBadges: badges,
    activeFast: {
      ...profile.activeFast,
      awardedMilestones: [...awarded, milestoneHours],
    },
  };

  saveLocalFastingProfile(updatedProfile);
  syncProfileToCloud(updatedProfile).catch(() => {});

  return {
    profile: updatedProfile,
    stage,
    xpEarned,
    newLevelUnlocked,
    newBadgeEarned,
  };
}

/**
 * Cloud Sync helpers
 */
export async function syncProfileToCloud(profile: FastingProfile): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { fastingProfile: profile }, { merge: true });
  } catch (err) {
    console.error('Failed to sync fasting profile to cloud', err);
  }
}

export async function syncSessionToCloud(session: FastingSession): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const sessionRef = doc(db, 'users', user.uid, 'fasts', session.id);
    await setDoc(sessionRef, session, { merge: true });
  } catch (err) {
    console.error('Failed to sync fast session to cloud', err);
  }
}

export async function loadCloudFastingHistory(): Promise<FastingSession[]> {
  const user = auth.currentUser;
  if (!user) return loadLocalFastingHistory();
  try {
    const fastsRef = collection(db, 'users', user.uid, 'fasts');
    const q = query(fastsRef, orderBy('startTime', 'desc'), limit(30));
    const snapshot = await getDocs(q);
    const cloudSessions: FastingSession[] = [];
    snapshot.forEach((d) => cloudSessions.push(d.data() as FastingSession));
    if (cloudSessions.length > 0) return cloudSessions;
  } catch (err) {
    console.error('Failed to load cloud fasting history', err);
  }
  return loadLocalFastingHistory();
}
