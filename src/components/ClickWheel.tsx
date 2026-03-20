import React, { useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';

interface ClickWheelProps {
  onScroll: (direction: number) => void;
  onMenu: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onCenter: () => void;
}

export function ClickWheel({ onScroll, onMenu, onPlayPause, onNext, onPrev, onCenter }: ClickWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef<number | null>(null);

  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;

    const handleMove = (e: TouchEvent | MouseEvent) => {
      if (angleRef.current === null) return;
      e.preventDefault();

      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const angle = Math.atan2(clientY - centerY, clientX - centerX);
      
      let delta = angle - angleRef.current;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;

      if (Math.abs(delta) > 0.15) {
        onScroll(delta > 0 ? 1 : -1);
        angleRef.current = angle;
      }
    };

    const handleStart = (e: TouchEvent | MouseEvent) => {
      if ((e.target as HTMLElement).closest('.click-wheel-center') || (e.target as HTMLElement).closest('.click-wheel-btn')) {
        return;
      }
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      angleRef.current = Math.atan2(clientY - centerY, clientX - centerX);
      
      document.addEventListener('mousemove', handleMove, { passive: false });
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchend', handleEnd);
    };

    const handleEnd = () => {
      angleRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };

    wheel.addEventListener('mousedown', handleStart);
    wheel.addEventListener('touchstart', handleStart, { passive: false });

    return () => {
      wheel.removeEventListener('mousedown', handleStart);
      wheel.removeEventListener('touchstart', handleStart);
      handleEnd();
    };
  }, [onScroll]);

  return (
    <div 
      ref={wheelRef}
      className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-zinc-100 dark:bg-zinc-800 shadow-[0_5px_15px_rgba(0,0,0,0.1),inset_0_-2px_5px_rgba(0,0,0,0.05)] flex items-center justify-center cursor-pointer select-none border border-zinc-200 dark:border-zinc-700"
    >
      <div className="absolute top-4 left-1/2 -translate-x-1/2 font-bold text-zinc-400 dark:text-zinc-500 tracking-widest click-wheel-btn hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors" onClick={onMenu}>
        MENU
      </div>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 click-wheel-btn hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors" onClick={onPrev}>
        <SkipBack size={24} className="fill-current" />
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 click-wheel-btn hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors" onClick={onNext}>
        <SkipForward size={24} className="fill-current" />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center text-zinc-400 dark:text-zinc-500 click-wheel-btn hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors" onClick={onPlayPause}>
        <Play size={20} className="fill-current" />
        <Pause size={20} className="fill-current -ml-1" />
      </div>

      <div 
        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-200 dark:bg-zinc-700 shadow-[inset_0_2px_5px_rgba(0,0,0,0.1),0_2px_5px_rgba(0,0,0,0.2)] click-wheel-center active:scale-95 transition-transform border border-zinc-300 dark:border-zinc-600"
        onClick={onCenter}
      />
    </div>
  );
}
