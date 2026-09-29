import React from 'react';
import { useTheme, THEME_CONFIGS, AppTheme } from '../context/ThemeContext';
import { Palette, Check, X, Sparkles } from 'lucide-react';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose }) => {
  const { theme: currentTheme, setTheme } = useTheme();

  if (!isOpen) return null;

  const themes: AppTheme[] = ['cyber-emerald', 'lava-orange', 'electric-cyan', 'light-slate'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-white border border-slate-700">
              <Palette className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Temas de Cores do App</h3>
              <p className="text-xs text-slate-400">Escolha o visual esportivo preferido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme selection cards */}
        <div className="space-y-3">
          {themes.map((themeKey) => {
            const config = THEME_CONFIGS[themeKey];
            const isSelected = currentTheme === themeKey;

            return (
              <div
                key={themeKey}
                onClick={() => setTheme(themeKey)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-800/80 border-slate-600 shadow-md ring-1 ring-white/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Color preview circle */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner flex-shrink-0 relative overflow-hidden"
                    style={{
                      backgroundColor: config.previewBg,
                      borderColor: config.previewAccent + '66',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full shadow-md"
                      style={{
                        backgroundColor: config.previewAccent,
                        boxShadow: `0 0 10px ${config.previewAccent}`,
                      }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{config.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({config.name})</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      {config.tagline}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'border-white bg-white text-slate-950'
                      : 'border-slate-700 bg-slate-900 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Preview Sample */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Prévia do Botão e Destaques:</span>
            <span className="text-[11px] font-bold text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Ao Vivo
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${THEME_CONFIGS[currentTheme].buttonPrimary}`}
            >
              + Novo Treino
            </button>
            <span
              className={`px-3 py-2 rounded-xl text-xs font-bold border ${THEME_CONFIGS[currentTheme].badgeBg}`}
            >
              Destaque Ativo
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
        >
          Confirmar Tema
        </button>
      </div>
    </div>
  );
};
