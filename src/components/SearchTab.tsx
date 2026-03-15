import React from 'react';
import { Search, Music2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Song, AccentColor } from '../types';
import { ACCENT_COLORS } from '../constants';

interface SearchTabProps {
  songs: Song[];
  searchQuery: string;
  currentSongIndex: number | null;
  accentColor: AccentColor;
  onSearchChange: (query: string) => void;
  onSongSelect: (index: number) => void;
}

export function SearchTab({
  songs,
  searchQuery,
  currentSongIndex,
  accentColor,
  onSearchChange,
  onSongSelect
}: SearchTabProps) {
  const filteredSongs = songs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.album.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <h1 className="text-4xl font-bold tracking-tight">Search</h1>
      
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <input 
          type="text" 
          placeholder="Songs, artists, or albums" 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full bg-white dark:bg-zinc-900 rounded-2xl py-4 pl-12 pr-4 text-[17px] font-medium placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none shadow-sm border border-zinc-100 dark:border-zinc-800/50 transition-shadow ${ACCENT_COLORS[accentColor].ring} focus:ring-2`}
        />
      </div>

      {searchQuery && (
        <div className="space-y-2">
          {filteredSongs.length > 0 ? (
            filteredSongs.map((song, idx) => {
              const originalIndex = songs.findIndex(s => s === song);
              const isCurrent = currentSongIndex === originalIndex;
              return (
                <div 
                  key={idx} 
                  onClick={() => onSongSelect(originalIndex)}
                  className={`group flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.98] ${isCurrent ? 'bg-zinc-100 dark:bg-white/10' : 'hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                >
                  <div className="relative w-14 h-14 rounded-xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                    {song.coverUrl ? (
                      <img src={song.coverUrl} alt="cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600">
                        <Music2 size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-[17px] truncate ${isCurrent ? ACCENT_COLORS[accentColor].text : 'text-zinc-900 dark:text-white'}`}>
                      {song.title}
                    </h3>
                    <p className="text-[14px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{song.artist}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-zinc-500 dark:text-zinc-400 mt-12 text-[17px]">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
