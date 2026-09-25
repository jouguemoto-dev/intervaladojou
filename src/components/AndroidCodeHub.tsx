import React, { useState } from 'react';
import { ANDROID_CODE_FILES, AndroidCodeFile } from '../data/androidSourceCode';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  BookOpen,
  Layers,
  Cpu,
  Database,
  Smartphone,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';

interface AndroidCodeHubProps {
  onBack?: () => void;
}

export const AndroidCodeHub: React.FC<AndroidCodeHubProps> = ({ onBack }) => {
  const [selectedFileId, setSelectedFileId] = useState<string>(ANDROID_CODE_FILES[0].id);
  const [copied, setCopied] = useState(false);

  const activeFile =
    ANDROID_CODE_FILES.find((f) => f.id === selectedFileId) || ANDROID_CODE_FILES[0];

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadFile = () => {
    const blob = new Blob([activeFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getCategoryIcon = (category: AndroidCodeFile['category']) => {
    switch (category) {
      case 'models':
        return <Cpu className="w-4 h-4 text-amber-400" />;
      case 'database':
        return <Database className="w-4 h-4 text-emerald-400" />;
      case 'viewmodel':
        return <Layers className="w-4 h-4 text-blue-400" />;
      case 'service':
        return <Terminal className="w-4 h-4 text-rose-400" />;
      case 'ui':
        return <Smartphone className="w-4 h-4 text-purple-400" />;
      case 'config':
        return <FileCode className="w-4 h-4 text-cyan-400" />;
      case 'guide':
        return <BookOpen className="w-4 h-4 text-teal-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Banner */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 sm:p-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer mt-0.5"
                title="Voltar aos treinos"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  Código Nativo Android
                </span>
                <span className="text-xs text-slate-400">· Kotlin 1.9+ & Jetpack Compose</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Arquitetura e Entregáveis Android Studio
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Todos os arquivos Kotlin, Room Database, Foreground Service e Manifesto prontos para importar e rodar no seu celular.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Copiar Arquivo Atual</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-emerald-950"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar .{activeFile.filename.split('.').pop()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Columns Layout: Sidebar Tabs + Code Viewer */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-6xl mx-auto w-full">
        {/* Left Sidebar File List */}
        <div className="w-full md:w-72 bg-slate-900/60 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto p-3 space-y-1.5 flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
            Arquivos do Projeto ({ANDROID_CODE_FILES.length})
          </span>

          {ANDROID_CODE_FILES.map((file) => {
            const isSelected = file.id === selectedFileId;
            return (
              <button
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2.5 ${
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                {getCategoryIcon(file.category)}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono">{file.filename}</div>
                  <div className="text-[10px] text-slate-400 truncate">{file.title}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Code Display Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {/* File Header */}
          <div className="bg-slate-900/40 border-b border-slate-800/80 p-3 sm:p-4 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white">
                  {activeFile.filename}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {activeFile.language}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{activeFile.description}</p>
            </div>
          </div>

          {/* Code Container */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 bg-slate-950 leading-relaxed selection:bg-emerald-500/30 selection:text-white">
            <pre className="whitespace-pre">
              <code>{activeFile.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
