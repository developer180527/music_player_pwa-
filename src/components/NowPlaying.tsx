import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Music2, ChevronDown, Shuffle, Repeat, Repeat1, Volume, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Song, AccentColor } from '../types';
import { ACCENT_COLORS } from '../constants';
import { formatTime } from '../utils';

interface NowPlayingProps {
  song: Song;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: 'none' | 'all' | 'one';
  accentColor: AccentColor;
  onClose: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onShuffleToggle: () => void;
  onRepeatToggle: () => void;
}

export function NowPlaying({
  song,
  isPlaying,
  progress,
  duration,
  volume,
  isShuffle,
  repeatMode,
  accentColor,
  onClose,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onShuffleToggle,
  onRepeatToggle
}: NowPlayingProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-[#fcfcfc] dark:bg-black z-50 flex flex-col pt-safe pb-safe"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 transition-transform active:scale-90"
        >
          <ChevronDown size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-zinc-400 dark:text-zinc-500">Now Playing</span>
          <span className="text-[13px] font-medium">{song.album || 'Unknown Album'}</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        <div className="w-full aspect-square max-w-[320px] rounded-3xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden shadow-2xl mb-12 relative group">
          {song.coverUrl ? (
            <img src={song.coverUrl} alt="cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600">
              <Music2 size={80} strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="w-full flex flex-col items-start mb-8">
          <h2 className="text-2xl font-bold truncate w-full tracking-tight">{song.title}</h2>
          <p className={`text-lg ${ACCENT_COLORS[accentColor].text} truncate w-full font-medium`}>{song.artist}</p>
        </div>

        <div className="w-full space-y-2 mb-8">
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={progress} 
            onChange={onSeek}
            className={`w-full h-1.5 rounded-full appearance-none bg-zinc-200 dark:bg-zinc-800 outline-none ${ACCENT_COLORS[accentColor].bg} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:${ACCENT_COLORS[accentColor].bg} [&::-webkit-slider-thumb]:shadow-md`}
            style={{
              background: `linear-gradient(to right, var(--tw-gradient-stops))`,
              backgroundImage: `linear-gradient(to right, ${accentColor === 'rose' ? '#f43f5e' : accentColor === 'blue' ? '#3b82f6' : accentColor === 'emerald' ? '#10b981' : accentColor === 'violet' ? '#8b5cf6' : '#f59e0b'} ${(progress / (duration || 1)) * 100}%, transparent ${(progress / (duration || 1)) * 100}%)`
            }}
          />
          <div className="flex justify-between text-[12px] font-medium text-zinc-500 dark:text-zinc-400 font-mono">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="w-full flex items-center justify-between mb-8">
          <button 
            onClick={onShuffleToggle}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-transform active:scale-90 ${isShuffle ? ACCENT_COLORS[accentColor].text : 'text-zinc-400 dark:text-zinc-500'}`}
          >
            <Shuffle size={20} />
          </button>
          <button 
            onClick={onPrev}
            className="w-16 h-16 flex items-center justify-center rounded-full text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-transform active:scale-90"
          >
            <SkipBack size={32} className="fill-current" />
          </button>
          <button 
            onClick={onPlayPause}
            className={`w-20 h-20 flex items-center justify-center rounded-full ${ACCENT_COLORS[accentColor].bg} text-white transition-transform active:scale-95 ${ACCENT_COLORS[accentColor].shadow}`}
          >
            {isPlaying ? <Pause size={36} className="fill-current" /> : <Play size={36} className="fill-current ml-2" />}
          </button>
          <button 
            onClick={onNext}
            className="w-16 h-16 flex items-center justify-center rounded-full text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-transform active:scale-90"
          >
            <SkipForward size={32} className="fill-current" />
          </button>
          <button 
            onClick={onRepeatToggle}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-transform active:scale-90 ${repeatMode !== 'none' ? ACCENT_COLORS[accentColor].text : 'text-zinc-400 dark:text-zinc-500'}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>
        </div>

        <div className="w-full flex items-center gap-4 px-4">
          <Volume size={18} className="text-zinc-400 dark:text-zinc-500" />
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            value={volume} 
            onChange={onVolumeChange}
            className={`flex-1 h-1.5 rounded-full appearance-none bg-zinc-200 dark:bg-zinc-800 outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm`}
            style={{
              background: `linear-gradient(to right, var(--tw-gradient-stops))`,
              backgroundImage: `linear-gradient(to right, ${accentColor === 'rose' ? '#f43f5e' : accentColor === 'blue' ? '#3b82f6' : accentColor === 'emerald' ? '#10b981' : accentColor === 'violet' ? '#8b5cf6' : '#f59e0b'} ${volume * 100}%, transparent ${volume * 100}%)`
            }}
          />
          <Volume2 size={18} className="text-zinc-400 dark:text-zinc-500" />
        </div>
      </div>
    </motion.div>
  );
}
