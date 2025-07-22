'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCount, formatTimeAgo } from '@/utils/formatters';

export default function WatchPage() {
  const { id } = useParams();
  const router = useRouter();

  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [queue, setQueue] = useState([]); // Playlist queue
  const [currentIndex, setCurrentIndex] = useState(0); // Index in queue
  const [loading, setLoading] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [loop, setLoop] = useState(false); // Loop playlist state
  const [minimized, setMinimized] = useState(false); // Mini-player state
  const [categoryId, setCategoryId] = useState(null); // Store categoryId for related videos
  const playerRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false); // Track if player is ready

  const localKey = `video-${id}`;
  // Always use the id from the URL for the main video player
  const videoId = id;
  const videoUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3`;



  // Load YouTube IFrame API once and create player on mount
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    } else {
      setupPlayer();
    }
    window.onYouTubeIframeAPIReady = () => {
      setupPlayer();
    };
    // eslint-disable-next-line
  }, []);

  // When videoId changes, load new video if player is ready
  useEffect(() => {
    if (playerReady && playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById(videoId);
    }
    // eslint-disable-next-line
  }, [videoId, playerReady]);

  // Fetch video details, comments, and related videos (queue)
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchVideoDetails(id);
    fetchComments(id);
    // fetchQueue now depends on categoryId
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchQueue(id);
  }, [id, categoryId]);

  // Update currentIndex when id changes (if not in queue, reset to -1)
  useEffect(() => {
    if (!queue.length) return;
    // Filter out any items without a valid videoId
    const filteredQueue = queue.filter((v) => v.id && v.id.videoId);
    if (filteredQueue.length !== queue.length) setQueue(filteredQueue);
    const idx = filteredQueue.findIndex((v) => v.id.videoId === id);
    setCurrentIndex(idx); // -1 if not found
  }, [id, queue]);

  const setupPlayer = () => {
    setPlayerReady(false);
    // Clear the player container before creating a new player
    const container = document.getElementById('youtube-player-container');
    if (container) {
      container.innerHTML = '';
    }
    if (playerRef.current) {
      playerRef.current.destroy();
    }
    playerRef.current = new window.YT.Player('youtube-player-container', {
      videoId: videoId,
      events: {
        onReady: () => setPlayerReady(true),
        onStateChange: (event) => {
          console.log('YouTube Player onStateChange:', event.data, 'PlayerState.ENDED:', window.YT.PlayerState.ENDED, 'autoplay:', autoplay);
          if (event.data === window.YT.PlayerState.ENDED && autoplay) {
            goToNextVideo();
          }
        },
      },
      playerVars: {
        autoplay: 1,
        enablejsapi: 1,
        rel: 0,
        modestbranding: 1,
        showinfo: 0,
        iv_load_policy: 3,
      },
    });
  };

  const goToNextVideo = () => {
    console.log('goToNextVideo called.');
    const filteredQueue = queue.filter((v) => v.id && v.id.videoId);
    if (filteredQueue.length > 0) {
      const idx = filteredQueue.findIndex((v) => v.id.videoId === id);
      if (idx === -1) {
        // If current video is not in the queue, play the first video in the queue
        const firstId = filteredQueue[0].id.videoId;
        if (firstId) {
          console.log('Auto-next: Navigating to first up next video:', firstId);
          router.push(`/watch/${firstId}`);
        }
      } else if (idx < filteredQueue.length - 1) {
        const nextId = filteredQueue[idx + 1].id.videoId;
        if (nextId) {
          console.log('Auto-next: Navigating to next up next video:', nextId);
          router.push(`/watch/${nextId}`);
        }
      } else if (loop && filteredQueue.length > 0) {
        // Loop to first video
        const firstId = filteredQueue[0].id.videoId;
        if (firstId) {
          console.log('Auto-next: Looping to first up next video:', firstId);
          router.push(`/watch/${firstId}`);
        }
      }
    }
  };

  const saveToHistory = (videoId, videoData) => {
    const existing = JSON.parse(localStorage.getItem('watchHistory') || '[]');
    const filtered = existing.filter((item) => item.id !== videoId);
    const updated = [{ id: videoId, ...videoData }, ...filtered].slice(0, 20);
    localStorage.setItem('watchHistory', JSON.stringify(updated));
  };

  const fetchVideoDetails = async (vid) => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${vid}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
      );
      const data = await res.json();
      const item = data.items?.[0];
      if (item) {
        const v = {
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          viewCount: item.statistics.viewCount,
          publishedAt: item.snippet.publishedAt,
        };
        setVideo(v);
        setCategoryId(item.snippet.categoryId || item.categoryId || null); // Store categoryId
        localStorage.setItem(localKey, JSON.stringify(v));
        saveToHistory(id, {
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.medium?.url,
        });
      }
    } catch (err) {
      console.error('Failed to fetch video details', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (vid) => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${vid}&maxResults=10&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
      );
      const data = await res.json();
      setComments(data.items || []);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  };

  // Fetch a longer queue of related videos
  const fetchQueue = async (vid) => {
    try {
      let items = [];
      if (categoryId) {
        // Fetch videos from the same category
        const catRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=PH&videoCategoryId=${categoryId}&maxResults=20&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
        );
        const catData = await catRes.json();
        items = (catData.items || []).filter((v) => v.id !== vid).map((item) => ({
          id: { videoId: item.id },
          snippet: item.snippet,
        }));
      }
      if (!items.length) {
        // Fallback: relatedToVideoId
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?relatedToVideoId=${vid}&type=video&part=snippet&maxResults=20&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
        );
        const data = await res.json();
        items = data.items || [];
      }
      if (!items.length) {
        // Fallback: fetch random videos from popular categories
        const fallbackCategories = ['music', 'news', 'comedy', 'cartoons', 'vlogs'];
        const randomCat = fallbackCategories[Math.floor(Math.random() * fallbackCategories.length)];
        const fallbackRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(randomCat)}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
        );
        const fallbackData = await fallbackRes.json();
        items = fallbackData.items || [];
      }
      // Deduplicate by videoId
      const seen = new Set();
      const deduped = items.filter((v) => {
        const vid = v.id && v.id.videoId;
        if (!vid || seen.has(vid)) return false;
        seen.add(vid);
        return true;
      });
      setQueue(deduped);
    } catch (err) {
      console.error('Failed to fetch related videos', err);
      setQueue([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 🔙 Back Button */}
        <button
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              const lastSearch = typeof window !== 'undefined' ? localStorage.getItem('lastSearchQuery') : '';
              if (lastSearch) {
                router.push(`/?q=${encodeURIComponent(lastSearch)}`);
              } else {
                router.push('/');
              }
            }
          }}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
          aria-label="Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        {/* 📱 PiP Info Banner (mobile only) */}
        <div className="block sm:hidden mb-2">
          <div className="bg-blue-100 text-blue-800 text-sm rounded px-3 py-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12.37V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h7.37M17 17h4v4h-4v-4z" /></svg>
            <span>Tip: Tap the PiP icon in the YouTube player to watch in Picture-in-Picture mode.</span>
          </div>
        </div>
        {/* 📺 Video Player */}
        <div className={minimized ? 'fixed bottom-4 right-4 z-50 w-80 h-44 shadow-2xl rounded-xl overflow-hidden bg-black' : ''} style={minimized ? { maxWidth: '320px', maxHeight: '180px' } : {}}>
          <Card className={minimized ? 'w-full h-full rounded-xl overflow-hidden' : 'w-full shadow-xl rounded-2xl overflow-hidden mb-4'}>
            <CardContent className={minimized ? 'relative w-full h-full p-0' : 'relative aspect-video p-0'}>
              <div id="youtube-player-container" className="absolute inset-0 w-full h-full" />
              {/* Minimize/Restore Button */}
              <button
                onClick={() => setMinimized((m) => !m)}
                className={
                  minimized
                    ? 'absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1 shadow'
                    : 'absolute top-2 right-2 bg-black/60 hover:bg-black text-white rounded-full p-1 shadow'
                }
                style={{ zIndex: 10 }}
                aria-label={minimized ? 'Restore player' : 'Minimize player'}
              >
                {minimized ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19H5V5" /></svg>
                )}
              </button>
            </CardContent>
          </Card>
        </div>

        {/* 📝 Metadata + Subscribe */}
        {!loading && video && (
          <div className="bg-white p-4 rounded-xl shadow mb-6 flex justify-between items-start flex-col sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                {video.title}
              </h1>
              <p className="text-sm text-gray-600">{video.channelTitle}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCount(video.viewCount)} views • {formatTimeAgo(video.publishedAt)}
              </p>
            </div>
            <Button variant="destructive" className="mt-4 sm:mt-0">
              Subscribe
            </Button>
          </div>
        )}

        {/* 💬 Comments with Scroll */}
        <div className="bg-white p-4 rounded-xl shadow mb-6">
          <h2 className="text-lg font-semibold mb-3">Comments</h2>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {comments.length === 0 && (
                <p className="text-gray-500">No comments found.</p>
              )}
              {comments.map((c) => {
                const cm = c.snippet.topLevelComment.snippet;
                return (
                  <div
                    key={c.id}
                    className="bg-gray-50 p-3 rounded shadow-sm"
                  >
                    <p className="text-sm font-medium">{cm.authorDisplayName}</p>
                    <p
                      className="text-sm text-gray-700"
                      dangerouslySetInnerHTML={{ __html: cm.textDisplay }}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* 🎞️ Playlist/Up Next */}
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Up Next</h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={() => setAutoplay((a) => !a)}
                  className="accent-blue-600"
                />
                Autoplay
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={() => setLoop((l) => !l)}
                  className="accent-green-600"
                />
                Loop playlist
              </label>
            </div>
          </div>
          <div className="space-y-3">
            {(queue.length > 0 ? queue : [{
              id: { videoId: id },
              snippet: {
                title: video?.title || 'Current Video',
                channelTitle: video?.channelTitle || '',
                thumbnails: { default: { url: `https://i.ytimg.com/vi/${id}/default.jpg` } },
              },
            }]).map((vid, idx) => (
              <div
                key={vid.id.videoId}
                className={`cursor-pointer p-2 rounded flex items-center gap-3 ${vid.id.videoId === id ? 'bg-blue-100 font-bold' : idx === currentIndex + 1 ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                onClick={() => router.push(`/watch/${vid.id.videoId}`)}
              >
                <img
                  src={vid.snippet.thumbnails?.default?.url}
                  alt={vid.snippet.title}
                  className="w-16 h-10 object-cover rounded"
                />
                <div>
                  <p className="text-sm line-clamp-2">{vid.snippet.title}</p>
                  <p className="text-xs text-gray-500">{vid.snippet.channelTitle}</p>
                  {vid.id.videoId === id && <span className="text-xs text-blue-600">Now Playing</span>}
                  {vid.id.videoId !== id && idx === currentIndex + 1 && <span className="text-xs text-gray-600">Up Next</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}