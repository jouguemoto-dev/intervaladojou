import React, { useState, useEffect } from 'react';
import {
  Download,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Smartphone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Volume2
} from 'lucide-react';

interface InstallHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstalled?: () => void;
}

export const InstallHelpModal: React.FC<InstallHelpModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled,
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect standalone mode
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleNativeInstallClick = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          if (onInstalled) onInstalled();
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      } finally {
        setIsInstalling(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Instalar no Celular</h3>
              <p className="text-[11px] text-slate-400">Uso no navegador com segundo plano</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Native Install Button if browser supports it */}
          {deferredPrompt && !isInstalled ? (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 flex flex-col gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 mx-auto shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-white text-base">Instalar com 1 Toque</h4>
                <p className="text-slate-300 text-xs mt-1">
                  Seu navegador permite instalar o aplicativo diretamente agora mesmo!
                </p>
              </div>
              <button
                onClick={handleNativeInstallClick}
                disabled={isInstalling}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalling ? 'Instalando...' : 'Instalar Agora'}</span>
              </button>
            </div>
          ) : isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-white">Aplicativo já Instalado!</h4>
                <p className="text-slate-400 text-[11px]">
                  Você já está usando o aplicativo em tela cheia com suporte a segundo plano ativo.
                </p>
              </div>
            </div>
          ) : null}

          {/* Android Chrome Step-by-Step */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Smartphone className="w-4 h-4" />
              <span className="text-white font-semibold">Como instalar no Android (Google Chrome):</span>
            </div>
            
            <ol className="space-y-2.5 text-slate-300 text-xs pl-1">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</span>
                <span>Toque no botão de <strong>3 pontinhos (⋮)</strong> no canto superior direito do Chrome.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</span>
                <span>Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">3</span>
                <span>Confirme em <strong>"Instalar"</strong>. O ícone aparecerá junto aos seus outros aplicativos!</span>
              </li>
            </ol>
          </div>

          {/* Background Running Guide */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Volume2 className="w-4 h-4" />
              <span className="text-white font-semibold">Como funciona o Segundo Plano:</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              O RitmoInterval possui um sistema de <strong>áudio contínuo e bloqueio de tela ativo</strong>. Quando você inicia uma corrida ou treino intervalado:
            </p>
            <ul className="space-y-1.5 text-slate-400 text-[11px] pl-1">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>A tela <strong>não apaga sozinha</strong> durante o treino (WakeLock).</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Se você bloquear o celular ou colocar no bolso, os <strong>apitos e voz continuam tocando</strong>.</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Aparecem controles na tela de bloqueio para pausar e avançar etapas.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
