import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Smartphone,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  X,
  Play,
  Terminal,
  Zap,
  Download,
  Share2,
} from 'lucide-react';

interface TestOnPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestOnPhoneModal: React.FC<TestOnPhoneModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'instant' | 'android_studio'>('instant');
  const [copied, setCopied] = useState(false);

  // Current active live URL of this application
  const liveDevUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-dev-v3vfpfgc4c32ifu4jacifz-134845554511.us-west1.run.app';

  const sharedPreUrl = liveDevUrl.replace('-dev-', '-pre-');

  // Default to the active live server URL so it never 404s
  const [selectedUrlType, setSelectedUrlType] = useState<'dev' | 'share'>('dev');
  const activeUrl = selectedUrlType === 'dev' ? liveDevUrl : sharedPreUrl;

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Como Testar no Seu Celular</h3>
              <p className="text-xs text-slate-400">Escolha como você prefere testar o aplicativo</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('instant')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'instant'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Método 1: Imediato (QR Code / Navegador)</span>
          </button>

          <button
            onClick={() => setActiveTab('android_studio')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'android_studio'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Método 2: Android Studio (APK Nativo)</span>
          </button>
        </div>

        {/* TAB 1: INSTANT VIA QR CODE & PWA */}
        {activeTab === 'instant' && (
          <div className="space-y-4">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              {/* QR Code */}
              <div className="p-3 bg-white rounded-2xl shadow-xl flex-shrink-0 flex items-center justify-center">
                <QRCodeSVG
                  value={activeUrl}
                  size={150}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Instructions */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-start">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Servidor Ativo Agora
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  Aponte a câmera do seu celular para o QR Code
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  O app abrirá no navegador do celular com <strong>GPS real</strong>, <strong>bips sonoros</strong> e <strong>voz em português</strong> funcionando imediatamente.
                </p>

                {/* Display Current URL */}
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-400 break-all select-all">
                  {activeUrl}
                </div>

                <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Link Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Link do App</span>
                      </>
                    )}
                  </button>

                  <a
                    href={activeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir em Nova Aba</span>
                  </a>
                </div>
              </div>
            </div>

            {/* How to install on home screen */}
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Como instalar como Aplicativo no Celular (Sem Loja):
              </span>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Abra o link no navegador <strong>Google Chrome</strong> do seu celular Android.</li>
                <li>Toque no menu de <strong>três pontinhos (⋮)</strong> no canto superior direito do Chrome.</li>
                <li>Selecione <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong>.</li>
                <li>O ícone do <strong>RitmoInterval</strong> aparecerá na grade de aplicativos do seu celular como um app independente!</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 2: ANDROID STUDIO & APK */}
        {activeTab === 'android_studio' && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <span className="font-bold text-white text-sm">Abra o Android Studio</span>
              </div>
              <p className="text-slate-400 pl-8">
                Crie um novo projeto escolhendo o modelo <strong>"Empty Activity"</strong> (Jetpack Compose), pacote <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">com.ritmointerval.app</code> e linguagem <strong>Kotlin</strong>.
              </p>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <span className="font-bold text-white text-sm">Copie os Arquivos Prontos</span>
              </div>
              <p className="text-slate-400 pl-8">
                Vá na aba <strong>"Código Kotlin"</strong> no topo deste painel. Você encontrará todos os arquivos organizados para copiar com 1 clique:
                <br />
                • <code className="text-white">WorkoutModels.kt</code> (data/model)
                <br />
                • <code className="text-white">WorkoutRunnerService.kt</code> (service)
                <br />
                • <code className="text-white">WorkoutBuilderScreen.kt</code> & <code className="text-white">WorkoutRunnerScreen.kt</code> (ui/screens)
                <br />
                • <code className="text-white">AndroidManifest.xml</code> & <code className="text-white">build.gradle.kts</code>
              </p>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <span className="font-bold text-white text-sm">Ative a Depuração USB no Celular</span>
              </div>
              <p className="text-slate-400 pl-8">
                No seu celular Android, vá em <em>Configurações &gt; Sobre o Telefone &gt; Toque 7 vezes em "Número da Versão"</em> para ativar o <strong>Modo Desenvolvedor</strong>. Em seguida, ative a <strong>Depuração USB</strong>.
              </p>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  4
                </span>
                <span className="font-bold text-white text-sm">Conecte o Cabo USB e Clique em Run</span>
              </div>
              <p className="text-slate-400 pl-8">
                Conecte o celular ao computador. O modelo do seu telefone aparecerá na barra superior do Android Studio. Pressione <strong>Shift + F10 (Run)</strong> para compilar e instalar o app nativo diretamente nele!
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
