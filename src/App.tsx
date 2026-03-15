/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import MetadataWorker from './workers/metadata.worker.ts?worker';
import { get, set } from 'idb-keyval';

import { Song, AccentColor } from './types';
import { ACCENT_COLORS } from './constants';

import { LockScreen } from './components/LockScreen';
import { BottomNav } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { NowPlaying } from './components/NowPlaying';
import { LibraryTab } from './components/LibraryTab';
import { SearchTab } from './components/SearchTab';
import { SettingsTab } from './components/SettingsTab';

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [activeTab, setActiveTab] = useState<'library' | 'search' | 'settings'>('library');
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [volume, setVolume] = useState(1);
  const [isScanning, setIsScanning] = useState(false);

  // New settings state
  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accentColor') as AccentColor;
      if (saved && ACCENT_COLORS[saved]) return saved;
    }
    return 'rose';
  });
  const [keepScreenOn, setKeepScreenOn] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('keepScreenOn') === 'true';
    }
    return false;
  });

  const isShuffleRef = useRef(isShuffle);
  const repeatModeRef = useRef(repeatMode);
  const songsLengthRef = useRef(songs.length);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
    repeatModeRef.current = repeatMode;
    songsLengthRef.current = songs.length;
  }, [isShuffle, repeatMode, songs.length]);

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
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

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
  const wakeLockRef = useRef<any>(null);

  // Wake Lock logic
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && keepScreenOn && isPlaying) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.error(`Wake Lock error: ${err}`);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current !== null) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch (err) {
          console.error(`Wake Lock release error: ${err}`);
        }
      }
    };

    if (keepScreenOn && isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible' && keepScreenOn && isPlaying) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [keepScreenOn, isPlaying]);

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
      // We purposefully keep authCredentialId so we can reuse it later
      setRequireAuth(false);
    } else {
      if (inIframe) {
        alert("Biometric authentication cannot be set up inside an iframe due to browser security restrictions. Please open the app in a new tab to enable this feature.");
        return;
      }
      
      const existingCredentialIdStr = localStorage.getItem('authCredentialId');
      
      if (existingCredentialIdStr) {
        try {
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

          const credentialId = base64UrlDecode(existingCredentialIdStr);
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
          
          localStorage.setItem('requireAuth', 'true');
          setRequireAuth(true);
          return;
        } catch (e) {
          console.warn("Existing credential failed or was removed from device. Creating a new one.", e);
          localStorage.removeItem('authCredentialId');
          // Fall through to create a new one
        }
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
        alert('Authentication failed. Your device might not support it or you cancelled the prompt.');
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
    audio.crossOrigin = 'anonymous'; // Important for Web Audio API
    audioRef.current = audio;

    const initAudioContext = async () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;

        const source = ctx.createMediaElementSource(audio);
        
        // Load worklet
        await ctx.audioWorklet.addModule(new URL('./workers/time-stretch.worklet.ts', import.meta.url));
        
        const workletNode = new AudioWorkletNode(ctx, 'time-stretch-processor');
        workletNodeRef.current = workletNode;
        
        source.connect(workletNode);
        workletNode.connect(ctx.destination);
      } catch (error) {
        console.error('Failed to initialize Web Audio API:', error);
      }
    };

    initAudioContext();

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => playNext(true);
    const handlePlay = () => {
      setIsPlaying(true);
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };
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
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      // @ts-ignore
      audioRef.current.preservesPitch = false;
      // @ts-ignore
      audioRef.current.mozPreservesPitch = false;
      // @ts-ignore
      audioRef.current.webkitPreservesPitch = false;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: 'setSpeed', speed });
    }
  }, [speed]);

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
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext(false));
    }

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [currentSongIndex, songs]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsScanning(true);
    const files = (Array.from(e.target.files) as File[]).filter(f => {
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
    await processFiles(files);
    setIsScanning(false);
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    return new Promise<void>((resolve) => {
      const worker = new MetadataWorker();
      const id = Date.now().toString();

      worker.onmessage = (e) => {
        if (e.data.id === id) {
          const { parsedSongs, isComplete } = e.data;
          
          if (parsedSongs && parsedSongs.length > 0) {
            const newParsedSongs: Song[] = parsedSongs.map((s: any) => ({
              ...s,
              coverUrl: s.coverBlob ? URL.createObjectURL(s.coverBlob) : ''
            }));

            setSongs(prev => {
              const existingIds = new Set(prev.map(s => s.file.name + s.file.size));
              const uniqueNewSongs = newParsedSongs.filter(s => !existingIds.has(s.file.name + s.file.size));
              const newSongs = [...prev, ...uniqueNewSongs];
              set('library_songs', newSongs).catch(console.error);
              return newSongs;
            });
          }
          
          if (isComplete) {
            worker.terminate();
            resolve();
          }
        }
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        worker.terminate();
        resolve();
      };

      worker.postMessage({ id, files });
    });
  };

  const handleDirectorySelect = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        // @ts-ignore
        const directoryHandle = await window.showDirectoryPicker();
        await loadFromDirectoryHandle(directoryHandle);
      } else {
        folderInputRef.current?.click();
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    }
  };

  const loadFromDirectoryHandle = async (directoryHandle: any) => {
    setIsScanning(true);
    const files: File[] = [];
    
    async function scanDirectory(handle: any) {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          const name = file.name.toLowerCase();
          if (file.type.startsWith('audio/') || 
              file.type === 'video/webm' || 
              name.endsWith('.webm') ||
              name.endsWith('.mp3') ||
              name.endsWith('.m4a') ||
              name.endsWith('.wav') ||
              name.endsWith('.aac') ||
              name.endsWith('.ogg') ||
              name.endsWith('.flac')) {
            files.push(file);
          }
        } else if (entry.kind === 'directory') {
          await scanDirectory(entry);
        }
      }
    }

    try {
      await scanDirectory(directoryHandle);
      await processFiles(files);
    } catch (error) {
      console.error('Error scanning directory:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Load saved songs from IndexedDB on mount
  useEffect(() => {
    const loadSavedSongs = async () => {
      try {
        setIsScanning(true);
        const savedSongs = await get<Song[]>('library_songs');
        if (savedSongs && savedSongs.length > 0) {
          const restoredSongs = savedSongs.map(song => ({
            ...song,
            coverUrl: song.coverBlob ? URL.createObjectURL(song.coverBlob) : ''
          }));
          setSongs(restoredSongs);
        }
      } catch (error) {
        console.error('Failed to load songs from IDB:', error);
      } finally {
        setIsScanning(false);
      }
    };
    
    if (!isLocked) {
      loadSavedSongs();
    }
  }, [isLocked]);

  const togglePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const playNext = (isAutoPlay: boolean = false) => {
    if (songsLengthRef.current === 0) return;
    
    setCurrentSongIndex(prev => {
      if (prev === null) return 0;
      
      if (isAutoPlay && repeatModeRef.current === 'one') {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.error);
        }
        return prev;
      }

      if (isAutoPlay && repeatModeRef.current === 'none' && prev === songsLengthRef.current - 1) {
        setIsPlaying(false);
        return prev;
      }

      if (isShuffleRef.current) {
        let nextIndex = Math.floor(Math.random() * songsLengthRef.current);
        if (nextIndex === prev && songsLengthRef.current > 1) {
          nextIndex = (nextIndex + 1) % songsLengthRef.current;
        }
        return nextIndex;
      }
      return (prev + 1) % songsLengthRef.current;
    });
  };

  const playPrev = () => {
    if (songsLengthRef.current === 0) return;
    setCurrentSongIndex(prev => {
      if (prev === null) return 0;
      if (isShuffleRef.current) {
        let prevIndex = Math.floor(Math.random() * songsLengthRef.current);
        if (prevIndex === prev && songsLengthRef.current > 1) {
          prevIndex = (prevIndex - 1 + songsLengthRef.current) % songsLengthRef.current;
        }
        return prevIndex;
      }
      return (prev - 1 + songsLengthRef.current) % songsLengthRef.current;
    });
  };

  const handleNextClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    playNext(false);
  };

  const handlePrevClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    playPrev();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setProgress(time);
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: 'seek' });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newVolume = Number(e.target.value);
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  };

  const toggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  };

  const currentSong = currentSongIndex !== null ? songs[currentSongIndex] : null;

  if (isLocked) {
    return (
      <LockScreen 
        accentColor={accentColor}
        authError={authError}
        onUnlock={handleUnlock}
      />
    );
  }

  return (
    <LayoutGroup>
      <div className="flex-1 w-full bg-[#fcfcfc] dark:bg-black text-zinc-900 dark:text-white flex flex-col relative overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-64 px-6 pt-14">
        {activeTab === 'library' && (
          <LibraryTab 
            songs={songs}
            currentSongIndex={currentSongIndex}
            isScanning={isScanning}
            accentColor={accentColor}
            fileInputRef={fileInputRef}
            folderInputRef={folderInputRef}
            onSongSelect={setCurrentSongIndex}
            onAddFiles={() => fileInputRef.current?.click()}
            onAddFolder={handleDirectorySelect}
            onFileSelect={handleFileSelect}
          />
        )}

        {activeTab === 'search' && (
          <SearchTab 
            songs={songs}
            searchQuery={searchQuery}
            currentSongIndex={currentSongIndex}
            accentColor={accentColor}
            onSearchChange={setSearchQuery}
            onSongSelect={setCurrentSongIndex}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab 
            theme={theme}
            accentColor={accentColor}
            keepScreenOn={keepScreenOn}
            requireAuth={requireAuth}
            authSupported={authSupported}
            inIframe={inIframe}
            onThemeChange={setTheme}
            onAccentColorChange={(color) => {
              setAccentColor(color);
              localStorage.setItem('accentColor', color);
            }}
            onKeepScreenOnChange={(keep) => {
              setKeepScreenOn(keep);
              localStorage.setItem('keepScreenOn', String(keep));
            }}
            onRequireAuthToggle={toggleAuth}
          />
        )}
      </div>

      {/* Mini Player */}
      <AnimatePresence>
        {currentSong && !isNowPlayingOpen && (
          <MiniPlayer 
            song={currentSong}
            isPlaying={isPlaying}
            progress={progress}
            duration={duration}
            accentColor={accentColor}
            onOpen={() => setIsNowPlayingOpen(true)}
            onPlayPause={togglePlayPause}
            onNext={handleNextClick}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav 
        activeTab={activeTab}
        accentColor={accentColor}
        onTabChange={setActiveTab}
      />

      {/* Full Screen Player */}
      <AnimatePresence>
        {isNowPlayingOpen && currentSong && (
          <NowPlaying 
            song={currentSong}
            isPlaying={isPlaying}
            progress={progress}
            duration={duration}
            volume={volume}
            speed={speed}
            isShuffle={isShuffle}
            repeatMode={repeatMode}
            accentColor={accentColor}
            audioRef={audioRef}
            onClose={() => setIsNowPlayingOpen(false)}
            onPlayPause={togglePlayPause}
            onNext={handleNextClick}
            onPrev={handlePrevClick}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onSpeedChange={(s) => setSpeed(s)}
            onShuffleToggle={() => setIsShuffle(!isShuffle)}
            onRepeatToggle={toggleRepeat}
          />
        )}
      </AnimatePresence>
    </div>
    </LayoutGroup>
  );
}
