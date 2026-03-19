import React from 'react';
import { motion } from 'motion/react';
import { AccentColor } from '../types';
import { ACCENT_COLORS } from '../constants';

interface SettingsTabProps {
  theme: 'dark' | 'light';
  accentColor: AccentColor;
  keepScreenOn: boolean;
  requireAuth: boolean;
  authSupported: boolean;
  inIframe: boolean;
  onThemeChange: (theme: 'dark' | 'light') => void;
  onAccentColorChange: (color: AccentColor) => void;
  onKeepScreenOnChange: (keep: boolean) => void;
  onRequireAuthToggle: () => void;
}

export function SettingsTab({
  theme,
  accentColor,
  keepScreenOn,
  requireAuth,
  authSupported,
  inIframe,
  onThemeChange,
  onAccentColorChange,
  onKeepScreenOnChange,
  onRequireAuthToggle
}: SettingsTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-8"
    >
      <div className="fixed top-0 left-0 right-0 z-30 bg-[#fcfcfc]/70 dark:bg-black/60 backdrop-blur-xl backdrop-saturate-200 border-b border-white/40 dark:border-white/10 pt-[calc(env(safe-area-inset-top)+16px)] pb-4 px-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>
      
      <div className="px-6 space-y-8 pt-[calc(env(safe-area-inset-top)+104px)]">
      <div className="space-y-4">
        <h2 className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-4">Appearance</h2>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800/50 divide-y divide-zinc-100 dark:divide-zinc-800/50">
          <div className="flex items-center justify-between p-4 px-5">
            <span className="font-medium text-[17px]">Dark Mode</span>
            <button 
              onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
              className={`w-[50px] h-[30px] rounded-full transition-colors relative shadow-inner ${theme === 'dark' ? ACCENT_COLORS[accentColor].bg : 'bg-zinc-200 dark:bg-zinc-700'}`}
            >
              <motion.div 
                className="w-[26px] h-[26px] bg-white rounded-full absolute top-[2px] shadow-sm border border-black/5"
                animate={{ left: theme === 'dark' ? '22px' : '2px' }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
          <div className="flex flex-col p-4 px-5 gap-4">
            <span className="font-medium text-[17px]">Accent Color</span>
            <div className="flex items-center gap-3">
              {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((color) => (
                <button
                  key={color}
                  onClick={() => onAccentColorChange(color)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90 ${ACCENT_COLORS[color].bg} ${accentColor === color ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-zinc-400 dark:ring-zinc-500' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-8">
        <h2 className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-4">Utility</h2>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center justify-between p-4 px-5">
            <div className="flex flex-col">
              <span className="font-medium text-[17px]">Keep Screen On</span>
              <span className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">Only when music is playing</span>
            </div>
            <button 
              onClick={() => onKeepScreenOnChange(!keepScreenOn)}
              className={`w-[50px] h-[30px] rounded-full transition-colors relative shadow-inner flex-shrink-0 ml-4 ${keepScreenOn ? ACCENT_COLORS[accentColor].bg : 'bg-zinc-200 dark:bg-zinc-700'}`}
            >
              <motion.div 
                className="w-[26px] h-[26px] bg-white rounded-full absolute top-[2px] shadow-sm border border-black/5"
                animate={{ left: keepScreenOn ? '22px' : '2px' }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-8">
        <h2 className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-4">Security</h2>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center justify-between p-4 px-5">
            <div className="flex flex-col">
              <span className="font-medium text-[17px]">Require Authentication to open app</span>
              <span className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">FaceID, TouchID, or Passcode</span>
            </div>
            <button 
              onClick={onRequireAuthToggle}
              disabled={!authSupported || (inIframe && !requireAuth)}
              className={`w-[50px] h-[30px] rounded-full transition-colors relative shadow-inner flex-shrink-0 ml-4 ${requireAuth ? ACCENT_COLORS[accentColor].bg : 'bg-zinc-200 dark:bg-zinc-700'} ${(!authSupported || (inIframe && !requireAuth)) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <motion.div 
                className="w-[26px] h-[26px] bg-white rounded-full absolute top-[2px] shadow-sm border border-black/5"
                animate={{ left: requireAuth ? '22px' : '2px' }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
          {!authSupported ? (
            <div className={`px-5 pb-4 text-[13px] ${ACCENT_COLORS[accentColor].text}`}>
              Biometric authentication is not supported on this device or browser.
            </div>
          ) : (inIframe && !requireAuth) ? (
            <div className="px-5 pb-4 text-[13px] text-amber-500 dark:text-amber-400">
              Please open the app in a new tab to enable this feature (iframe restricted).
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </motion.div>
  );
}
