'use client';

import Link from 'next/link';
import { usePlayer } from '@/app/providers/PlayerProvider';
import { Button } from '@/components/ui/button';

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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white">
      <div className="max-w-5xl mx-auto px-3 py-2">
        {blockedAutoplay ? (
          <div className="text-xs text-amber-600 mb-2">Tap play to start audio.</div>
        ) : null}

        <div className="flex items-center gap-3">
          <Link href="/music" className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded overflow-hidden bg-gray-200 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentTrack.thumbnailUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{currentTrack.title}</div>
              <div className="text-xs text-gray-600 truncate">{currentTrack.channelTitle}</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={prev}>
              Prev
            </Button>
            <Button type="button" variant="secondary" onClick={togglePlay}>
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button type="button" variant="outline" onClick={next}>
              Next
            </Button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <label className="text-xs text-gray-700 flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
            />
            Autoplay
          </label>

          <div className="flex items-center gap-2 flex-1">
            <div className="text-xs text-gray-700 w-12">Vol</div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="w-full"
            />
            <div className="text-xs text-gray-600 w-8 text-right">{volume}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


