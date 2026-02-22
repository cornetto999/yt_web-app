'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import VideoCard from '@/components/VideoCard';
import ShortCard from '@/components/ShortCard';
import { Button } from '@/components/ui/button';

const CATEGORY_MAP = [
  { name: 'Music', id: '10' }, // YouTube categoryId 10
  { name: 'Comedy', id: '23' }, // YouTube categoryId 23
  { name: 'Animation', id: '1' }, // YouTube categoryId 1 (Animation)
  { name: 'People & Blogs', id: '22' }, // YouTube categoryId 22
  { name: 'News & Politics', id: '25' }, // YouTube categoryId 25
];

export default function HomePage() {
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const loaderRef = useRef();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showNoVideos, setShowNoVideos] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [feedType, setFeedType] = useState('trending'); // 'trending' | 'shorts'
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const router = typeof window !== 'undefined' ? { push: (url) => window.history.pushState({}, '', url) } : null;

  // Restore from session if available; else load initial
  useEffect(() => {
    const q = searchParams ? searchParams.get('q') : '';
    const saved = sessionStorage.getItem('homeState');
    if (!q && saved) {
      try {
        const parsed = JSON.parse(saved);
        setSearchQuery(parsed.searchQuery || '');
        setSelectedCategory(parsed.selectedCategory || '');
        setFeedType(parsed.feedType || 'trending');
        setVideos(Array.isArray(parsed.videos) ? parsed.videos : []);
        setNextPageToken(parsed.nextPageToken || null);
        // Restore scroll after a tick
        setTimeout(() => {
          window.scrollTo(0, parsed.scrollY || 0);
        }, 0);
        return;
      } catch { }
    }
    if (q) {
      setSearchQuery(q);
      handleSearch({ preventDefault: () => { } }, q);
    } else {
      setSearchQuery('');
      setVideos([]);
      setNextPageToken(null);
      loadTrendingVideos();
    }
  }, []);

  // Delay showing 'No videos found' to avoid flashing on slow loads
  useEffect(() => {
    let timeout;
    if (loading) {
      setShowNoVideos(false);
    } else if (!loading && (!Array.isArray(videos) || videos.length === 0)) {
      timeout = setTimeout(() => setShowNoVideos(true), 10000); // 10 seconds for poor network
    } else {
      setShowNoVideos(false);
    }
    return () => clearTimeout(timeout);
  }, [loading, videos]);

  // Reload trending for the selected category only (no shuffling)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setVideos([]);
      setNextPageToken(null);
      if (feedType === 'trending') {
        loadTrendingVideos(selectedCategory);
      }
    }
  }, [selectedCategory, feedType]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current || !nextPageToken || searchQuery) return;
    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingMore) {
          if (feedType === 'shorts') {
            fetchMoreShortsVideos();
          } else {
            fetchMoreTrendingVideos();
          }
        }
      },
      { threshold: 1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [nextPageToken, isFetchingMore, searchQuery, feedType]);

  // 🔍 Search or reset
  const handleSearch = async (e, overrideQuery) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = overrideQuery !== undefined ? overrideQuery : searchQuery;
    if (!query.trim()) {
      setVideos([]);
      setNextPageToken(null);
      loadTrendingVideos(); // Show trending if search is cleared
      return;
    }
    try {
      setLoading(true);
      // Ensure search always uses standard video layout
      setFeedType('trending');
      localStorage.setItem('lastSearchQuery', query);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
      setNextPageToken(null);
      // Optionally update the URL
      if (router) router.push(`/?q=${encodeURIComponent(query)}`);
    } catch (err) {
      console.error('Search failed', err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Load trending (first page)
  const loadTrendingVideos = async (categoryId = selectedCategory) => {
    try {
      setLoading(true);
      setUsedFallback(false);
      let url = '/api/trending';
      if (categoryId) {
        url += `?categoryId=${categoryId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        setVideos(data.items);
        setNextPageToken(data.nextPageToken);
      } else {
        // Fallback: fetch random videos using search API
        const fallbackKeywords = ['music', 'funny', 'news', 'vlog', 'sports', 'movie', 'game', 'dance', 'food', 'travel'];
        const randomKeyword = fallbackKeywords[Math.floor(Math.random() * fallbackKeywords.length)];
        const fallbackRes = await fetch(`/api/search?q=${encodeURIComponent(randomKeyword)}`);
        const fallbackData = await fallbackRes.json();
        setVideos(Array.isArray(fallbackData) ? fallbackData : []);
        setNextPageToken(null);
        setUsedFallback(true);
      }
    } catch (err) {
      console.error('Failed to load trending videos', err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 Load shorts (first page)
  const loadShortsVideos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/shorts');
      const data = await res.json();
      if (!res.ok) {
        console.error('Shorts API error', data?.error);
      }
      setVideos(Array.isArray(data.items) ? data.items : []);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error('Failed to load shorts', err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Fetch more trending (pagination)
  const fetchMoreTrendingVideos = useCallback(async () => {
    if (!nextPageToken) return;
    setIsFetchingMore(true);
    try {
      const params = new URLSearchParams();
      params.set('pageToken', nextPageToken);
      if (selectedCategory) params.set('categoryId', selectedCategory);
      const res = await fetch(`/api/trending?${params.toString()}`);
      const data = await res.json();
      setVideos((prev) => [...prev, ...data.items]);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      console.error('Failed to fetch more trending videos', err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [nextPageToken, selectedCategory]);

  // 🎯 Fetch more shorts (pagination)
  const fetchMoreShortsVideos = useCallback(async () => {
    if (!nextPageToken) return;
    setIsFetchingMore(true);
    try {
      const res = await fetch(`/api/shorts?pageToken=${nextPageToken}`);
      const data = await res.json();
      setVideos((prev) => [...prev, ...(data.items || [])]);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      console.error('Failed to fetch more shorts', err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [nextPageToken]);

  // 🧭 Save state before navigating away
  const saveHomeState = useCallback(() => {
    const state = {
      searchQuery,
      selectedCategory,
      feedType,
      videos,
      nextPageToken,
      scrollY: window.scrollY,
    };
    try {
      sessionStorage.setItem('homeState', JSON.stringify(state));
    } catch { }
  }, [searchQuery, selectedCategory, feedType, videos, nextPageToken]);

  const sectionTitle = searchQuery.trim()
    ? 'Search Results'
    : feedType === 'shorts'
      ? 'Shorts Feed'
      : 'Trending in Philippines';

  return (
    <main className="min-h-screen pb-24 pt-4 md:pt-8">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 mx-auto h-96 max-w-6xl rounded-[100px] bg-gradient-to-br from-sky-300/20 via-cyan-300/10 to-blue-500/20 blur-3xl" />

      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <section className="glass-panel relative overflow-hidden px-4 py-6 md:px-8 md:py-8">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute -bottom-24 left-16 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="relative">
            <div className="mb-5 animate-[fade-up_0.45s_ease-out]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700/80">Discover</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-4xl">Find the next video worth watching</h1>
            </div>

            <form onSubmit={handleSearch} className="relative mx-auto flex w-full animate-[fade-up_0.55s_ease-out] items-center gap-2 md:max-w-2xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos, channels, topics..."
                className="modern-input w-full"
              />
              <button
                type="submit"
                className="h-12 shrink-0 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.25)] transition hover:bg-slate-800"
              >
                Search
              </button>
            </form>

            <div className="mt-5 flex flex-wrap justify-center gap-2.5 animate-[fade-up_0.65s_ease-out]">
              <Button
                key="home"
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setFeedType('trending');
                  setSelectedCategory('');
                  setVideos([]);
                  setNextPageToken(null);
                  loadTrendingVideos();
                }}
                className={`modern-chip ${feedType === 'trending' && selectedCategory === '' ? 'modern-chip-active hover:bg-sky-500 hover:text-white' : ''}`}
              >
                Home
              </Button>
              <Button
                key="shorts"
                variant="ghost"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                  setFeedType('shorts');
                  setVideos([]);
                  setNextPageToken(null);
                  loadShortsVideos();
                }}
                className={`modern-chip ${feedType === 'shorts' ? 'modern-chip-active hover:bg-sky-500 hover:text-white' : ''}`}
              >
                Shorts
              </Button>
              {CATEGORY_MAP.map((cat) => (
                <Button
                  key={cat.name}
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('');
                    setFeedType('trending');
                    setSelectedCategory(cat.id);
                    setVideos([]);
                    setNextPageToken(null);
                    loadTrendingVideos(cat.id);
                  }}
                  className={`modern-chip ${selectedCategory === cat.id && feedType === 'trending' ? 'modern-chip-active hover:bg-sky-500 hover:text-white' : ''}`}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/60 bg-white/45 px-4 py-6 shadow-[0_8px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm md:px-6 md:py-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900 md:text-2xl">{sectionTitle}</h2>
            {!loading && Array.isArray(videos) && videos.length > 0 ? (
              <p className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold text-slate-600">
                {videos.length} loaded
              </p>
            ) : null}
          </div>

          {loading || (!Array.isArray(videos) || videos.length === 0) && !showNoVideos ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="skeleton-card h-52 rounded-2xl" />
              ))}
            </div>
          ) : Array.isArray(videos) && videos.length > 0 ? (
            searchQuery.trim() ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                {videos.map((video, idx) => (
                  <VideoCard
                    key={String(video.id?.videoId || video.id || video.title || idx)}
                    video={video}
                    onNavigate={saveHomeState}
                  />
                ))}
              </div>
            ) : feedType === 'shorts' ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {videos.map((video, idx) => (
                  <ShortCard
                    key={String(video.id || video.title || idx)}
                    video={video}
                    onNavigate={saveHomeState}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                {videos.map((video, idx) => (
                  <VideoCard
                    key={String(video.id?.videoId || video.id || video.title || idx)}
                    video={video}
                    onNavigate={saveHomeState}
                  />
                ))}
              </div>
            )
          ) : showNoVideos && !loading && (!usedFallback || (usedFallback && videos.length === 0)) ? (
            <p className="rounded-2xl border border-slate-200 bg-white/85 py-10 text-center text-slate-500">No videos found.</p>
          ) : null}

          {!searchQuery && nextPageToken && (
            <div ref={loaderRef} className="mt-6 h-12 flex items-center justify-center">
              {isFetchingMore && <span className="text-sm font-medium text-slate-500">Loading more...</span>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
