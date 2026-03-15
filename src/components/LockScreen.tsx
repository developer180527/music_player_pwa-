import React from 'react';
import { Lock } from 'lucide-react';
import { AccentColor } from '../types';
import { ACCENT_COLORS } from '../constants';

interface LockScreenProps {
  accentColor: AccentColor;
  authError: string;
  onUnlock: () => void;
}

export function LockScreen({ accentColor, authError, onUnlock }: LockScreenProps) {
  return (
    <div className="h-full w-full bg-[#fcfcfc] dark:bg-black text-zinc-900 dark:text-white flex flex-col items-center justify-center p-6">
      <div className={`w-24 h-24 rounded-full ${ACCENT_COLORS[accentColor].bgLight} flex items-center justify-center mb-8 shadow-inner`}>
        <Lock size={40} className={ACCENT_COLORS[accentColor].text} />
      </div>
      <h1 className="text-3xl font-bold mb-3 tracking-tight">App Locked</h1>
      <p className="text-zinc-500 dark:text-zinc-400 text-center mb-10 text-[17px]">
        Authentication is required to open this app.
      </p>
      {authError && <p className={`${ACCENT_COLORS[accentColor].text} mb-6 font-medium`}>{authError}</p>}
      <button 
        onClick={onUnlock}
        className={`${ACCENT_COLORS[accentColor].bg} text-white px-10 py-4 rounded-full font-semibold text-[17px] ${ACCENT_COLORS[accentColor].bgHover} active:scale-95 transition-all ${ACCENT_COLORS[accentColor].shadow}`}
      >
        Unlock App
      </button>
    </div>
  );
}
