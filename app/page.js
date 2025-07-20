'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import VideoCard from '@/components/VideoCard';

export default function HomePage() {
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const loaderRef = useRef();

  // Always clear search and load trending on mount
  useEffect(() => {
    setSearchQuery('');
    setVideos([]);
    setNextPageToken(null);
    loadTrendingVideos();
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current || !nextPageToken || searchQuery) return;
    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingMore) {
          fetchMoreTrendingVideos();
        }
      },
      { threshold: 1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [nextPageToken, isFetchingMore, searchQuery]);

  // 🔍 Search or reset
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setVideos([]);
      setNextPageToken(null);
      loadTrendingVideos();
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setVideos(data);
      setNextPageToken(null);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Load trending (first page)
  const loadTrendingVideos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/trending');
      const data = await res.json();
      setVideos(data.items);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      console.error('Failed to load trending videos', err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Fetch more trending (pagination)
  const fetchMoreTrendingVideos = useCallback(async () => {
    if (!nextPageToken) return;
    setIsFetchingMore(true);
    try {
      const res = await fetch(`/api/trending?pageToken=${nextPageToken}`);
      const data = await res.json();
      setVideos((prev) => [...prev, ...data.items]);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      console.error('Failed to fetch more trending videos', err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [nextPageToken]);

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
      </div>

      {/* 🔥 Title */}
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">
          {searchQuery.trim() ? '🔍 Search Results' : '🔥 Trending in Philippines'}
        </h1>

        {/* 🎥 Videos */}
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}

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
