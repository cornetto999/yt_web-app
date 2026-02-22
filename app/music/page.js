'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { musicSearch } from '@/lib/youtubeMusicApi';
import { usePlayer } from '@/app/providers/PlayerProvider';

export default function MusicPage() {
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canShowEmpty = useMemo(() => !loading && query.trim() && results.length === 0, [loading, query, results.length]);

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
    <main className="min-h-screen pb-28 pt-4 md:pt-8">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <section className="glass-panel relative overflow-hidden px-4 py-6 md:px-8 md:py-8">
          <div className="absolute -left-16 -top-10 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute -right-8 -bottom-12 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700/80">Music</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-4xl">Play tracks without distractions</h1>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                doSearch();
              }}
              className="mt-5 flex w-full items-center gap-2 md:max-w-2xl"
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
                className="h-12 shrink-0 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.25)] transition hover:bg-slate-800"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        <section className="mt-7 rounded-3xl border border-white/60 bg-white/45 px-4 py-6 shadow-[0_8px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm md:px-6 md:py-8">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="text-sm font-medium text-slate-600">Loading...</div>
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.thumbnailUrl} alt={v.title} className="h-full w-full object-cover" />
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
