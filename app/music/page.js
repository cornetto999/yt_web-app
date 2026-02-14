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
    <main className="min-h-screen bg-gray-100 pb-24">
      <div className="sticky top-0 z-40 bg-gray-100 pb-4 pt-2 shadow">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            doSearch();
          }}
          className="flex justify-center px-4"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search music..."
            className="w-full max-w-md px-4 py-2 rounded-l border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-r border border-primary hover:bg-primary-foreground transition"
          >
            Search
          </button>
        </form>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {error ? (
          <div className="mb-4 text-red-600">{error}</div>
        ) : null}

        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : null}

        {canShowEmpty ? (
          <div className="text-gray-600">No results.</div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((v) => (
            <Card key={v.id} className="overflow-hidden">
              <CardContent className="p-0">
                <button
                  onClick={() => playTrack(v, results)}
                  className="w-full text-left"
                >
                  <div className="w-full aspect-video bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <div className="font-semibold line-clamp-2">{v.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{v.channelTitle}</div>
                    <div className="text-xs text-gray-500 mt-1">{v.duration}</div>
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          playTrack(v, results);
                        }}
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
      </div>
    </main>
  );
}
