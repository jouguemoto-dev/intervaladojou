import React, { useState } from 'react';
import { SoundProfile } from '../types/workout';
import { audioAlerts, SOUND_PROFILES } from '../utils/soundAndTts';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Navigation,
  Sparkles,
  Play,
  X,
  Vibrate,
  Sliders,
  Check,
  Radio,
} from 'lucide-react';

interface AudioGpsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gpsStatus: 'active' | 'searching' | 'simulated' | 'denied' | 'disabled';
  isSimulatedGps: boolean;
  onToggleGpsMode: (simulate: boolean) => void;
}

export const AudioGpsSettingsModal: React.FC<AudioGpsSettingsModalProps> = ({
  isOpen,
  onClose,
  gpsStatus,
  isSimulatedGps,
  onToggleGpsMode,
}) => {
  const [selectedProfile, setSelectedProfile] = useState<SoundProfile>(
    audioAlerts.getSoundProfile()
  );
  const [volume, setVolume] = useState<number>(audioAlerts.getVolume());
  const [beepsMuted, setBeepsMuted] = useState<boolean>(audioAlerts.isBeepsMuted());
  const [ttsMuted, setTtsMuted] = useState<boolean>(audioAlerts.isTtsMuted());

  if (!isOpen) return null;

  const handleSelectProfile = (p: SoundProfile) => {
    setSelectedProfile(p);
    audioAlerts.setSoundProfile(p);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    audioAlerts.setVolume(v);
  };

  const handleTestSound = () => {
    audioAlerts.testCurrentSound();
  };

  const toggleBeeps = () => {
    const next = !beepsMuted;
    setBeepsMuted(next);
    audioAlerts.setBeepsMuted(next);
  };

  const toggleTts = () => {
    const next = !ttsMuted;
    setTtsMuted(next);
    audioAlerts.setTtsMuted(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Opções de Sons e GPS</h3>
              <p className="text-xs text-slate-400">Personalize alertas sonoros altos e odômetro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SECTION 1: SOUND PROFILES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-rose-400" />
              Perfil de Alerta Sonoro / Bip
            </span>
            <button
              onClick={handleTestSound}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Ouvir Teste</span>
            </button>
          </div>

          <div className="space-y-2">
            {SOUND_PROFILES.map((p) => {
              const isSelected = p.id === selectedProfile;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProfile(p.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-rose-500/10 border-rose-500/50 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500 text-white'
                          : 'border-slate-600 bg-slate-950'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{p.name}</span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                            p.id === 'whistle' || p.id === 'high_digital'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {p.tag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: VOLUME & BOOST */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Ganho de Volume (Booster)
            </span>
            <span className="font-mono text-xs font-extrabold text-emerald-400">
              {Math.round(volume * 100)}%
            </span>
          </div>

          <input
            type="range"
            min="0.3"
            max="2.0"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
            <span>Normal (100%)</span>
            <span className="text-amber-400 font-bold">Turbo / Ruas Barulhentas (150%)</span>
            <span className="text-rose-400 font-black">Máximo (200%)</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <Vibrate className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-300">Vibração Háptica no Celular</span>
            </div>
            <span className="text-xs font-bold text-emerald-400">Ativa</span>
          </div>
        </div>

        {/* SECTION 3: GPS & DISTÂNCIA */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Rastreamento GPS da Corrida
              </span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                gpsStatus === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : gpsStatus === 'simulated'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {gpsStatus === 'active'
                ? 'GPS Real Ativo'
                : gpsStatus === 'simulated'
                ? 'GPS Virtual (Simulado)'
                : 'Aguardando Sinal'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Calcula distância em km, ritmo instantâneo (min/km) e velocidade durante o treino.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onToggleGpsMode(false)}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                !isSimulatedGps
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>GPS Real do Celular</span>
            </button>

            <button
              onClick={() => onToggleGpsMode(true)}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                isSimulatedGps
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Simular Corrida (Indoor)</span>
            </button>
          </div>
        </div>

        {/* Footer Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all active:scale-95"
        >
          Salvar e Fechar
        </button>
      </div>
    </div>
  );
};
