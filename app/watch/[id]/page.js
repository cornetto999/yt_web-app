'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useRef } from 'react';
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
  const autoplayRef = useRef(autoplay); // Use ref to track autoplay state
  const [lastPlayerState, setLastPlayerState] = useState(null); // Track last player state
  const checkIntervalRef = useRef(null); // Ref for interval
  const [searchQuery, setSearchQuery] = useState(''); // Search query for watch page
  const [searchResults, setSearchResults] = useState([]); // Search results
  const [showSearchResults, setShowSearchResults] = useState(false); // Show search results
  const [playerVolume, setPlayerVolume] = useState(80); // Watch player volume
  const handoffRef = useRef(() => { });

  // Update autoplay ref whenever autoplay state changes
  useEffect(() => {
    autoplayRef.current = autoplay;
  }, [autoplay]);

  // Handle user interaction to enable autoplay
  useEffect(() => {
    const handleUserInteraction = () => {
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        try {
          playerRef.current.playVideo();
        } catch (err) {
          // Silently handle errors
        }
      }
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // Periodic check for player state as backup
  useEffect(() => {
    if (playerReady && playerRef.current) {
      checkIntervalRef.current = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
          try {
            const currentState = playerRef.current.getPlayerState();
            if (currentState !== lastPlayerState) {
              setLastPlayerState(currentState);

              // Check if video ended
              if (currentState === window.YT.PlayerState.ENDED && autoplayRef.current) {
                setTimeout(() => {
                  goToNextVideo();
                }, 1000);
              }
            }
          } catch (err) {
            // Silently handle errors
          }
        }
      }, 2000); // Check every 2 seconds
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [playerReady, lastPlayerState]);

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
    // Ensure any existing mini-player stops when entering watch page
    try {
      const stopEvt = new CustomEvent('mini-player:stop');
      window.dispatchEvent(stopEvt);
    } catch { }
    window.onYouTubeIframeAPIReady = () => {
      setupPlayer();
    };
    // eslint-disable-next-line
  }, []);

  // When videoId changes, load new video if player is ready
  useEffect(() => {
    if (playerReady && playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById(videoId);
      // Ensure the new video starts playing with multiple attempts
      const playVideo = () => {
        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
          try {
            playerRef.current.playVideo();
          } catch (err) {
            console.log('Play video failed, retrying...');
            setTimeout(playVideo, 1000);
          }
        }
      };

      // Try to play immediately
      setTimeout(playVideo, 500);
      // Backup attempt after 2 seconds
      setTimeout(playVideo, 2000);
      // Final attempt after 4 seconds
      setTimeout(playVideo, 4000);
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
        onReady: () => {
          setPlayerReady(true);
          try {
            if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
              playerRef.current.setVolume(playerVolume);
            }
          } catch (err) {
            // Ignore volume sync errors while player initializes.
          }
          // Ensure video starts playing with multiple attempts
          const playVideo = () => {
            if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
              try {
                playerRef.current.playVideo();
              } catch (err) {
                console.log('Play video failed, retrying...');
                setTimeout(playVideo, 1000);
              }
            }
          };

          // Try to play immediately
          setTimeout(playVideo, 500);
          // Backup attempt after 2 seconds
          setTimeout(playVideo, 2000);
        },
        onStateChange: (event) => {
          // Check if video ended and autoplay is enabled
          if (event.data === window.YT.PlayerState.ENDED && autoplayRef.current) {
            // Add a small delay to ensure the player state is fully updated
            setTimeout(() => {
              goToNextVideo();
            }, 1000);
          }
        },
        onError: (event) => {
          console.error('YouTube Player error:', event.data);
        }
      },
      playerVars: {
        autoplay: 1,
        enablejsapi: 1,
        rel: 0,
        modestbranding: 1,
        showinfo: 0,
        iv_load_policy: 3,
        start: 0,
        playsinline: 1,
        mute: 0,
        controls: 1,
        fs: 1,
        cc_load_policy: 0,
        disablekb: 0,
      },
    });
  };

  const goToNextVideo = () => {
    const filteredQueue = queue.filter((v) => v.id && v.id.videoId);

    if (filteredQueue.length > 0) {
      const idx = filteredQueue.findIndex((v) => v.id.videoId === id);

      if (idx === -1) {
        // If current video is not in the queue, play the first video in the queue
        const firstId = filteredQueue[0].id.videoId;
        if (firstId) {
          router.push(`/watch/${firstId}`);
        }
      } else if (idx < filteredQueue.length - 1) {
        // There's a next video in the queue
        const nextId = filteredQueue[idx + 1].id.videoId;
        if (nextId) {
          router.push(`/watch/${nextId}`);
        }
      } else if (loop && filteredQueue.length > 1) {
        // Loop to second video (skip the current one at index 0)
        const nextId = filteredQueue[1].id.videoId;
        if (nextId) {
          router.push(`/watch/${nextId}`);
        }
      }
    }
  };

  const handoffToMiniPlayer = useCallback(() => {
    if (!videoId) return;

    const time = playerRef.current && typeof playerRef.current.getCurrentTime === 'function'
      ? Math.floor(playerRef.current.getCurrentTime())
      : 0;

    const handoffQueue = (queue || [])
      .map((item) => {
        const queueVideoId = item?.id?.videoId || item?.id;
        if (!queueVideoId) return null;
        return {
          id: queueVideoId,
          title: item?.snippet?.title || '',
          channelTitle: item?.snippet?.channelTitle || '',
          thumbnailUrl:
            item?.snippet?.thumbnails?.high?.url ||
            item?.snippet?.thumbnails?.medium?.url ||
            item?.snippet?.thumbnails?.default?.url ||
            `https://i.ytimg.com/vi/${queueVideoId}/hqdefault.jpg`,
        };
      })
      .filter(Boolean);

    try {
      const event = new CustomEvent('mini-player:start', {
        detail: {
          id: videoId,
          time,
          title: video?.title || 'Current Video',
          channelTitle: video?.channelTitle || 'Unknown Channel',
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          queue: handoffQueue,
        },
      });
      window.dispatchEvent(event);
    } catch { }
  }, [videoId, video?.title, video?.channelTitle, queue]);

  useEffect(() => {
    handoffRef.current = handoffToMiniPlayer;
  }, [handoffToMiniPlayer]);

  useEffect(() => {
    return () => {
      if (handoffRef.current) handoffRef.current();
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && handoffRef.current) {
        handoffRef.current();
      }
    };
    const onPageHide = () => {
      if (handoffRef.current) handoffRef.current();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  const playSelectedVideo = useCallback((nextVideoId) => {
    if (!nextVideoId) return;
    setAutoplay(true);
    setMinimized(false);
    setShowSearchResults(false);

    try {
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById(nextVideoId);
      }
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      }
    } catch (err) {
      // Keep navigation fallback even if direct play fails.
    }

    router.push(`/watch/${nextVideoId}`);
  }, [router]);

  useEffect(() => {
    if (!playerRef.current || typeof playerRef.current.setVolume !== 'function') return;
    try {
      playerRef.current.setVolume(playerVolume);
    } catch (err) {
      // Ignore setVolume failures during player transitions.
    }
  }, [playerVolume]);

  // Search functionality
  const handleSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      return;
    }

    // Auto-minimize video player when searching
    if (!minimized) {
      setMinimized(true);
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
      setShowSearchResults(true);
    } catch (err) {
      console.error('Search failed', err);
      setSearchResults([]);
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
        // Fallback: Search for videos with similar title/keywords
        try {
          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(video?.title || 'music')}&type=video&part=snippet&maxResults=20&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
          );
          const data = await res.json();
          items = (data.items || []).filter((v) => v.id.videoId !== vid);
        } catch (err) {
          // Silently handle search fallback errors
        }
      }

      if (!items.length) {
        // Fallback: fetch random videos from popular categories
        try {
          const fallbackCategories = ['music', 'news', 'comedy', 'cartoons', 'vlogs'];
          const randomCat = fallbackCategories[Math.floor(Math.random() * fallbackCategories.length)];
          const fallbackRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(randomCat)}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
          );
          const fallbackData = await fallbackRes.json();
          items = (fallbackData.items || []).filter((v) => v.id.videoId !== vid);
        } catch (err) {
          // Silently handle fallback search errors
        }
      }

      // Deduplicate by videoId
      const seen = new Set();
      const deduped = items.filter((v) => {
        const vid = v.id && v.id.videoId;
        if (!vid || seen.has(vid)) return false;
        seen.add(vid);
        return true;
      });

      // Always add the current video to the beginning of the queue
      const currentVideoInQueue = deduped.find(v => v.id.videoId === vid);
      if (!currentVideoInQueue) {
        deduped.unshift({
          id: { videoId: vid },
          snippet: {
            title: video?.title || 'Current Video',
            channelTitle: video?.channelTitle || 'Unknown Channel',
            thumbnails: {
              default: { url: `https://i.ytimg.com/vi/${vid}/default.jpg` },
              medium: { url: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg` },
              high: { url: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` }
            },
          },
        });
      }

      // If we still don't have any videos, add some default popular videos as fallback
      if (deduped.length === 0) {
        // Add some popular video IDs as fallback
        const fallbackVideoIds = [
          'dQw4w9WgXcQ', // Rick Roll (very popular)
          'kJQP7kiw5Fk', // Despacito
          '9bZkp7q19f0', // PSY - GANGNAM STYLE
          'YQHsXMglC9A', // Hello - Adele
          'fJ9rUzIMcZQ', // Queen - Bohemian Rhapsody
        ];

        fallbackVideoIds.forEach((fallbackId, index) => {
          if (fallbackId !== vid) {
            deduped.push({
              id: { videoId: fallbackId },
              snippet: {
                title: `Fallback Video ${index + 1}`,
                channelTitle: 'Popular Videos',
                thumbnails: { default: { url: `https://i.ytimg.com/vi/${fallbackId}/default.jpg` } },
              },
            });
          }
        });

        // Always add the current video as well
        deduped.unshift({
          id: { videoId: vid },
          snippet: {
            title: video?.title || 'Current Video',
            channelTitle: video?.channelTitle || 'Unknown Channel',
            thumbnails: { default: { url: `https://i.ytimg.com/vi/${vid}/default.jpg` } },
          },
        });
      }

      setQueue(deduped);
    } catch (err) {
      console.error('Failed to fetch related videos', err);
      // Even on error, add some fallback videos
      const fallbackVideoIds = [
        'dQw4w9WgXcQ', // Rick Roll
        'kJQP7kiw5Fk', // Despacito
        '9bZkp7q19f0', // PSY - GANGNAM STYLE
        'YQHsXMglC9A', // Hello - Adele
        'fJ9rUzIMcZQ', // Queen - Bohemian Rhapsody
      ];

      const fallbackQueue = fallbackVideoIds.map((fallbackId, index) => ({
        id: { videoId: fallbackId },
        snippet: {
          title: `Fallback Video ${index + 1}`,
          channelTitle: 'Popular Videos',
          thumbnails: { default: { url: `https://i.ytimg.com/vi/${fallbackId}/default.jpg` } },
        },
      }));

      // Add current video to the beginning
      fallbackQueue.unshift({
        id: { videoId: vid },
        snippet: {
          title: video?.title || 'Current Video',
          channelTitle: video?.channelTitle || 'Unknown Channel',
          thumbnails: { default: { url: `https://i.ytimg.com/vi/${vid}/default.jpg` } },
        },
      });

      setQueue(fallbackQueue);
    }
  };

  return (
    <div className="min-h-screen p-4 pb-24 pt-6 md:p-6">
      <div className="mx-auto max-w-5xl">
        {/* 🔙 Back Button & 🔍 Search Bar */}
        <div className="glass-panel mb-6 flex items-center gap-4 rounded-2xl p-3 md:p-4">
          <button
            onClick={() => {
              handoffToMiniPlayer();

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
            className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-white hover:text-sky-800"
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>

          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos..."
              className="modern-input h-11 flex-1 rounded-xl"
            />
            <button
              type="submit"
              className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Search
            </button>
          </form>
        </div>
        {/* 📺 Video Player */}
        <div className={minimized ? 'fixed bottom-4 right-4 z-50 w-80 h-44 shadow-2xl rounded-xl overflow-hidden bg-black' : ''} style={minimized ? { maxWidth: '320px', maxHeight: '180px' } : {}}>
          <Card className={minimized ? 'h-full w-full overflow-hidden rounded-xl' : 'mb-4 w-full overflow-hidden rounded-2xl border-white/70 bg-white/75 shadow-[0_16px_42px_rgba(15,23,42,0.14)] backdrop-blur-sm'}>
            <CardContent className={minimized ? 'relative w-full h-full p-0' : 'relative aspect-video p-0'}>
              {!minimized && <div className="absolute inset-0 bg-gradient-to-br from-slate-900/10 via-transparent to-sky-500/10" />}
              <div id="youtube-player-container" className="absolute inset-0 w-full h-full" />
              {/* Minimize/Restore Button */}
              <button
                onClick={() => setMinimized((m) => !m)}
                className={
                  minimized
                    ? 'absolute right-2 top-2 rounded-full bg-white/80 p-1 text-gray-800 shadow hover:bg-white'
                    : 'absolute right-3 top-3 rounded-full bg-black/65 p-1.5 text-white shadow transition hover:bg-black'
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
              {/* Hand off to global mini player when minimized and navigating away */}
              {minimized && (
                <button
                  onClick={() => {
                    handoffToMiniPlayer();
                  }}
                  className="hidden"
                  aria-hidden
                />
              )}
              {!minimized && (
                <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center gap-3 rounded-xl bg-black/55 px-3 py-2 backdrop-blur">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/90">Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={playerVolume}
                    onChange={(e) => setPlayerVolume(Number(e.target.value))}
                    className="w-full accent-sky-400"
                  />
                  <span className="w-8 text-right text-xs font-semibold text-white/90">{playerVolume}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 🔍 Search Results */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow mb-6">
            <h2 className="text-lg font-semibold mb-3">Search Results</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {searchResults.slice(0, 6).map((result, idx) => (
                <div
                  key={String(result.id?.videoId || result.id || result.title || idx)}
                  onClick={() => {
                    const videoId = result.id?.videoId || result.id;
                    if (videoId) {
                      playSelectedVideo(videoId);
                    }
                  }}
                  className="cursor-pointer group rounded-lg overflow-hidden bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="relative w-full aspect-video bg-gray-200">
                    {result.snippet?.thumbnails?.default?.url ? (
                      <img
                        src={result.snippet.thumbnails.default.url}
                        alt={result.snippet.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-300 flex items-center justify-center text-gray-500 text-sm">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                      {result.snippet?.title || 'Untitled Video'}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {result.snippet?.channelTitle || 'Unknown Channel'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setShowSearchResults(false);
                // Restore video player when hiding search results
                setMinimized(false);
              }}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800"
            >
              Hide Search Results
            </button>
          </div>
        )}

        {/* 📝 Metadata + Subscribe */}
        {!loading && video && (
          <div className="mb-6 flex flex-col items-start justify-between rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.1)] sm:flex-row sm:items-center">
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

        {/* 🎞️ Up Next - YouTube Style */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Up Next</h2>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoplay}
                    onChange={() => setAutoplay((a) => !a)}
                    className="accent-blue-600"
                  />
                  Autoplay
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
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
          </div>

          <div className="p-4">
            <div className="space-y-3">
              {(queue.length > 0 ? queue : [{
                id: { videoId: id },
                snippet: {
                  title: video?.title || 'Current Video',
                  channelTitle: video?.channelTitle || 'Unknown Channel',
                  thumbnails: {
                    default: { url: `https://i.ytimg.com/vi/${id}/default.jpg` },
                    medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` },
                    high: { url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }
                  },
                },
              }]).map((vid, idx) => {
                const queueVideoId = vid?.id?.videoId || vid?.id || null;
                const thumbnailSrc =
                  vid?.snippet?.thumbnails?.maxres?.url ||
                  vid?.snippet?.thumbnails?.high?.url ||
                  vid?.snippet?.thumbnails?.medium?.url ||
                  vid?.snippet?.thumbnails?.default?.url ||
                  (queueVideoId ? `https://i.ytimg.com/vi/${queueVideoId}/hqdefault.jpg` : '/file.svg');

                return (
                <div
                  key={String(queueVideoId || idx)}
                  className={`group cursor-pointer flex gap-3 p-2 rounded-lg transition-colors ${vid.id.videoId === id
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50'
                    }`}
                  onClick={() => {
                    // Ensure autoplay when clicking on videos
                    if (queueVideoId && queueVideoId !== id) playSelectedVideo(queueVideoId);
                  }}
                >
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={thumbnailSrc}
                      alt={vid?.snippet?.title || 'Video thumbnail'}
                      className="w-40 h-24 object-cover rounded-lg"
                      onError={(e) => {
                        const img = e.currentTarget;
                        const fallbackId = queueVideoId || id;
                        if (!img.dataset.fallbackStep) {
                          img.dataset.fallbackStep = '1';
                          img.src = `https://i.ytimg.com/vi/${fallbackId}/mqdefault.jpg`;
                          return;
                        }
                        if (img.dataset.fallbackStep === '1') {
                          img.dataset.fallbackStep = '2';
                          img.src = `https://i.ytimg.com/vi/${fallbackId}/default.jpg`;
                          return;
                        }
                        if (img.dataset.fallbackStep === '2') {
                          img.dataset.fallbackStep = '3';
                          img.src = '/file.svg';
                        }
                      }}
                    />
                    {queueVideoId === id && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                          NOW PLAYING
                        </div>
                      </div>
                    )}
                    {queueVideoId !== id && idx === currentIndex + 1 && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-lg">
                        <div className="bg-white text-gray-800 px-2 py-1 rounded text-xs font-medium">
                          UP NEXT
                        </div>
                      </div>
                    )}
                    {/* Play button overlay for non-current videos */}
                    {queueVideoId !== id && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center rounded-lg transition-all">
                        <div className="w-8 h-8 bg-white bg-opacity-0 group-hover:bg-opacity-90 rounded-full flex items-center justify-center transition-all">
                          <svg className="w-4 h-4 text-gray-800 opacity-0 group-hover:opacity-100" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Video Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {vid?.snippet?.title || 'Untitled Video'}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {vid?.snippet?.channelTitle || 'Unknown Channel'}
                    </p>
                    {vid?.snippet?.publishedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(vid.snippet.publishedAt)}
                      </p>
                    )}
                    {queueVideoId === id && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                        <span className="text-xs text-red-600 font-medium">Now Playing</span>
                      </div>
                    )}
                    {queueVideoId !== id && idx === currentIndex + 1 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-xs text-gray-600 font-medium">Up Next</span>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
