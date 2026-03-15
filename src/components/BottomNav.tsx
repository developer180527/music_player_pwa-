import React from 'react';
import { Library, Search, Settings } from 'lucide-react';
import { AccentColor } from '../types';
import { ACCENT_COLORS } from '../constants';

interface BottomNavProps {
  activeTab: 'library' | 'search' | 'settings';
  accentColor: AccentColor;
  onTabChange: (tab: 'library' | 'search' | 'settings') => void;
}

export function BottomNav({ activeTab, accentColor, onTabChange }: BottomNavProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#fcfcfc]/80 dark:bg-black/80 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50 pb-safe pt-2 px-6 flex justify-around items-center z-40">
      <button 
        onClick={() => onTabChange('library')}
        className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'library' ? ACCENT_COLORS[accentColor].text : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
      >
        <Library size={24} strokeWidth={activeTab === 'library' ? 2.5 : 2} />
        <span className="text-[10px] font-medium">Library</span>
      </button>
      <button 
        onClick={() => onTabChange('search')}
        className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'search' ? ACCENT_COLORS[accentColor].text : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
      >
        <Search size={24} strokeWidth={activeTab === 'search' ? 2.5 : 2} />
        <span className="text-[10px] font-medium">Search</span>
      </button>
      <button 
        onClick={() => onTabChange('settings')}
        className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'settings' ? ACCENT_COLORS[accentColor].text : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
      >
        <Settings size={24} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
        <span className="text-[10px] font-medium">Settings</span>
      </button>
    </div>
  );
}
