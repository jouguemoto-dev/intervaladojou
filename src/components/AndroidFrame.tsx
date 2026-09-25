import React, { useState } from 'react';
import { Smartphone, Monitor, Wifi, Battery, Signal } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({ children }) => {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'fluid'>(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth <= 768 || 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      return isMobile ? 'fluid' : 'mobile';
    }
    return 'mobile';
  });

  // Current simulated time for status bar
  const currentTime = '08:45';

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden font-sans">
      {/* Top Device Switcher Toolbar */}
      <header className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">
            RitmoInterval • Simulador Android
          </span>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              deviceMode === 'mobile'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Google Pixel 8</span>
          </button>
          <button
            onClick={() => setDeviceMode('fluid')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              deviceMode === 'fluid'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Tela Cheia</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-0 sm:p-4 bg-slate-950 overflow-hidden">
        {deviceMode === 'mobile' ? (
          // Realistic Android Phone Chassis
          <div className="relative w-full max-w-[430px] h-full sm:max-h-[880px] bg-black sm:rounded-[48px] border-0 sm:border-[10px] sm:border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden sm:ring-1 sm:ring-slate-700/60">
            {/* Android Status Bar */}
            <div className="h-9 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between text-white text-[11px] font-semibold select-none flex-shrink-0 z-40 border-b border-white/5">
              <span>{currentTime}</span>

              {/* Camera punch hole cutout */}
              <div className="w-3.5 h-3.5 bg-black rounded-full border border-slate-800 shadow-inner" />

              <div className="flex items-center gap-1.5 text-slate-300">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Simulated App Viewport */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
              {children}
            </div>

            {/* Android Navigation Gesture Pill */}
            <div className="h-5 bg-slate-950 flex items-center justify-center flex-shrink-0 z-40">
              <div className="w-32 h-1 bg-slate-600 rounded-full" />
            </div>
          </div>
        ) : (
          // Fluid Fullscreen
          <div className="w-full h-full flex flex-col overflow-hidden">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
