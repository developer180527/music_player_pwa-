import React from 'react';
import { Play, Pause, SkipForward, Music2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Song, AccentColor } from '../types';
import { ACCENT_COLORS } from '../constants';

interface MiniPlayerProps {
  song: Song;
  isPlaying: boolean;
  progress: number;
  duration: number;
  accentColor: AccentColor;
  onOpen: () => void;
  onPlayPause: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
}

export function MiniPlayer({
  song,
  isPlaying,
  progress,
  duration,
  accentColor,
  onOpen,
  onPlayPause,
  onNext
}: MiniPlayerProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      onClick={onOpen}
      className="absolute bottom-[calc(env(safe-area-inset-bottom)+60px)] left-4 right-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl p-3 flex items-center gap-3 shadow-lg border border-zinc-200/50 dark:border-zinc-800/50 cursor-pointer z-50 group"
    >
      <div className="relative w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0 shadow-sm">
        {song.coverUrl ? (
          <img src={song.coverUrl} alt="cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600">
            <Music2 size={20} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[15px] truncate">{song.title}</h3>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate">{song.artist}</p>
      </div>
      <div className="flex items-center gap-2 pr-1">
        <button 
          onClick={onPlayPause}
          className={`w-10 h-10 flex items-center justify-center rounded-full ${ACCENT_COLORS[accentColor].bgLight} ${ACCENT_COLORS[accentColor].text} transition-transform active:scale-90`}
        >
          {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-1" />}
        </button>
        <button 
          onClick={onNext}
          className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-transform active:scale-90"
        >
          <SkipForward size={20} className="fill-current" />
        </button>
      </div>
      <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${ACCENT_COLORS[accentColor].bg} transition-all duration-100 ease-linear`}
          style={{ width: `${(progress / (duration || 1)) * 100}%` }}
        />
      </div>
    </motion.div>
  );
}
