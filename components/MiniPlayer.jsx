'use client';

import Link from 'next/link';
import { usePlayer } from '@/app/providers/PlayerProvider';
import { Button } from '@/components/ui/button';
import { SkipBack, SkipForward, Pause, Play } from 'lucide-react';

export default function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    autoplay,
    volume,
    blockedAutoplay,
    togglePlay,
    next,
    prev,
    setAutoplay,
    setVolume,
  } = usePlayer();

  if (!currentTrack) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/70 bg-white/75 backdrop-blur-xl shadow-[0_-12px_30px_rgba(15,23,42,0.08)]">
      <div className="mx-auto max-w-6xl px-3 py-2.5 md:px-5">
        {blockedAutoplay ? (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">Tap play to start audio.</div>
        ) : null}

        <div className="flex items-center gap-3">
          <Link href="/music" className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentTrack.thumbnailUrl} alt={currentTrack.title} className="h-full w-full object-cover" />
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">{currentTrack.title}</div>
              <div className="truncate text-xs text-slate-600">{currentTrack.channelTitle}</div>
            </div>
          </Link>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              onClick={prev}
              className="size-8 rounded-xl bg-white/85 p-0"
              aria-label="Previous track"
            >
              <SkipBack className="size-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={togglePlay}
              className="size-8 rounded-xl bg-slate-900 p-0 text-white hover:bg-slate-800 hover:text-white"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={next}
              className="size-8 rounded-xl bg-white/85 p-0"
              aria-label="Next track"
            >
              <SkipForward className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600"
            />
            Autoplay
          </label>

          <div className="flex flex-1 items-center gap-2">
            <div className="w-12 text-xs text-slate-700">Vol</div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="w-full accent-sky-600"
            />
            <div className="w-8 text-right text-xs text-slate-600">{volume}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
