'use client';

import { useEffect, useMemo, useState } from 'react';
import { Disc3, ListMusic, Pause, Play, Search, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { musicSearch } from '@/lib/youtubeMusicApi';
import { usePlayer } from '@/app/providers/PlayerProvider';

function TrackImage({ src, alt, className }) {
  const [imageSrc, setImageSrc] = useState(src || '/file.svg');

  useEffect(() => {
    setImageSrc(src || '/file.svg');
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={() => setImageSrc('/file.svg')}
    />
  );
}

export default function MusicPage() {
  const {
    playTrack,
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    currentTimeText,
    currentDurationText,
    blockedAutoplay,
    togglePlay,
    next,
    prev,
  } = usePlayer();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canShowEmpty = useMemo(() => !loading && query.trim() && results.length === 0, [loading, query, results.length]);
  const hasActiveTrack = Boolean(currentTrack?.id);
  const upcomingTracks = useMemo(() => {
    if (!Array.isArray(queue) || !queue.length) return [];
    return queue.filter((track, index) => track?.id && index !== currentIndex);
  }, [queue, currentIndex]);

  const doSearch = async (q) => {
    const text = (q ?? query).trim();
    if (!text) return;

    setLoading(true);
    setError(null);
    try {
      const data = await musicSearch(text);
      setResults(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e?.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Optional: preload a common query
  }, []);

  return (
    <main className="min-h-screen pb-32 pt-4 md:pb-28 md:pt-8">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <section className="glass-panel relative overflow-hidden px-4 py-6 md:px-8 md:py-8">
          <div className="absolute -left-16 -top-10 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute -right-8 -bottom-12 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700/80">Music</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-4xl">Play tracks without distractions</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Search tracks, jump back into what is already playing, and keep the queue visible while you browse.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                doSearch();
              }}
              className="mt-5 flex w-full flex-col gap-2 sm:flex-row sm:items-center md:max-w-2xl"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search music..."
                className="modern-input w-full"
              />
              <button
                type="submit"
                className="h-12 w-full shrink-0 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.25)] transition hover:bg-slate-800 sm:w-auto"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        {hasActiveTrack ? (
          <section className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-5 py-5 text-white shadow-[0_18px_48px_rgba(15,23,42,0.24)] md:px-6">
              <div className="absolute -right-10 -top-8 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
              <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />

              <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/10 shadow-[0_14px_28px_rgba(15,23,42,0.28)] md:h-36 md:w-36">
                  <TrackImage
                    src={currentTrack.thumbnailUrl}
                    alt={currentTrack.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/90">
                    <Disc3 className="size-3.5" />
                    Now Playing
                  </div>

                  <h2 className="mt-4 line-clamp-2 text-2xl font-bold tracking-tight md:text-3xl">
                    {currentTrack.title}
                  </h2>
                  <p className="mt-2 truncate text-sm text-slate-300 md:text-base">{currentTrack.channelTitle}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-200/90">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                      {currentTimeText || '0:00'} / {currentDurationText || currentTrack.duration || '--:--'}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                      {upcomingTracks.length} in queue
                    </span>
                    {blockedAutoplay ? (
                      <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-amber-100">
                        Tap play to resume audio
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prev}
                      className="h-11 w-full justify-center rounded-2xl border-white/20 bg-white/10 px-4 text-white hover:bg-white/15 hover:text-white sm:w-auto"
                    >
                      <SkipBack className="size-4" />
                      Prev
                    </Button>
                    <Button
                      type="button"
                      onClick={togglePlay}
                      className="h-11 w-full justify-center rounded-2xl bg-white px-5 text-slate-950 shadow-[0_12px_24px_rgba(255,255,255,0.18)] hover:bg-slate-100 sm:w-auto"
                    >
                      {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={next}
                      className="h-11 w-full justify-center rounded-2xl border-white/20 bg-white/10 px-4 text-white hover:bg-white/15 hover:text-white sm:w-auto"
                    >
                      Next
                      <SkipForward className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.10)] backdrop-blur-sm">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700/80">Queue</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">Up next on music</h2>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <ListMusic className="size-5" />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {upcomingTracks.length ? upcomingTracks.slice(0, 6).map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => playTrack(track, queue)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/85 p-3 text-left transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                      <TrackImage
                        src={track.thumbnailUrl}
                        alt={track.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900">{track.title}</div>
                      <div className="truncate text-xs text-slate-600">{track.channelTitle}</div>
                    </div>
                    <div className="text-xs font-medium text-slate-500">{track.duration || '--:--'}</div>
                  </button>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm text-slate-600">
                    Search and play a few tracks to build a queue here.
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-7 rounded-3xl border border-white/60 bg-white/45 px-4 py-6 shadow-[0_8px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm md:px-6 md:py-8">
          <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700/80">
                {query.trim() ? 'Search Results' : 'Music Library'}
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {query.trim() ? `Results for "${query.trim()}"` : 'Start with a search or continue your current session'}
              </h2>
            </div>
            <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white md:inline-flex">
              <Search className="size-5" />
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="text-sm font-medium text-slate-600">Loading...</div>
          ) : null}

          {!loading && !query.trim() && !results.length && !hasActiveTrack ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200/80 bg-white/80 px-5 py-10 text-center shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-sky-100 text-sky-700">
                <Disc3 className="size-8" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-900">No music loaded yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Search for a song, artist, or live session to start playing. Once something is active, this page will show the current track and queue here.
              </p>
            </div>
          ) : null}

          {canShowEmpty ? (
            <div className="text-sm text-slate-600">No results.</div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((v) => (
              <Card key={v.id} className="overflow-hidden rounded-2xl border-white/75 bg-white/75 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(15,23,42,0.14)]">
                <CardContent className="p-0">
                  <button
                    onClick={() => playTrack(v, results)}
                    className="w-full text-left"
                  >
                    <div className="w-full aspect-video bg-black">
                      <TrackImage
                        src={v.thumbnailUrl}
                        alt={v.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="line-clamp-2 font-bold text-slate-900">{v.title}</div>
                      <div className="mt-1 text-sm text-slate-600">{v.channelTitle}</div>
                      <div className="mt-1 text-xs text-slate-500">{v.duration}</div>
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            playTrack(v, results);
                          }}
                          className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
                        >
                          {currentTrack?.id === v.id && isPlaying ? 'Playing' : 'Play'}
                        </Button>
                      </div>
                    </div>
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
