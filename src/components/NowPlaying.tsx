import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music2, Radio, ChevronDown, Shuffle, Repeat, Repeat1, Volume, Volume2, MoreVertical, Speaker, Headphones, Bluetooth } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song, AccentColor } from '../types';
import { ACCENT_COLORS } from '../constants';
import { formatTime } from '../utils';

interface NowPlayingProps {
  song: Song;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  speed: number;
  isShuffle: boolean;
  repeatMode: 'none' | 'all' | 'one';
  accentColor: AccentColor;
  audioRef: React.RefObject<HTMLAudioElement>;
  onClose: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSpeedChange: (speed: number) => void;
  onShuffleToggle: () => void;
  onRepeatToggle: () => void;
}

const springConfig = { type: "spring", damping: 20, stiffness: 300, mass: 0.8 };

export function NowPlaying({
  song,
  isPlaying,
  progress,
  duration,
  volume,
  speed,
  isShuffle,
  repeatMode,
  accentColor,
  audioRef,
  onClose,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onSpeedChange,
  onShuffleToggle,
  onRepeatToggle
}: NowPlayingProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [isSinkSupported, setIsSinkSupported] = useState(false);

  useEffect(() => {
    if (typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype) {
      setIsSinkSupported(true);
    }
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      if (!isSinkSupported || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      try {
        // Requesting audio permission might be needed to get device labels
        // await navigator.mediaDevices.getUserMedia({ audio: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = allDevices.filter(device => device.kind === 'audiooutput');
        setDevices(audioOutputs);
      } catch (err) {
        console.error('Error fetching audio devices:', err);
      }
    };

    if (isMenuOpen) {
      fetchDevices();
    }
  }, [isMenuOpen, isSinkSupported]);

  const handleDeviceSelect = async (deviceId: string) => {
    if (!audioRef.current || !isSinkSupported) return;
    try {
      // @ts-ignore - setSinkId is not in all TS definitions yet
      await audioRef.current.setSinkId(deviceId);
      setSelectedDeviceId(deviceId);
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Error setting audio output device:', error);
    }
  };

  const getDeviceIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('bluetooth') || lowerLabel.includes('airpods') || lowerLabel.includes('bose')) {
      return <Bluetooth size={16} />;
    }
    if (lowerLabel.includes('headphone') || lowerLabel.includes('earbud')) {
      return <Headphones size={16} />;
    }
    return <Speaker size={16} />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={springConfig}
      className="fixed inset-0 bg-[#fcfcfc] dark:bg-black z-50 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.7 }}
      onDragEnd={(e, info) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
          onClose();
        }
      }}
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
            {song.isRadio ? <Radio size={80} strokeWidth={1.5} /> : <Music2 size={80} strokeWidth={1.5} />}
          </div>
        </div>

        <div className="w-full flex items-start justify-between mb-8 relative">
          <div className="flex flex-col items-start flex-1 min-w-0 pr-4">
            <h2 className="text-2xl font-bold truncate w-full tracking-tight">{song.title}</h2>
            <p className={`text-lg ${ACCENT_COLORS[accentColor].text} truncate w-full font-medium`}>{song.artist}</p>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <MoreVertical size={24} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden z-50 origin-bottom-right flex flex-col"
                  >
                    <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Make it Slower</h3>
                    </div>
                    <div className="flex flex-col py-2 border-b border-zinc-100 dark:border-zinc-800">
                      {[1.0, 0.75, 0.5, 0.25].map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            onSpeedChange(s);
                            setIsMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${speed === s ? ACCENT_COLORS[accentColor].bgLight + ' ' + ACCENT_COLORS[accentColor].text : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                        >
                          <span className="text-sm font-medium truncate flex-1">
                            {s === 1.0 ? 'Normal (100%)' : `${s * 100}%`}
                          </span>
                        </button>
                      ))}
                    </div>

                    {isSinkSupported && (
                      <>
                        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
                          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Playback Device</h3>
                        </div>
                        <div className="max-h-40 overflow-y-auto py-2">
                          {devices.length > 0 ? (
                            devices.map(device => (
                              <button
                                key={device.deviceId}
                                onClick={() => handleDeviceSelect(device.deviceId)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${selectedDeviceId === device.deviceId ? ACCENT_COLORS[accentColor].bgLight + ' ' + ACCENT_COLORS[accentColor].text : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                              >
                                <div className={selectedDeviceId === device.deviceId ? ACCENT_COLORS[accentColor].text : 'text-zinc-400'}>
                                  {getDeviceIcon(device.label || 'Speaker')}
                                </div>
                                <span className="text-sm font-medium truncate flex-1">
                                  {device.label || (device.deviceId === 'default' ? 'System Default' : `Device ${device.deviceId.slice(0, 5)}...`)}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-zinc-500 text-center">
                              No devices found. Try clicking play first or check browser permissions.
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {song.isRadio ? (
          <div className="w-full flex items-center justify-center mb-8 h-10">
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase ${ACCENT_COLORS[accentColor].bg} text-white flex items-center gap-2 animate-pulse`}>
              <div className="w-2 h-2 rounded-full bg-white" />
              Live Stream
            </div>
          </div>
        ) : (
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
        )}

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
