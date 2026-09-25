import React, { useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  syncUserProfile,
  AthleteProfile,
  RunHistoryItem,
  db,
} from '../services/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { SoundProfile } from '../types/workout';
import { audioAlerts, SOUND_PROFILES } from '../utils/soundAndTts';
import { formatTimeDisplay } from '../utils/dashboardCalculator';
import {
  User as UserIcon,
  LogOut,
  Mail,
  Lock,
  Sparkles,
  Trophy,
  History,
  Settings,
  X,
  Target,
  Check,
  AlertCircle,
  Volume2,
  Sliders,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  profile: AthleteProfile | null;
  onProfileUpdated: (updated: AthleteProfile) => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  profile,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'auth'>('profile');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [weeklyGoalKm, setWeeklyGoalKm] = useState(profile?.weeklyGoalKm || 15);
  const [runningLevel, setRunningLevel] = useState<AthleteProfile['runningLevel']>(
    profile?.runningLevel || 'intermediario'
  );
  const [soundProfile, setSoundProfile] = useState<SoundProfile>(
    profile?.soundProfile || 'whistle'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Run history from Firestore
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setWeeklyGoalKm(profile.weeklyGoalKm || 15);
      setRunningLevel(profile.runningLevel || 'intermediario');
      setSoundProfile(profile.soundProfile || 'whistle');
    }
  }, [profile]);

  // Load user run history from Firestore
  useEffect(() => {
    if (!currentUser) {
      setRunHistory([]);
      return;
    }

    try {
      const runsRef = collection(db, 'users', currentUser.uid, 'runs');
      const q = query(runsRef, orderBy('completedAt', 'desc'), limit(15));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: RunHistoryItem[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...(doc.data() as any) });
          });
          setRunHistory(list);
        },
        (error) => {
          console.warn('Runs history snapshot warning:', error);
        }
      );
      return () => unsubscribe();
    } catch {
      // Offline fallback
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (authMode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        const synced = await syncUserProfile(cred.user, {
          displayName: displayName.trim() || 'Atleta',
          runningLevel,
          weeklyGoalKm,
          soundProfile,
        });
        onProfileUpdated(synced);
        setSuccessMessage('Conta individual criada com sucesso!');
        setActiveTab('profile');
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const synced = await syncUserProfile(cred.user);
        onProfileUpdated(synced);
        setSuccessMessage('Login efetuado com sucesso!');
        setActiveTab('profile');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao autenticar. Verifique seus dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const synced = await syncUserProfile(cred.user);
      onProfileUpdated(synced);
      setSuccessMessage('Login com Google realizado!');
      setActiveTab('profile');
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao conectar com o Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const cred = await signInAnonymously(auth);
      const synced = await syncUserProfile(cred.user, {
        displayName: 'Atleta Convidado',
      });
      onProfileUpdated(synced);
      setSuccessMessage('Conta rápida de convidado ativada!');
      setActiveTab('profile');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao entrar como convidado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await syncUserProfile(currentUser, {
        displayName: displayName.trim() || 'Atleta',
        weeklyGoalKm: Number(weeklyGoalKm) || 15,
        runningLevel,
        soundProfile,
      });

      // Also apply sound profile to audioAlerts engine
      audioAlerts.setSoundProfile(soundProfile);

      onProfileUpdated(updated);
      setSuccessMessage('Perfil e preferências personalizadas salvas no banco de dados!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar no banco de dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setActiveTab('auth');
    setSuccessMessage('Você saiu da sua conta.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-md flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {currentUser
                  ? profile?.displayName || currentUser.displayName || 'Minha Conta'
                  : 'Conta Individual & Banco de Dados'}
              </h3>
              <p className="text-xs text-slate-400">
                {currentUser
                  ? currentUser.email || 'Conta Anônima Sincronizada'
                  : 'Sincronize treinos e histórico na nuvem'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          {currentUser ? (
            <>
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'profile'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Perfil & Metas</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Histórico ({runHistory.length})</span>
              </button>
            </>
          ) : (
            <div className="w-full text-center py-1 text-xs font-bold text-slate-300">
              Entre ou crie uma conta para salvar seus dados
            </div>
          )}
        </div>

        {/* Feedback messages */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: AUTH (LOGIN / REGISTER) */}
        {(!currentUser || activeTab === 'auth') && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 pb-1">
              <button
                onClick={() => setAuthMode('login')}
                className={`text-xs font-bold pb-1 border-b-2 transition-all ${
                  authMode === 'login'
                    ? 'text-emerald-400 border-emerald-500'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                Já tenho conta (Entrar)
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`text-xs font-bold pb-1 border-b-2 transition-all ${
                  authMode === 'register'
                    ? 'text-emerald-400 border-emerald-500'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                Criar Nova Conta
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nome / Apelido do Atleta
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading
                  ? 'Processando...'
                  : authMode === 'register'
                  ? 'Cadastrar Conta Individual'
                  : 'Entrar na Minha Conta'}
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800" />
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase font-bold">
                Ou continue rapidamente
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleGoogleSignIn}
                type="button"
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Google</span>
              </button>

              <button
                onClick={handleGuestSignIn}
                type="button"
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Convidado</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: PROFILE & PREFERENCES (PERSONALIZADO) */}
        {currentUser && activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nome do Corredor
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Running Level */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nível de Condicionamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['iniciante', 'intermediario', 'avancado'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setRunningLevel(lvl)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                        runningLevel === lvl
                          ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekly Goal */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Meta Semanal de Corrida
                  </label>
                  <span className="text-xs font-black text-emerald-400 font-mono">
                    {weeklyGoalKm} km / semana
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={weeklyGoalKm}
                  onChange={(e) => setWeeklyGoalKm(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Preferred Sound Profile */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                  Alerta Sonoro Padrão
                </label>
                <select
                  value={soundProfile}
                  onChange={(e) => setSoundProfile(e.target.value as SoundProfile)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  {SOUND_PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.tag})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Preferências no Banco de Dados</span>
              </button>

              <button
                onClick={handleSignOut}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 text-xs font-bold transition-all"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: RUN HISTORY (HISTÓRICO NO FIRESTORE) */}
        {currentUser && activeTab === 'history' && (
          <div className="space-y-3">
            {runHistory.length === 0 ? (
              <div className="text-center py-10 px-4 border border-slate-800 rounded-2xl bg-slate-950/50">
                <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-300">Nenhuma corrida registrada ainda</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Conclua seu primeiro treino para salvar o histórico no seu banco de dados individual.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {runHistory.map((run) => (
                  <div
                    key={run.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{run.workoutName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(run.completedAt).toLocaleDateString('pt-BR')} • {new Date(run.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-extrabold text-cyan-400 font-mono">
                        {(run.distanceMeters / 1000).toFixed(2)} km
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-400 font-mono">
                        {formatTimeDisplay(run.totalElapsedSeconds)} • {run.averagePace}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
