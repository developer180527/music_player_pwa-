import React, { useState, useEffect } from 'react';
import { Plus, Radio, MapPin, Play, Loader2, Music2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Song, AccentColor } from '../types';
import { ACCENT_COLORS } from '../constants';

interface RadioTabProps {
  accentColor: AccentColor;
  onPlayStation: (station: Song) => void;
}

interface RadioStation {
  changeuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  countrycode: string;
  votes: number;
}

export function RadioTab({ accentColor, onPlayStation }: RadioTabProps) {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const url = manualUrl.trim();
    if (!url) return;

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (err) {
      setError('Please enter a valid stream URL (e.g., https://stream.example.com/radio)');
      return;
    }

    const newStation: Song = {
      url: url,
      title: 'Custom Radio',
      artist: 'Internet Radio',
      album: 'Live Stream',
      coverUrl: '',
      duration: 0,
      isRadio: true
    };

    onPlayStation(newStation);
    setManualUrl('');
    setShowManualInput(false);
  };

  const findLocalStations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Get Location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by your browser.'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 0,
          enableHighAccuracy: true
        });
      });

      const { latitude, longitude } = position.coords;

      // 2. Get Country Code
      let countryCode;
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&email=musicplayer@example.com`);
        if (!geoRes.ok) throw new Error(`HTTP error! status: ${geoRes.status}`);
        const geoData = await geoRes.json();
        countryCode = geoData.address?.country_code;
      } catch (err) {
        throw new Error('Failed to determine your country from location data. Please try again later.');
      }

      if (!countryCode) throw new Error('Could not determine your country from the location provided.');

      // 3. Fetch Stations
      let stationsData: RadioStation[];
      try {
        // Using a random known Radio Browser API server. In production, we should query DNS or the all.api.radio-browser.info
        const apiServer = 'https://de1.api.radio-browser.info';
        const stationsRes = await fetch(`${apiServer}/json/stations/bycountrycodeexact/${countryCode}?limit=50&order=votes&reverse=true&hidebroken=true`);
        
        if (!stationsRes.ok) throw new Error(`HTTP error! status: ${stationsRes.status}`);
        stationsData = await stationsRes.json();
      } catch (err) {
        throw new Error('Failed to fetch radio stations from the directory. The service might be temporarily unavailable.');
      }

      if (stationsData.length === 0) {
        throw new Error(`No local stations found for your country (${countryCode.toUpperCase()}).`);
      }

      setStations(stationsData);
    } catch (err: any) {
      console.error('Error finding stations:', err);
      
      let errorMessage = 'An unexpected error occurred.';
      
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location access was denied. Please enable location permissions in your browser to find local stations.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again later.';
            break;
          case err.TIMEOUT:
            errorMessage = 'The request to get your location timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred while trying to get your location.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const playStation = (station: RadioStation) => {
    const newStation: Song = {
      url: station.url_resolved || station.url,
      title: station.name.trim() || 'Unknown Station',
      artist: station.tags ? station.tags.split(',').slice(0, 2).join(', ') : 'Internet Radio',
      album: 'Live Stream',
      coverUrl: station.favicon || '',
      duration: 0,
      isRadio: true
    };
    onPlayStation(newStation);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-8"
    >
      <div className="fixed top-0 left-0 right-0 z-30 bg-[#fcfcfc]/80 dark:bg-black/80 backdrop-blur-xl px-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-4 flex justify-between items-end border-b border-zinc-200/50 dark:border-zinc-800/50">
        <h1 className="text-4xl font-bold tracking-tight">Radio</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowManualInput(!showManualInput)}
            className={`${ACCENT_COLORS[accentColor].text} font-semibold flex items-center gap-1.5 ${ACCENT_COLORS[accentColor].textHover} transition-colors active:scale-95`}
          >
            <Plus size={20} strokeWidth={2.5} />
            <span className="hidden sm:inline">Add </span>Radio
          </button>
        </div>
      </div>

      <div className="px-6 space-y-8 pt-[calc(env(safe-area-inset-top)+104px)]">
      {showManualInput && (
        <motion.form 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-2xl flex gap-3"
          onSubmit={handleManualSubmit}
        >
          <input
            type="url"
            placeholder="Enter stream URL (e.g., http://stream.url)"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            className="flex-1 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{ '--tw-ring-color': `var(--color-${accentColor}-500)` } as any}
            required
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded-xl text-white font-medium ${ACCENT_COLORS[accentColor].bg} ${ACCENT_COLORS[accentColor].bgHover} transition-colors`}
          >
            Play
          </button>
        </motion.form>
      )}

      <div className="flex flex-col gap-4">
        <button
          onClick={findLocalStations}
          disabled={isLoading}
          className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-[0.98] ${ACCENT_COLORS[accentColor].bg} ${ACCENT_COLORS[accentColor].bgHover} disabled:opacity-70 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <MapPin size={24} />
          )}
          {isLoading ? 'Finding Stations...' : 'Find Local Stations'}
        </button>

        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}
      </div>

      {stations.length > 0 && (
        <div className="space-y-2 pb-8">
          <h2 className="text-xl font-semibold mb-4">Local Stations</h2>
          {stations.map((station) => (
            <div 
              key={station.changeuuid} 
              onClick={() => playStation(station)}
              className="group flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.98] hover:bg-zinc-50 dark:hover:bg-white/5"
            >
              <div className="relative w-14 h-14 rounded-xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                {station.favicon ? (
                  <img 
                    src={station.favicon} 
                    alt="cover" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600 ${station.favicon ? 'hidden' : ''}`}>
                  <Radio size={24} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[17px] truncate text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
                  {station.name.trim() || 'Unknown Station'}
                </h3>
                <p className="text-[14px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  {station.tags ? station.tags.split(',').slice(0, 3).join(', ') : 'Internet Radio'}
                </p>
              </div>
              <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${ACCENT_COLORS[accentColor].text}`}>
                <Play size={20} className="fill-current" />
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </motion.div>
  );
}
