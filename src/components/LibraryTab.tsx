import React from 'react';
import { Plus, FolderOpen, Search, Music2, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { Song, AccentColor } from '../types';
import { ACCENT_COLORS } from '../constants';

interface LibraryTabProps {
  songs: Song[];
  currentSongIndex: number | null;
  isScanning: boolean;
  accentColor: AccentColor;
  fileInputRef: React.RefObject<HTMLInputElement>;
  folderInputRef: React.RefObject<HTMLInputElement>;
  onSongSelect: (index: number) => void;
  onAddFiles: () => void;
  onAddFolder: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isIpodMode?: boolean;
}

export function LibraryTab({
  songs,
  currentSongIndex,
  isScanning,
  accentColor,
  fileInputRef,
  folderInputRef,
  onSongSelect,
  onAddFiles,
  onAddFolder,
  onFileSelect,
  isIpodMode
}: LibraryTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-8"
    >
      <div className={`sticky top-0 left-0 right-0 z-30 bg-[#fcfcfc]/70 dark:bg-black/60 backdrop-blur-2xl backdrop-saturate-200 px-6 ${isIpodMode ? 'pt-4' : 'pt-[calc(env(safe-area-inset-top)+24px)]'} pb-4 flex justify-between items-end border-b border-zinc-200/50 dark:border-white/10 -mx-6 mb-8`}>
        <h1 className="text-4xl font-bold tracking-tight">Library</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={onAddFiles}
            className={`${ACCENT_COLORS[accentColor].text} font-semibold flex items-center gap-1.5 ${ACCENT_COLORS[accentColor].textHover} transition-colors active:scale-95`}
          >
            <Plus size={20} strokeWidth={2.5} />
            <span className="hidden sm:inline">Add </span>Music
          </button>
          <button 
            onClick={onAddFolder}
            className={`hidden sm:flex ${ACCENT_COLORS[accentColor].text} font-semibold items-center gap-1.5 ${ACCENT_COLORS[accentColor].textHover} transition-colors active:scale-95`}
          >
            <FolderOpen size={20} strokeWidth={2.5} />
            Add Folder
          </button>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onFileSelect} 
          className="hidden" 
          multiple 
          accept=".mp3,.wav,.m4a,.aac,.ogg,.flac"
        />
        {/* @ts-ignore - webkitdirectory is non-standard but widely supported */}
        <input 
          type="file" 
          ref={folderInputRef} 
          onChange={onFileSelect} 
          className="hidden" 
          multiple 
          accept=".mp3,.wav,.m4a,.aac,.ogg,.flac"
          webkitdirectory="true"
        />
      </div>

      <div className="px-6 space-y-8">

      {isScanning ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-400 dark:text-zinc-500 space-y-4">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shadow-inner animate-pulse">
            <Search size={32} className="opacity-50 animate-spin" />
          </div>
          <p className="text-lg font-medium">Scanning library...</p>
        </div>
      ) : songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-400 dark:text-zinc-500 space-y-4">
          <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shadow-inner">
            <Music2 size={32} className="opacity-50" />
          </div>
          <p className="text-lg font-medium">No music found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {songs.map((song, idx) => {
            const isCurrent = currentSongIndex === idx;
            return (
              <div 
                key={idx} 
                onClick={() => onSongSelect(idx)}
                className={`group flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.98] ${isCurrent ? 'bg-zinc-100 dark:bg-white/10' : 'hover:bg-zinc-50 dark:hover:bg-white/5'}`}
              >
                <div className="relative w-14 h-14 rounded-xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
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
                    {song.isRadio ? <Radio size={24} /> : <Music2 size={24} />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-[17px] truncate ${isCurrent ? ACCENT_COLORS[accentColor].text : 'text-zinc-900 dark:text-white'}`}>
                    {song.title}
                  </h3>
                  <p className="text-[14px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{song.artist}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </motion.div>
  );
}
