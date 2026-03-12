/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import * as mm from 'music-metadata';
import { Play, Pause, SkipForward, SkipBack, Music2, Search, Library, ChevronDown, FolderOpen, Settings, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Song {
  file: File;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  duration: number;
}

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'library' | 'search' | 'settings'>('library');
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Apply theme class
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => playNext();
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update media session and audio source when current song changes
  useEffect(() => {
    if (currentSongIndex === null || !audioRef.current || !songs[currentSongIndex]) return;

    const song = songs[currentSongIndex];
    const objectUrl = URL.createObjectURL(song.file);
    
    audioRef.current.src = objectUrl;
    audioRef.current.play().catch(console.error);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album,
        artwork: song.coverUrl ? [
          { src: song.coverUrl, sizes: '512x512', type: 'image/png' }
        ] : []
      });

      navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
      navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    }

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [currentSongIndex, songs]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files).filter(f => {
      const name = f.name.toLowerCase();
      return f.type.startsWith('audio/') || 
             f.type === 'video/webm' || 
             name.endsWith('.webm') ||
             name.endsWith('.mp3') ||
             name.endsWith('.m4a') ||
             name.endsWith('.wav') ||
             name.endsWith('.aac') ||
             name.endsWith('.ogg') ||
             name.endsWith('.flac');
    });
    const parsedSongs: Song[] = [];

    for (const file of files) {
      try {
        const metadata = await mm.parseBlob(file);
        let coverUrl = '';
        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const picture = metadata.common.picture[0];
          const blob = new Blob([picture.data], { type: picture.format });
          coverUrl = URL.createObjectURL(blob);
        }
        parsedSongs.push({
          file,
          title: metadata.common.title || file.name.replace(/\.[^/.]+$/, ""),
          artist: metadata.common.artist || 'Unknown Artist',
          album: metadata.common.album || 'Unknown Album',
          coverUrl,
          duration: metadata.format.duration || 0,
        });
      } catch (error) {
        console.error('Error parsing metadata for', file.name, error);
        parsedSongs.push({
          file,
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: 'Unknown Artist',
          album: 'Unknown Album',
          coverUrl: '',
          duration: 0,
        });
      }
    }

    setSongs(prev => [...prev, ...parsedSongs]);
  };

  const togglePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const playNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (songs.length === 0) return;
    setCurrentSongIndex(prev => {
      if (prev === null) return 0;
      return (prev + 1) % songs.length;
    });
  };

  const playPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (songs.length === 0) return;
    setCurrentSongIndex(prev => {
      if (prev === null) return 0;
      return (prev - 1 + songs.length) % songs.length;
    });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSong = currentSongIndex !== null ? songs[currentSongIndex] : null;

  const filteredSongs = songs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full w-full bg-white dark:bg-black text-zinc-900 dark:text-white flex flex-col relative overflow-hidden transition-colors duration-300">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-40 px-6 pt-12">
        {activeTab === 'library' && (
          <div className="space-y-8">
            <div className="flex justify-between items-end">
              <h1 className="text-4xl font-bold tracking-tight">Library</h1>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-rose-500 font-medium flex items-center gap-1.5 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <Plus size={20} />
                  <span className="hidden sm:inline">Add </span>Files
                </button>
                <button 
                  onClick={() => folderInputRef.current?.click()}
                  className="hidden sm:flex text-rose-500 font-medium items-center gap-1.5 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <FolderOpen size={20} />
                  Add Folder
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                multiple 
                accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,.webm"
              />
              {/* @ts-ignore - webkitdirectory is non-standard but widely supported */}
              <input 
                type="file" 
                ref={folderInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                multiple 
                accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,.webm"
                webkitdirectory="true"
              />
            </div>

            {songs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-400 dark:text-zinc-500 space-y-4">
                <Music2 size={48} className="opacity-50" />
                <p className="text-lg">No music found. Add a folder to start.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {songs.map((song, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setCurrentSongIndex(idx)}
                    className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors ${currentSongIndex === idx ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 shadow-md">
                      {song.coverUrl ? (
                        <img src={song.coverUrl} alt="cover" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600">
                          <Music2 size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold truncate ${currentSongIndex === idx ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                        {song.title}
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm truncate">{song.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tight">Search</h1>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                type="text" 
                placeholder="Artists, Songs, or Albums" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
              />
            </div>
            
            <div className="space-y-4 mt-8">
              {filteredSongs.map((song, idx) => {
                const originalIdx = songs.indexOf(song);
                return (
                  <div 
                    key={idx} 
                    onClick={() => setCurrentSongIndex(originalIdx)}
                    className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors ${currentSongIndex === originalIdx ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0 shadow-md">
                      {song.coverUrl ? (
                        <img src={song.coverUrl} alt="cover" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600">
                          <Music2 size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold truncate ${currentSongIndex === originalIdx ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                        {song.title}
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm truncate">{song.artist}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
            
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-2">Appearance</h2>
              <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <span className="font-medium">Dark Mode</span>
                  <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={`w-12 h-7 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-rose-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  >
                    <motion.div 
                      className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm"
                      animate={{ left: theme === 'dark' ? '1.75rem' : '0.25rem' }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mini Player */}
      <AnimatePresence>
        {currentSong && !isNowPlayingOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={() => setIsNowPlayingOpen(true)}
            className="fixed bottom-24 left-4 right-4 bg-white/90 dark:bg-zinc-800/95 backdrop-blur-xl rounded-2xl p-2 flex items-center gap-3 shadow-2xl border border-black/5 dark:border-white/5 cursor-pointer z-40 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-700 overflow-hidden flex-shrink-0 shadow-sm">
              {currentSong.coverUrl ? (
                <img src={currentSong.coverUrl} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                  <Music2 size={20} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate text-zinc-900 dark:text-white">{currentSong.title}</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs truncate">{currentSong.artist}</p>
            </div>
            <div className="flex items-center gap-4 pr-4">
              <button onClick={togglePlayPause} className="text-zinc-900 dark:text-white hover:scale-110 transition-transform">
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              </button>
              <button onClick={playNext} className="text-zinc-900 dark:text-white hover:scale-110 transition-transform">
                <SkipForward size={24} fill="currentColor" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-full px-8 py-4 flex gap-10 items-center border border-black/5 dark:border-white/10 shadow-2xl z-30 transition-colors">
        <button 
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'library' ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
        >
          <Library size={24} />
          <span className="text-[10px] font-medium">Library</span>
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'search' ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
        >
          <Search size={24} />
          <span className="text-[10px] font-medium">Search</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
        >
          <Settings size={24} />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>

      {/* Full Screen Now Playing */}
      <AnimatePresence>
        {isNowPlayingOpen && currentSong && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-white dark:bg-zinc-900 flex flex-col transition-colors"
          >
            {/* Blurred Background */}
            {currentSong.coverUrl && (
              <div 
                className="absolute inset-0 opacity-30 dark:opacity-40 blur-3xl scale-110 pointer-events-none"
                style={{
                  backgroundImage: `url(${currentSong.coverUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/80 to-white dark:from-black/40 dark:via-black/80 dark:to-black pointer-events-none transition-colors" />

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full px-8 py-12">
              <button 
                onClick={() => setIsNowPlayingOpen(false)}
                className="self-center p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <ChevronDown size={32} />
              </button>

              <div className="flex-1 flex flex-col justify-center items-center mt-8">
                <motion.div 
                  className="w-full max-w-[320px] aspect-square rounded-3xl bg-zinc-200 dark:bg-zinc-800 shadow-2xl overflow-hidden mb-12"
                  animate={{ scale: isPlaying ? 1 : 0.95 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                >
                  {currentSong.coverUrl ? (
                    <img src={currentSong.coverUrl} alt="cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600">
                      <Music2 size={80} />
                    </div>
                  )}
                </motion.div>

                <div className="w-full max-w-[400px]">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold truncate text-zinc-900 dark:text-white">{currentSong.title}</h2>
                    <p className="text-lg text-rose-500 dark:text-rose-400 truncate mt-1">{currentSong.artist}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-12">
                    <input 
                      type="range" 
                      min={0} 
                      max={duration || 100} 
                      value={progress}
                      onChange={handleSeek}
                      className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-zinc-900 dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-mono">
                      <span>{formatTime(progress)}</span>
                      <span>-{formatTime(duration - progress)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-12">
                    <button onClick={playPrev} className="text-zinc-900 dark:text-white hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
                      <SkipBack size={40} fill="currentColor" />
                    </button>
                    <button 
                      onClick={togglePlayPause} 
                      className="w-20 h-20 flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full hover:scale-105 transition-transform shadow-xl"
                    >
                      {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-2" />}
                    </button>
                    <button onClick={playNext} className="text-zinc-900 dark:text-white hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
                      <SkipForward size={40} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
