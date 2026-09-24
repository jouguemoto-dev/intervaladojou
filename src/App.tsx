import React, { useState, useEffect } from 'react';
import { Workout } from './types/workout';
import {
  loadWorkoutsFromStorage,
  saveSingleWorkout,
  deleteWorkoutById,
  duplicateWorkoutById,
  resetToDefaults,
} from './services/storage';
import {
  auth,
  syncUserProfile,
  saveUserWorkoutToCloud,
  deleteUserWorkoutFromCloud,
  AthleteProfile,
  db,
} from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { WorkoutList } from './components/WorkoutList';
import { WorkoutBuilder } from './components/WorkoutBuilder';
import { WorkoutRunner } from './components/WorkoutRunner';
import { AndroidCodeHub } from './components/AndroidCodeHub';
import { AndroidFrame } from './components/AndroidFrame';
import { UserAccountModal } from './components/UserAccountModal';
import { TestOnPhoneModal } from './components/TestOnPhoneModal';
import { audioAlerts } from './utils/soundAndTts';
import {
  Activity,
  Code2,
  PlusCircle,
  Zap,
  User as UserIcon,
  Cloud,
  Sparkles,
  QrCode,
  Smartphone,
} from 'lucide-react';

type MainTab = 'workouts' | 'builder' | 'code';

export default function App() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [activeTab, setActiveTab] = useState<MainTab>('workouts');
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [runningWorkout, setRunningWorkout] = useState<Workout | null>(null);

  // Individual User Account & Profile State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTestPhoneModalOpen, setIsTestPhoneModalOpen] = useState(false);

  // Initialize workouts from local storage first
  useEffect(() => {
    const list = loadWorkoutsFromStorage();
    setWorkouts(list);
  }, []);

  // Listen to Firebase Auth state
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

  // Real-time Cloud Firestore sync for individual user workouts
  useEffect(() => {
    if (!currentUser) return;

    try {
      const userWorkoutsRef = collection(db, 'users', currentUser.uid, 'workouts');
      const unsubscribe = onSnapshot(userWorkoutsRef, (snapshot) => {
        if (!snapshot.empty) {
          const cloudWorkouts: Workout[] = [];
          snapshot.forEach((doc) => {
            cloudWorkouts.push(doc.data() as Workout);
          });
          setWorkouts(cloudWorkouts);
        } else {
          // If user's cloud database is brand new, seed with defaults to their account
          const initial = loadWorkoutsFromStorage();
          initial.forEach((w) => {
            saveUserWorkoutToCloud(currentUser.uid, w).catch(() => {});
          });
        }
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore real-time sync offline or pending:', err);
    }
  }, [currentUser]);

  // Unlock audio on initial user interaction
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

  const handleSaveWorkout = (savedWorkout: Workout) => {
    handleUserInteraction();
    const updated = saveSingleWorkout(savedWorkout);
    setWorkouts(updated);

    // Save to user's individual cloud database if logged in
    if (currentUser) {
      saveUserWorkoutToCloud(currentUser.uid, savedWorkout).catch(console.error);
    }

    setActiveTab('workouts');
  };

  const handleDuplicateWorkout = (id: string) => {
    const updated = duplicateWorkoutById(id);
    setWorkouts(updated);

    if (currentUser) {
      const cloned = updated[0];
      if (cloned) {
        saveUserWorkoutToCloud(currentUser.uid, cloned).catch(console.error);
      }
    }
  };

  const handleDeleteWorkout = (id: string) => {
    const updated = deleteWorkoutById(id);
    setWorkouts(updated);

    if (currentUser) {
      deleteUserWorkoutFromCloud(currentUser.uid, id).catch(console.error);
    }
  };

  const handleResetDefaults = () => {
    const defaults = resetToDefaults();
    setWorkouts(defaults);

    if (currentUser) {
      defaults.forEach((w) => {
        saveUserWorkoutToCloud(currentUser.uid, w).catch(() => {});
      });
    }
  };

  // If a workout is currently running, show the runner screen
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
        {/* Top App Bar Navigation */}
        <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between flex-shrink-0 gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-emerald-500 p-0.5 shadow-md flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white fill-current" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-black text-white tracking-tight truncate block">
                Ritmo<span className="text-emerald-400">Interval</span>
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('workouts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'workouts'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Treinos</span>
            </button>

            <button
              onClick={() => {
                setEditingWorkout(null);
                setActiveTab('builder');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'builder'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Criador</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kotlin</span>
            </button>
          </div>

          {/* Actions: Phone Test & Individual Account */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsTestPhoneModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 text-xs font-bold transition-all active:scale-95 shadow-md shadow-emerald-950/40 cursor-pointer"
              title="Testar agora no seu celular com QR Code"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">No Celular</span>
            </button>

            <button
              onClick={() => setIsAccountModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                currentUser
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
              title="Conta individual e preferências personalizadas"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="max-w-[70px] sm:max-w-[100px] truncate hidden xs:inline">
                {currentUser
                  ? profile?.displayName || 'Minha Conta'
                  : 'Conta'}
              </span>
              {currentUser && <Cloud className="w-3 h-3 text-emerald-400 ml-0.5" />}
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-hidden relative">
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

          {activeTab === 'code' && <AndroidCodeHub />}
        </div>

        {/* User Individual Account Modal */}
        <UserAccountModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          currentUser={currentUser}
          profile={profile}
          onProfileUpdated={(updated) => setProfile(updated)}
        />

        {/* Test on Phone Modal (QR Code & Android Studio Guide) */}
        <TestOnPhoneModal
          isOpen={isTestPhoneModalOpen}
          onClose={() => setIsTestPhoneModalOpen(false)}
        />
      </div>
    </AndroidFrame>
  );
}
