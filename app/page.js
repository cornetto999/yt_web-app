'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import VideoCard from '@/components/VideoCard';
import ShortCard from '@/components/ShortCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

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

  return (
    <main className="min-h-screen bg-gray-100">
      {/* 🔍 Sticky Search */}
      <div className="sticky top-0 z-50 bg-gray-100 pb-4 pt-2 shadow">
        <form onSubmit={handleSearch} className="flex justify-center px-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos..."
            className="w-full max-w-md px-4 py-2 rounded-l border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-r border border-primary hover:bg-primary-foreground transition"
          >
            Search
          </button>
        </form>
        {/* Category Buttons */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <Button
            key="home"
            variant={feedType === 'trending' && selectedCategory === '' ? 'secondary' : 'outline'}
            onClick={() => {
              setSearchQuery('');
              setFeedType('trending');
              setSelectedCategory('');
              setVideos([]);
              setNextPageToken(null);
              loadTrendingVideos();
            }}
            className={feedType === 'trending' && selectedCategory === '' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
          >
            Home
          </Button>
          <Button
            key="shorts"
            variant={feedType === 'shorts' ? 'secondary' : 'outline'}
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('');
              setFeedType('shorts');
              setVideos([]);
              setNextPageToken(null);
              loadShortsVideos();
            }}
            className={feedType === 'shorts' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
          >
            Shorts
          </Button>
          {CATEGORY_MAP.map((cat) => (
            <Button
              key={cat.name}
              variant={selectedCategory === cat.id && feedType === 'trending' ? 'secondary' : 'outline'}
              onClick={() => {
                setSearchQuery('');
                setFeedType('trending');
                setSelectedCategory(cat.id);
                setVideos([]);
                setNextPageToken(null);
                loadTrendingVideos(cat.id);
              }}
              className={selectedCategory === cat.id && feedType === 'trending' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 🔥 Title */}
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">
          {searchQuery.trim()
            ? '🔍 Search Results'
            : feedType === 'shorts'
              ? '▶️ Shorts'
              : '🔥 Trending in Philippines'}
        </h1>

        {/* 🎥 Videos */}
        {loading || (!Array.isArray(videos) || videos.length === 0) && !showNoVideos ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-48 rounded-xl" />
            ))}
          </div>
        ) : Array.isArray(videos) && videos.length > 0 ? (
          searchQuery.trim() ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {videos.map((video, idx) => (
                <VideoCard
                  key={String(video.id?.videoId || video.id || video.title || idx)}
                  video={video}
                  onNavigate={saveHomeState}
                />
              ))}
            </div>
          ) : feedType === 'shorts' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {videos.map((video, idx) => (
                <ShortCard
                  key={String(video.id || video.title || idx)}
                  video={video}
                  onNavigate={saveHomeState}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
          <p className="text-center text-gray-500">No videos found.</p>
        ) : null}

        {/* Infinite scroll loader */}
        {!searchQuery && nextPageToken && (
          <div ref={loaderRef} className="h-12 flex items-center justify-center">
            {isFetchingMore && <span className="text-gray-500">Loading more...</span>}
          </div>
        )}
      </div>
    </main>
  );
}
