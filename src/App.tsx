import React, { useState, useEffect } from 'react';
import { Workout } from './types/workout';
import {
  loadWorkoutsFromStorage,
  saveSingleWorkout,
  saveWorkoutsToStorage,
  deleteWorkoutById,
  duplicateWorkoutById,
  resetToDefaults,
} from './services/storage';
import { DEFAULT_WORKOUTS } from './data/defaultWorkouts';
import {
  auth,
  ensureActiveAuth,
  syncUserProfile,
  saveUserWorkoutToCloud,
  deleteUserWorkoutFromCloud,
  markUserWorkoutsSeeded,
  AthleteProfile,
  db,
} from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { WorkoutList } from './components/WorkoutList';
import { WorkoutBuilder } from './components/WorkoutBuilder';
import { WorkoutRunner } from './components/WorkoutRunner';
import { AndroidCodeHub } from './components/AndroidCodeHub';
import { AndroidFrame } from './components/AndroidFrame';
import { UserAccountModal } from './components/UserAccountModal';
import { InstallHelpModal } from './components/InstallHelpModal';
import { audioAlerts } from './utils/soundAndTts';
import {
  Activity,
  User as UserIcon,
  Download,
} from 'lucide-react';

type MainTab = 'workouts' | 'builder' | 'code';

export default function App() {
  const [workouts, setWorkouts] = useState<Workout[]>(() => loadWorkoutsFromStorage());
  const [activeTab, setActiveTab] = useState<MainTab>('workouts');
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [runningWorkout, setRunningWorkout] = useState<Workout | null>(null);

  // Individual User Account & Profile State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Catch PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // 1. Automatically activate the cloud database on initial mount
  useEffect(() => {
    ensureActiveAuth().catch((err) => {
      console.warn('Auto anonymous auth fallback:', err);
    });
  }, []);

  // 2. Listen to authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const synced = await syncUserProfile(user);
          setProfile(synced);
          if (synced.soundProfile) {
            audioAlerts.setSoundProfile(synced.soundProfile);
          }
          if (synced.volumeBoost) {
            audioAlerts.setVolume(synced.volumeBoost);
          }
        } catch (err) {
          console.error('Error syncing athlete profile:', err);
        }
      } else {
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Real-time synchronization with Firestore individual database
  useEffect(() => {
    if (!currentUser) return;

    try {
      const userWorkoutsRef = collection(db, 'users', currentUser.uid, 'workouts');
      const unsubscribe = onSnapshot(userWorkoutsRef, async (snapshot) => {
        if (!snapshot.empty) {
          const cloudWorkouts: Workout[] = [];
          snapshot.forEach((doc) => {
            cloudWorkouts.push(doc.data() as Workout);
          });
          // Sort by creation date
          cloudWorkouts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setWorkouts(cloudWorkouts);
          saveWorkoutsToStorage(cloudWorkouts);
        } else {
          // Check if this account has already been seeded in the past
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const userData = userDoc.data() as AthleteProfile | undefined;

          if (userData?.workoutsSeeded) {
            // User intentionally deleted all workouts! Keep it empty, DO NOT reseed!
            setWorkouts([]);
            saveWorkoutsToStorage([]);
          } else {
            // First time this athlete connects to the database: seed default workouts
            const initial = loadWorkoutsFromStorage();
            const toSeed = initial.length > 0 ? initial : DEFAULT_WORKOUTS;
            for (const w of toSeed) {
              await saveUserWorkoutToCloud(currentUser.uid, w);
            }
            await markUserWorkoutsSeeded(currentUser.uid);
            setWorkouts(toSeed);
            saveWorkoutsToStorage(toSeed);
          }
        }
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore sync warning:', err);
    }
  }, [currentUser]);

  const handleUserInteraction = () => {
    audioAlerts.unlockAudio();
  };

  const handleCreateNew = () => {
    handleUserInteraction();
    setEditingWorkout(null);
    setActiveTab('builder');
  };

  const handleEditWorkout = (workout: Workout) => {
    handleUserInteraction();
    setEditingWorkout(workout);
    setActiveTab('builder');
  };

  const handleStartWorkout = (workout: Workout) => {
    handleUserInteraction();
    setRunningWorkout(workout);
  };

  const handleSaveWorkout = async (savedWorkout: Workout) => {
    handleUserInteraction();
    const updated = saveSingleWorkout(savedWorkout);
    setWorkouts(updated);

    if (currentUser) {
      try {
        await saveUserWorkoutToCloud(currentUser.uid, savedWorkout);
      } catch (err) {
        console.error('Failed to save workout to cloud:', err);
      }
    }

    setActiveTab('workouts');
  };

  const handleDuplicateWorkout = async (id: string) => {
    const updated = duplicateWorkoutById(id);
    setWorkouts(updated);

    if (currentUser) {
      const cloned = updated[0];
      if (cloned) {
        try {
          await saveUserWorkoutToCloud(currentUser.uid, cloned);
        } catch (err) {
          console.error('Failed to duplicate workout in cloud:', err);
        }
      }
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    // 1. Immediately delete from local storage
    const updated = deleteWorkoutById(id);
    setWorkouts(updated);

    // 2. Immediately delete from Firestore cloud database
    if (currentUser) {
      try {
        await deleteUserWorkoutFromCloud(currentUser.uid, id);
        // Ensure this account remains marked as seeded so it never re-injects deleted workouts
        await markUserWorkoutsSeeded(currentUser.uid);
      } catch (err) {
        console.error('Failed to delete workout from cloud:', err);
      }
    }
  };

  const handleResetDefaults = async () => {
    const defaults = resetToDefaults();
    setWorkouts(defaults);

    if (currentUser) {
      for (const w of defaults) {
        await saveUserWorkoutToCloud(currentUser.uid, w);
      }
    }
  };

  if (runningWorkout) {
    return (
      <AndroidFrame>
        <WorkoutRunner
          workout={runningWorkout}
          onFinish={() => setRunningWorkout(null)}
          onExit={() => setRunningWorkout(null)}
        />
      </AndroidFrame>
    );
  }

  return (
    <AndroidFrame>
      <div
        className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden"
        onClick={handleUserInteraction}
      >
        {/* Top App Bar */}
        <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-black text-white tracking-tight">
              Ritmo<span className="text-emerald-400">Interval</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Instalar e Usar no Celular"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>

            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="Conta e Perfil"
            >
              <UserIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Body Viewport */}
        <main className="flex-1 overflow-hidden relative pb-16">
          {activeTab === 'workouts' && (
            <WorkoutList
              workouts={workouts}
              onSelectWorkout={handleStartWorkout}
              onEditWorkout={handleEditWorkout}
              onCreateNew={handleCreateNew}
              onDuplicateWorkout={handleDuplicateWorkout}
              onDeleteWorkout={handleDeleteWorkout}
              onResetDefaults={handleResetDefaults}
            />
          )}

          {activeTab === 'builder' && (
            <WorkoutBuilder
              initialWorkout={editingWorkout}
              onSave={handleSaveWorkout}
              onStart={handleStartWorkout}
              onCancel={() => setActiveTab('workouts')}
            />
          )}

          {activeTab === 'code' && <AndroidCodeHub onBack={() => setActiveTab('workouts')} />}
        </main>

        {/* Bottom Thumb-Zone Navigation Bar */}
        <nav className="absolute bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/90 h-16 flex items-center justify-around px-8">
          <button
            onClick={() => setActiveTab('workouts')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-4 transition-colors cursor-pointer ${
              activeTab === 'workouts' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[11px] font-semibold">Treinos</span>
          </button>

          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-1 px-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[11px] font-semibold truncate max-w-[80px]">
              {currentUser ? profile?.displayName || 'Conta' : 'Conta'}
            </span>
          </button>
        </nav>

        {/* Modals */}
        <UserAccountModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          currentUser={currentUser}
          profile={profile}
          onProfileUpdated={(updated) => setProfile(updated)}
        />

        <InstallHelpModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          deferredPrompt={deferredPrompt}
          onInstalled={() => {
            setDeferredPrompt(null);
          }}
        />
      </div>
    </AndroidFrame>
  );
}
