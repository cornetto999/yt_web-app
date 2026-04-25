'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadYouTubeIframeAPI } from '@/lib/youtubeIframe';
import { fetchRelated } from '@/lib/youtubeMusicApi';

const PlayerContext = createContext(null);

const STORAGE_KEY = 'musicPlayerState_v1';

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function dedupeById(list) {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    const id = item?.id;
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function normalizeTrack(raw) {
  const id = raw?.id?.videoId || raw?.id;
  if (!id) return null;
  return {
    id,
    title: raw?.title || raw?.snippet?.title || 'Untitled Video',
    channelTitle: raw?.channelTitle || raw?.snippet?.channelTitle || 'Unknown Channel',
    thumbnailUrl:
      raw?.thumbnailUrl ||
      raw?.snippet?.thumbnails?.high?.url ||
      raw?.snippet?.thumbnails?.medium?.url ||
      raw?.snippet?.thumbnails?.default?.url ||
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    duration: raw?.duration || '',
  };
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function PlayerProvider({ children }) {
  const containerId = 'yt-music-iframe-player';

  const playerRef = useRef(null);
  const creatingPlayerRef = useRef(false);
  const playerReadyRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const relatedFetchInFlightRef = useRef(false);
  const hostElRef = useRef(null);
  const queueRef = useRef([]);
  const currentIndexRef = useRef(0);
  const currentTrackRef = useRef(null);

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplay, setAutoplayState] = useState(true);
  const [volume, setVolumeState] = useState(80);
  const [blockedAutoplay, setBlockedAutoplay] = useState(false);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [currentTimeText, setCurrentTimeText] = useState('0:00');
  const [currentDurationText, setCurrentDurationText] = useState('');

  const currentTrack = queue?.[currentIndex] || null;

  useEffect(() => {
    queueRef.current = queue;
    currentIndexRef.current = currentIndex;
    currentTrackRef.current = currentTrack;
  }, [queue, currentIndex, currentTrack]);

  // Ensure the host DOM node exists outside React-managed tree.
  // This avoids DOM reconciliation issues when the YouTube API mutates the node.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let el = document.getElementById(containerId);
    if (!el) {
      el = document.createElement('div');
      el.id = containerId;
      el.style.position = 'fixed';
      el.style.width = '1px';
      el.style.height = '1px';
      el.style.overflow = 'hidden';
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      el.style.left = '-9999px';
      el.style.top = '-9999px';
      document.body.appendChild(el);
    }

    hostElRef.current = el;
  }, []);

  // Restore persisted state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = safeParse(localStorage.getItem(STORAGE_KEY) || '', null);
    if (!saved) return;

    if (Array.isArray(saved.queue)) setQueue(saved.queue);
    if (typeof saved.currentIndex === 'number') setCurrentIndex(saved.currentIndex);
    if (typeof saved.autoplay === 'boolean') setAutoplayState(saved.autoplay);
    if (typeof saved.volume === 'number') setVolumeState(saved.volume);
    if (typeof saved.isPlaying === 'boolean') setIsPlaying(saved.isPlaying);

    // Attempt to resume (may be blocked until user interacts)
    if (saved.isPlaying) pendingPlayRef.current = true;
  }, []);

  // Persist state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      queue,
      currentIndex,
      isPlaying,
      autoplay,
      volume,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch { }
  }, [queue, currentIndex, isPlaying, autoplay, volume]);

  const ensurePlayer = useCallback(async () => {
    if (typeof window === 'undefined') return null;

    await loadYouTubeIframeAPI();
    if (playerRef.current) return playerRef.current;

    // Guard against double creation (React Strict Mode / fast refresh)
    if (creatingPlayerRef.current) return null;
    creatingPlayerRef.current = true;

    const el = hostElRef.current || document.getElementById(containerId);
    if (!el) {
      creatingPlayerRef.current = false;
      return null;
    }

    try {
      playerRef.current = new window.YT.Player(el, {
        height: '0',
        width: '0',
        playerVars: {
          autoplay: 0,
          enablejsapi: 1,
          playsinline: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            try {
              playerRef.current.setVolume(volume);
            } catch { }

            const pendingTrack = currentTrackRef.current;
            if (pendingPlayRef.current && pendingTrack?.id) {
              pendingPlayRef.current = false;
              // Try resume
              try {
                playerRef.current.loadVideoById(pendingTrack.id);
                playerRef.current.playVideo();
                setIsPlaying(true);
                setBlockedAutoplay(false);
              } catch {
                setBlockedAutoplay(true);
                setIsPlaying(false);
              }
            }
          },
          onStateChange: (event) => {
            if (!window.YT || !window.YT.PlayerState) return;

            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setBlockedAutoplay(false);
            }

            if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              if (autoplay) {
                // Avoid calling next() inline before state settles
                setTimeout(() => {
                  try {
                    // use imperative to avoid stale closures
                    window.dispatchEvent(new CustomEvent('music-player:next'));
                  } catch { }
                }, 0);
              } else {
                setIsPlaying(false);
              }
            }
          },
          onError: () => {
            // Skip track on errors if autoplay is enabled
            if (autoplay) {
              try {
                window.dispatchEvent(new CustomEvent('music-player:next'));
              } catch { }
            }
          },
        },
      });

      return playerRef.current;
    } finally {
      creatingPlayerRef.current = false;
    }
  }, [autoplay, containerId, volume]);

  // Create player on mount
  useEffect(() => {
    ensurePlayer();
  }, [ensurePlayer]);

  // Sync volume to player
  useEffect(() => {
    if (!playerRef.current || !playerReadyRef.current) return;
    try {
      playerRef.current.setVolume(volume);
    } catch { }
  }, [volume]);

  // Keep live time and duration fallbacks from the active YouTube player.
  useEffect(() => {
    const fallbackDuration = currentTrack?.duration || '';
    if (!currentTrack?.id) {
      setCurrentTimeSeconds(0);
      setCurrentTimeText('0:00');
      setCurrentDurationText('');
      return;
    }

    const syncTiming = () => {
      const player = playerRef.current;
      if (!player || typeof player.getDuration !== 'function') {
        setCurrentTimeSeconds(0);
        setCurrentTimeText('0:00');
        setCurrentDurationText(fallbackDuration);
        return;
      }

      try {
        const currentTime = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
        const duration = player.getDuration();
        setCurrentTimeSeconds(currentTime);
        setCurrentTimeText(formatDuration(currentTime));
        if (duration > 0) {
          setCurrentDurationText(formatDuration(duration));
          return;
        }
      } catch { }

      setCurrentTimeSeconds(0);
      setCurrentTimeText('0:00');
      setCurrentDurationText(fallbackDuration);
    };

    syncTiming();
    const intervalId = window.setInterval(syncTiming, 1000);
    return () => window.clearInterval(intervalId);
  }, [currentTrack?.id, currentTrack?.duration]);

  const playTrack = useCallback(async (video, nextQueue) => {
    if (!video?.id) return;

    // Update queue first
    if (Array.isArray(nextQueue) && nextQueue.length) {
      const normalized = dedupeById(nextQueue);
      queueRef.current = normalized;
      setQueue(normalized);
      const idx = normalized.findIndex((v) => v?.id === video.id);
      currentIndexRef.current = idx >= 0 ? idx : 0;
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else {
      // Ensure current track exists in queue
      setQueue((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        const merged = dedupeById([video, ...base]);
        queueRef.current = merged;
        return merged;
      });
      currentIndexRef.current = 0;
      setCurrentIndex(0);
    }
    currentTrackRef.current = video;

    const p = await ensurePlayer();
    if (!p) return;

    try {
      p.loadVideoById(video.id);
      p.playVideo();
      setIsPlaying(true);
      setBlockedAutoplay(false);
    } catch {
      // Most likely blocked by browser autoplay policies
      setBlockedAutoplay(true);
      setIsPlaying(false);
    }
  }, [ensurePlayer]);

  const togglePlay = useCallback(async () => {
    const p = await ensurePlayer();
    if (!p) return;

    try {
      const state = p.getPlayerState?.();
      if (state === window.YT.PlayerState.PLAYING) {
        p.pauseVideo();
        setIsPlaying(false);
        return;
      }

      const track = currentTrackRef.current;
      if (track?.id) {
        const shouldLoadTrack =
          state === window.YT.PlayerState.UNSTARTED ||
          state === window.YT.PlayerState.ENDED ||
          state === window.YT.PlayerState.CUED;

        if (shouldLoadTrack) {
          p.loadVideoById(track.id);
        }
      }

      p.playVideo();
      setIsPlaying(true);
      setBlockedAutoplay(false);
    } catch {
      setBlockedAutoplay(true);
      setIsPlaying(false);
    }
  }, [ensurePlayer]);

  const next = useCallback(async () => {
    const activeQueue = queueRef.current || [];
    const activeIndex = currentIndexRef.current;
    const activeTrack = currentTrackRef.current;

    if (!activeQueue.length) return;

    const atEnd = activeIndex >= activeQueue.length - 1;

    if (!atEnd) {
      const nextIdx = activeIndex + 1;
      currentIndexRef.current = nextIdx;
      setCurrentIndex(nextIdx);
      const video = activeQueue[nextIdx];
      if (video?.id) {
        await playTrack(video, activeQueue);
      }
      return;
    }

    // At end: fetch related and append
    if (relatedFetchInFlightRef.current) return;
    if (!activeTrack?.id) return;

    relatedFetchInFlightRef.current = true;
    try {
      const relatedData = await fetchRelated(activeTrack.id);
      const relatedItems = Array.isArray(relatedData?.items) ? relatedData.items : [];

      const merged = dedupeById([...(activeQueue || []), ...relatedItems]);
      queueRef.current = merged;
      setQueue(merged);

      const startIdx = activeQueue.length;
      const firstRelated = merged[startIdx];
      if (firstRelated?.id) {
        currentIndexRef.current = startIdx;
        setCurrentIndex(startIdx);
        await playTrack(firstRelated, merged);
      }
    } catch {
      // If related fails, just stop
      setIsPlaying(false);
    } finally {
      relatedFetchInFlightRef.current = false;
    }
  }, [playTrack]);

  const prev = useCallback(async () => {
    const activeQueue = queueRef.current || [];
    const activeIndex = currentIndexRef.current;
    if (!activeQueue.length) return;
    const prevIdx = Math.max(0, activeIndex - 1);
    currentIndexRef.current = prevIdx;
    setCurrentIndex(prevIdx);
    const video = activeQueue[prevIdx];
    if (video?.id) {
      await playTrack(video, activeQueue);
    }
  }, [playTrack]);

  const setAutoplay = useCallback((v) => {
    setAutoplayState(Boolean(v));
  }, []);

  const setVolume = useCallback((v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return;
    const nextVolume = Math.max(0, Math.min(100, n));
    setVolumeState(nextVolume);
    const player = playerRef.current;
    if (!player || typeof player.setVolume !== 'function') return;
    try {
      player.setVolume(nextVolume);
    } catch { }
  }, []);

  // Custom events for compatibility / imperative control
  useEffect(() => {
    const onNext = () => next();
    const onStop = async () => {
      const p = await ensurePlayer();
      if (p && typeof p.pauseVideo === 'function') {
        try { p.pauseVideo(); } catch { }
      }
      setIsPlaying(false);
    };
    const onStart = async (event) => {
      const payload = event?.detail || {};
      const id = payload?.id?.videoId || payload?.id;
      if (!id) return;

      const track = normalizeTrack({
        id,
        title: payload.title,
        channelTitle: payload.channelTitle,
        thumbnailUrl: payload.thumbnailUrl,
        duration: payload.duration,
      });
      if (!track) return;

      const normalizedQueue = Array.isArray(payload?.queue)
        ? dedupeById(payload.queue.map((item) => normalizeTrack(item)).filter(Boolean))
        : [];

      const nextQueue = normalizedQueue.length ? normalizedQueue : [track];
      const idx = nextQueue.findIndex((item) => item?.id === track.id);
      const startIndex = idx >= 0 ? idx : 0;

      setQueue(nextQueue);
      setCurrentIndex(startIndex);

      const p = await ensurePlayer();
      if (!p) return;

      try {
        p.loadVideoById(track.id, typeof payload?.time === 'number' ? payload.time : 0);
        if (typeof payload?.time === 'number' && payload.time > 0) {
          try { p.seekTo(payload.time, true); } catch { }
        }
        p.playVideo();
        setIsPlaying(true);
        setBlockedAutoplay(false);
      } catch {
        setBlockedAutoplay(true);
        setIsPlaying(false);
      }
    };

    window.addEventListener('music-player:next', onNext);
    window.addEventListener('mini-player:stop', onStop);
    window.addEventListener('mini-player:start', onStart);

    return () => {
      window.removeEventListener('music-player:next', onNext);
      window.removeEventListener('mini-player:stop', onStop);
      window.removeEventListener('mini-player:start', onStart);
    };
  }, [ensurePlayer, next]);

  const value = useMemo(() => {
    return {
      currentTrack,
      queue,
      currentIndex,
      isPlaying,
      autoplay,
      volume,
      currentTimeSeconds,
      currentTimeText,
      currentDurationText,
      blockedAutoplay,
      playTrack,
      togglePlay,
      next,
      prev,
      setAutoplay,
      setVolume,
    };
  }, [currentTrack, queue, currentIndex, isPlaying, autoplay, volume, currentTimeSeconds, currentTimeText, currentDurationText, blockedAutoplay, playTrack, togglePlay, next, prev, setAutoplay, setVolume]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
