/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import * as mm from 'music-metadata';
import { Play, Pause, SkipForward, SkipBack, Music2, Search, Library, ChevronDown, FolderOpen, Settings, Plus, Lock } from 'lucide-react';
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

  // Authentication state
  const [requireAuth, setRequireAuth] = useState(() => localStorage.getItem('requireAuth') === 'true');
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('requireAuth') === 'true');
  const [authSupported, setAuthSupported] = useState(false);
  const [authError, setAuthError] = useState('');

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

  const [inIframe, setInIframe] = useState(false);

  // Check if WebAuthn is supported
  useEffect(() => {
    try {
      setInIframe(window.self !== window.top);
    } catch (e) {
      setInIframe(true);
    }
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(setAuthSupported);
    }
  }, []);

  // Authentication handlers
  const handleUnlock = async () => {
    try {
      setAuthError('');
      
      if (window.self !== window.top) {
        setAuthError('Browser security prevents unlocking inside an iframe. Please open the app in a new tab.');
        return;
      }

      const credentialIdStr = localStorage.getItem('authCredentialId');
      if (!credentialIdStr) {
        setIsLocked(false);
        return;
      }

      const base64UrlDecode = (str: string) => {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      };

      const credentialId = base64UrlDecode(credentialIdStr);
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{
            type: "public-key",
            id: credentialId
          }],
          userVerification: "required",
          timeout: 60000
        }
      });
      setIsLocked(false);
    } catch (error) {
      console.error('Authentication failed', error);
      setAuthError('Authentication failed. Please try again.');
    }
  };

  const toggleAuth = async () => {
    if (requireAuth) {
      localStorage.removeItem('requireAuth');
      localStorage.removeItem('authCredentialId');
      setRequireAuth(false);
    } else {
      if (inIframe) {
        alert("Biometric authentication cannot be set up inside an iframe due to browser security restrictions. Please open the app in a new tab to enable this feature.");
        return;
      }
      try {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userId = crypto.getRandomValues(new Uint8Array(16));
        
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "Music Player", id: window.location.hostname },
            user: {
              id: userId,
              name: "user",
              displayName: "User"
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },
              { type: "public-key", alg: -257 }
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required"
            },
            timeout: 60000,
            attestation: "none"
          }
        }) as PublicKeyCredential;

        if (credential) {
          const base64UrlEncode = (buffer: ArrayBuffer) => {
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          };

          localStorage.setItem('authCredentialId', base64UrlEncode(credential.rawId));
          localStorage.setItem('requireAuth', 'true');
          setRequireAuth(true);
        }
      } catch (error) {
        console.error('Failed to setup authentication', error);
        alert('Failed to setup authentication. Your device might not support it or you cancelled the prompt.');
      }
    }
  };

  // Auto-prompt unlock on initial load if locked
  useEffect(() => {
    if (isLocked) {
      handleUnlock();
    }
  }, []);

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

  if (isLocked) {
    return (
      <div className="h-full w-full bg-[#fcfcfc] dark:bg-black text-zinc-900 dark:text-white flex flex-col items-center justify-center p-6 transition-colors duration-500">
        <div className="w-24 h-24 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center mb-8 shadow-inner">
          <Lock size={40} className="text-rose-500" />
        </div>
        <h1 className="text-3xl font-bold mb-3 tracking-tight">App Locked</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-center mb-10 text-[17px]">
          Authentication is required to open this app.
        </p>
        {authError && <p className="text-rose-500 mb-6 font-medium">{authError}</p>}
        <button 
          onClick={handleUnlock}
          className="bg-rose-500 text-white px-10 py-4 rounded-full font-semibold text-[17px] hover:bg-rose-600 active:scale-95 transition-all shadow-[0_8px_30px_rgba(244,63,94,0.3)]"
        >
          Unlock App
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#fcfcfc] dark:bg-black text-zinc-900 dark:text-white flex flex-col relative overflow-hidden transition-colors duration-500">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-40 px-6 pt-14">
        {activeTab === 'library' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-end">
              <h1 className="text-4xl font-bold tracking-tight">Library</h1>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-rose-500 font-semibold flex items-center gap-1.5 hover:text-rose-600 dark:hover:text-rose-400 transition-colors active:scale-95"
                >
                  <Plus size={20} strokeWidth={2.5} />
                  <span className="hidden sm:inline">Add </span>Files
                </button>
                <button 
                  onClick={() => folderInputRef.current?.click()}
                  className="hidden sm:flex text-rose-500 font-semibold items-center gap-1.5 hover:text-rose-600 dark:hover:text-rose-400 transition-colors active:scale-95"
                >
                  <FolderOpen size={20} strokeWidth={2.5} />
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
                      onClick={() => setCurrentSongIndex(idx)}
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
                        {isCurrent && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                            {isPlaying ? (
                              <>
                                <div className="w-1 bg-white rounded-full eq-bar" />
                                <div className="w-1 bg-white rounded-full eq-bar" />
                                <div className="w-1 bg-white rounded-full eq-bar" />
                              </>
                            ) : (
                              <Pause size={16} className="text-white" fill="currentColor" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 border-b border-zinc-100 dark:border-white/5 pb-3 pt-1 group-last:border-none">
                        <h3 className={`font-semibold truncate text-[17px] tracking-tight ${isCurrent ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                          {song.title}
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-[15px] truncate mt-0.5">{song.artist}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'search' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h1 className="text-4xl font-bold tracking-tight">Search</h1>
            <div className="relative shadow-sm rounded-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                type="text" 
                placeholder="Artists, Songs, or Albums" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-2xl py-4 pl-12 pr-4 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all placeholder:text-zinc-400"
              />
            </div>
            
            <div className="space-y-2 mt-8">
              {filteredSongs.map((song, idx) => {
                const originalIdx = songs.indexOf(song);
                const isCurrent = currentSongIndex === originalIdx;
                return (
                  <div 
                    key={idx} 
                    onClick={() => setCurrentSongIndex(originalIdx)}
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
                      {isCurrent && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                          {isPlaying ? (
                            <>
                              <div className="w-1 bg-white rounded-full eq-bar" />
                              <div className="w-1 bg-white rounded-full eq-bar" />
                              <div className="w-1 bg-white rounded-full eq-bar" />
                            </>
                          ) : (
                            <Pause size={16} className="text-white" fill="currentColor" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 border-b border-zinc-100 dark:border-white/5 pb-3 pt-1 group-last:border-none">
                      <h3 className={`font-semibold truncate text-[17px] tracking-tight ${isCurrent ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                        {song.title}
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400 text-[15px] truncate mt-0.5">{song.artist}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
            
            <div className="space-y-4">
              <h2 className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-4">Appearance</h2>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800/50">
                <div className="flex items-center justify-between p-4 px-5">
                  <span className="font-medium text-[17px]">Dark Mode</span>
                  <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={`w-[50px] h-[30px] rounded-full transition-colors relative shadow-inner ${theme === 'dark' ? 'bg-rose-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                  >
                    <motion.div 
                      className="w-[26px] h-[26px] bg-white rounded-full absolute top-[2px] shadow-sm border border-black/5"
                      animate={{ left: theme === 'dark' ? '22px' : '2px' }}
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
                    onClick={toggleAuth}
                    disabled={!authSupported || (inIframe && !requireAuth)}
                    className={`w-[50px] h-[30px] rounded-full transition-colors relative shadow-inner flex-shrink-0 ml-4 ${requireAuth ? 'bg-rose-500' : 'bg-zinc-200 dark:bg-zinc-700'} ${(!authSupported || (inIframe && !requireAuth)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <motion.div 
                      className="w-[26px] h-[26px] bg-white rounded-full absolute top-[2px] shadow-sm border border-black/5"
                      animate={{ left: requireAuth ? '22px' : '2px' }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
                {!authSupported ? (
                  <div className="px-5 pb-4 text-[13px] text-rose-500">
                    Biometric authentication is not supported on this device or browser.
                  </div>
                ) : (inIframe && !requireAuth) ? (
                  <div className="px-5 pb-4 text-[13px] text-amber-500 dark:text-amber-400">
                    Please open the app in a new tab to enable this feature (iframe restricted).
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
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
            className="fixed bottom-[104px] left-4 right-4 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-3xl backdrop-saturate-150 rounded-2xl p-2 flex items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-white/40 dark:border-white/10 cursor-pointer z-40 transition-colors active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0 shadow-sm">
              {currentSong.coverUrl ? (
                <img src={currentSong.coverUrl} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                  <Music2 size={20} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-[15px] truncate text-zinc-900 dark:text-white tracking-tight">{currentSong.title}</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-[13px] truncate">{currentSong.artist}</p>
            </div>
            <div className="flex items-center gap-4 pr-4">
              <button 
                onClick={togglePlayPause} 
                className="text-zinc-900 dark:text-white hover:scale-110 active:scale-90 transition-transform"
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              </button>
              <button 
                onClick={playNext} 
                className="text-zinc-900 dark:text-white hover:scale-110 active:scale-90 transition-transform"
              >
                <SkipForward size={24} fill="currentColor" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Nav */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-3xl backdrop-saturate-150 rounded-full px-8 py-3.5 flex gap-10 items-center border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] z-30 transition-colors">
        <button 
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'library' ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
        >
          <Library size={24} strokeWidth={activeTab === 'library' ? 2.5 : 2} />
          <span className="text-[10px] font-semibold tracking-wide">Library</span>
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'search' ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
        >
          <Search size={24} strokeWidth={activeTab === 'search' ? 2.5 : 2} />
          <span className="text-[10px] font-semibold tracking-wide">Search</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 transition-colors active:scale-95 ${activeTab === 'settings' ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
        >
          <Settings size={24} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
          <span className="text-[10px] font-semibold tracking-wide">Settings</span>
        </button>
      </div>

      {/* Full Screen Now Playing */}
      <AnimatePresence>
        {isNowPlayingOpen && currentSong && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 250 }}
            className="fixed inset-0 z-50 bg-[#fcfcfc] dark:bg-zinc-900 flex flex-col transition-colors"
          >
            {/* Blurred Background */}
            {currentSong.coverUrl && (
              <div 
                className="absolute inset-0 opacity-40 dark:opacity-50 blur-[80px] scale-125 pointer-events-none saturate-150"
                style={{
                  backgroundImage: `url(${currentSong.coverUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/60 to-[#fcfcfc] dark:from-black/10 dark:via-black/60 dark:to-black pointer-events-none transition-colors" />

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full px-8 py-12">
              <button 
                onClick={() => setIsNowPlayingOpen(false)}
                className="self-center p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors active:scale-90"
              >
                <ChevronDown size={32} strokeWidth={2.5} />
              </button>

              <div className="flex-1 flex flex-col justify-center items-center mt-4">
                <motion.div 
                  className="w-full max-w-[340px] aspect-square rounded-3xl bg-zinc-200 dark:bg-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden mb-14"
                  animate={{ scale: isPlaying ? 1 : 0.92 }}
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
                  <div className="mb-10 flex justify-between items-center">
                    <div className="min-w-0 flex-1 pr-4">
                      <h2 className="text-2xl font-bold truncate text-zinc-900 dark:text-white tracking-tight">{currentSong.title}</h2>
                      <p className="text-lg text-rose-500 dark:text-rose-400 truncate mt-1 font-medium">{currentSong.artist}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-12">
                    <input 
                      type="range" 
                      min={0} 
                      max={duration || 100} 
                      value={progress}
                      onChange={handleSeek}
                    />
                    <div className="flex justify-between text-[13px] font-medium text-zinc-500 dark:text-zinc-400 mt-2 font-mono tracking-wider">
                      <span>{formatTime(progress)}</span>
                      <span>-{formatTime(duration - progress)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-10">
                    <button onClick={playPrev} className="text-zinc-900 dark:text-white hover:text-rose-500 dark:hover:text-rose-400 transition-colors active:scale-90">
                      <SkipBack size={44} fill="currentColor" />
                    </button>
                    <button 
                      onClick={togglePlayPause} 
                      className="w-20 h-20 flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.2)]"
                    >
                      {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-2" />}
                    </button>
                    <button onClick={playNext} className="text-zinc-900 dark:text-white hover:text-rose-500 dark:hover:text-rose-400 transition-colors active:scale-90">
                      <SkipForward size={44} fill="currentColor" />
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
