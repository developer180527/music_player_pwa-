import React from 'react';
import { Play, Pause, SkipForward, Music2, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { Song, AccentColor } from '../types';
import { ACCENT_COLORS } from '../constants';

interface MiniPlayerProps {
  song: Song;
  isPlaying: boolean;
  progress: number;
  duration: number;
  accentColor: AccentColor;
  isGlassEnabled: boolean;
  isTintEnabled: boolean;
  onOpen: () => void;
  onPlayPause: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
}

const springConfig = { type: "spring", damping: 30, stiffness: 300, mass: 1 };

export function MiniPlayer({
  song,
  isPlaying,
  progress,
  duration,
  accentColor,
  isGlassEnabled,
  isTintEnabled,
  onOpen,
  onPlayPause,
  onNext
}: MiniPlayerProps) {
  return (
    <motion.div 
      layoutId="player-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={springConfig}
      onClick={onOpen}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.7, bottom: 0 }}
      onDragEnd={(e, info) => {
        if (info.offset.y < -50 || info.velocity.y < -500) {
          onOpen();
        }
      }}
      className={`fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm rounded-full p-2 pr-4 flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] border cursor-pointer z-50 group overflow-hidden transition-all duration-500 ${
        isGlassEnabled 
          ? 'bg-white/20 dark:bg-black/20 backdrop-blur-[40px] backdrop-saturate-[250%] border-white/30 dark:border-white/10' 
          : isTintEnabled 
            ? `${ACCENT_COLORS[accentColor].bgLight} border-zinc-200 dark:border-zinc-800`
            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
      }`}
      style={{ 
        bottom: 'calc(env(safe-area-inset-bottom) * 0.5 + 76px)',
        borderRadius: 9999
      }}
    >
      <motion.div 
        layoutId="artwork" 
        transition={springConfig} 
        className="relative w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0 shadow-sm border border-black/5 dark:border-white/5"
      >
        {song.coverUrl ? (
          <img 
            src={song.coverUrl} 
            alt="cover" 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600 ${song.coverUrl ? 'hidden' : ''}`}>
          {song.isRadio ? <Radio size={20} /> : <Music2 size={20} />}
        </div>
      </motion.div>
      <motion.div layoutId="text-container" transition={springConfig} className="flex flex-col justify-center flex-1 min-w-0">
        <motion.h2 layoutId="title" transition={springConfig} className="font-semibold text-[15px] truncate w-full">{song.title}</motion.h2>
        <motion.p layoutId="artist" transition={springConfig} className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate w-full">{song.artist}</motion.p>
      </motion.div>
      <div className="flex items-center gap-2 pr-1">
        <button 
          onClick={onPlayPause}
          className={`w-10 h-10 flex items-center justify-center rounded-full ${ACCENT_COLORS[accentColor].bgLight} ${ACCENT_COLORS[accentColor].text} transition-transform active:scale-90`}
        >
          {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-1" />}
        </button>
        <button 
          onClick={onNext}
          className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:white/10 transition-transform active:scale-90"
        >
          <SkipForward size={20} className="fill-current" />
        </button>
      </div>
      {!song.isRadio && (
        <div className="absolute bottom-0 left-12 right-12 h-[2px] bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full overflow-hidden">
          <div 
            className={`h-full ${ACCENT_COLORS[accentColor].bg} transition-all duration-100 ease-linear`}
            style={{ width: `${(progress / (duration || 1)) * 100}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
