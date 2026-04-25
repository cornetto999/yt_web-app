'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlayer } from '@/app/providers/PlayerProvider';
import { Button } from '@/components/ui/button';
import { SkipBack, SkipForward, Pause, Play } from 'lucide-react';

export default function MiniPlayer() {
  const pathname = usePathname();
  const [hasMainPlayer, setHasMainPlayer] = useState(false);
  const {
    currentTrack,
    isPlaying,
    autoplay,
    volume,
    currentTimeSeconds,
    currentTimeText,
    currentDurationText,
    blockedAutoplay,
    togglePlay,
    next,
    prev,
    setAutoplay,
    setVolume,
  } = usePlayer();

  const isWatchPage = pathname?.startsWith('/watch/');

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const syncMainPlayer = () => {
      setHasMainPlayer(Boolean(document.getElementById('youtube-player-container')));
    };

    syncMainPlayer();

    const observer = new MutationObserver(syncMainPlayer);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [pathname]);

  if (!currentTrack || isWatchPage || hasMainPlayer) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/70 bg-white/75 backdrop-blur-xl shadow-[0_-12px_30px_rgba(15,23,42,0.08)]">
      <div
        className="mx-auto max-w-6xl px-3 pt-2.5 md:px-5"
        style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
      >
        {blockedAutoplay ? (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">Tap play to start audio.</div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={`/watch/${currentTrack.id}`}
            onClick={() => {
              try {
                sessionStorage.setItem('watchResumeState', JSON.stringify({
                  id: currentTrack.id,
                  time: Math.max(0, Math.floor(Number(currentTimeSeconds) || 0)),
                }));
              } catch { }
            }}
            className="flex min-w-0 items-center gap-3 sm:flex-1"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentTrack.thumbnailUrl} alt={currentTrack.title} className="h-full w-full object-cover" />
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">{currentTrack.title}</div>
              <div className="truncate text-xs text-slate-600">{currentTrack.channelTitle}</div>
            </div>
          </Link>

          <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={prev}
              className="h-9 rounded-xl bg-white/85 p-0 sm:size-8"
              aria-label="Previous track"
            >
              <SkipBack className="size-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={togglePlay}
              className="h-9 rounded-xl bg-slate-900 p-0 text-white hover:bg-slate-800 hover:text-white sm:size-8"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={next}
              className="h-9 rounded-xl bg-white/85 p-0 sm:size-8"
              aria-label="Next track"
            >
              <SkipForward className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:mt-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="order-2 flex items-center gap-2 text-xs text-slate-700 sm:order-1">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600"
            />
            Autoplay
          </label>

          <div className="order-1 flex flex-1 flex-col gap-1 sm:order-2">
            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Time</span>
              <span>{currentTimeText || '0:00'} / {currentDurationText || currentTrack.duration || '--:--'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-9 shrink-0 text-xs text-slate-700">Vol</div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full accent-sky-600"
              />
              <div className="w-8 shrink-0 text-right text-xs text-slate-600">{volume}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
