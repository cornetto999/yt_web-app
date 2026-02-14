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

export function PlayerProvider({ children }) {
  const containerId = 'yt-music-iframe-player';

  const playerRef = useRef(null);
  const creatingPlayerRef = useRef(false);
  const playerReadyRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const relatedFetchInFlightRef = useRef(false);
  const hostElRef = useRef(null);

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplay, setAutoplayState] = useState(true);
  const [volume, setVolumeState] = useState(80);
  const [blockedAutoplay, setBlockedAutoplay] = useState(false);

  const currentTrack = queue?.[currentIndex] || null;

  // Ensure the host DOM node exists outside React-managed tree.
  // This avoids DOM reconciliation issues when the YouTube API mutates the node.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let el = document.getElementById(containerId);
    if (!el) {
      el = document.createElement('div');
      el.id = containerId;
      el.style.position = 'fixed';
      el.style.width = '0px';
      el.style.height = '0px';
      el.style.overflow = 'hidden';
      el.style.left = '0px';
      el.style.top = '0px';
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

            if (pendingPlayRef.current && currentTrack?.id) {
              pendingPlayRef.current = false;
              // Try resume
              try {
                playerRef.current.loadVideoById(currentTrack.id);
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
  }, [autoplay, containerId, currentTrack?.id, volume]);

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

  const playTrack = useCallback(async (video, nextQueue) => {
    if (!video?.id) return;

    // Update queue first
    if (Array.isArray(nextQueue) && nextQueue.length) {
      const normalized = dedupeById(nextQueue);
      setQueue(normalized);
      const idx = normalized.findIndex((v) => v?.id === video.id);
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else {
      // Ensure current track exists in queue
      setQueue((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        const merged = dedupeById([video, ...base]);
        return merged;
      });
      setCurrentIndex(0);
    }

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

      if (currentTrack?.id) {
        // If player has no video loaded yet, load it
        try {
          const url = p.getVideoUrl?.();
          if (!url) {
            p.loadVideoById(currentTrack.id);
          }
        } catch { }
      }

      p.playVideo();
      setIsPlaying(true);
      setBlockedAutoplay(false);
    } catch {
      setBlockedAutoplay(true);
      setIsPlaying(false);
    }
  }, [currentTrack?.id, ensurePlayer]);

  const next = useCallback(async () => {
    if (!queue.length) return;

    const atEnd = currentIndex >= queue.length - 1;

    if (!atEnd) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const video = queue[nextIdx];
      if (video?.id) {
        await playTrack(video, queue);
      }
      return;
    }

    // At end: fetch related and append
    if (relatedFetchInFlightRef.current) return;
    if (!currentTrack?.id) return;

    relatedFetchInFlightRef.current = true;
    try {
      const relatedData = await fetchRelated(currentTrack.id);
      const relatedItems = Array.isArray(relatedData?.items) ? relatedData.items : [];

      const merged = dedupeById([...(queue || []), ...relatedItems]);
      setQueue(merged);

      const startIdx = (queue || []).length;
      const firstRelated = merged[startIdx];
      if (firstRelated?.id) {
        setCurrentIndex(startIdx);
        await playTrack(firstRelated, merged);
      }
    } catch {
      // If related fails, just stop
      setIsPlaying(false);
    } finally {
      relatedFetchInFlightRef.current = false;
    }
  }, [queue, currentIndex, currentTrack?.id, playTrack]);

  const prev = useCallback(async () => {
    if (!queue.length) return;
    const prevIdx = Math.max(0, currentIndex - 1);
    setCurrentIndex(prevIdx);
    const video = queue[prevIdx];
    if (video?.id) {
      await playTrack(video, queue);
    }
  }, [queue, currentIndex, playTrack]);

  const setAutoplay = useCallback((v) => {
    setAutoplayState(Boolean(v));
  }, []);

  const setVolume = useCallback((v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return;
    setVolumeState(Math.max(0, Math.min(100, n)));
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

    window.addEventListener('music-player:next', onNext);
    window.addEventListener('mini-player:stop', onStop);

    return () => {
      window.removeEventListener('music-player:next', onNext);
      window.removeEventListener('mini-player:stop', onStop);
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
      blockedAutoplay,
      playTrack,
      togglePlay,
      next,
      prev,
      setAutoplay,
      setVolume,
    };
  }, [currentTrack, queue, currentIndex, isPlaying, autoplay, volume, blockedAutoplay, playTrack, togglePlay, next, prev, setAutoplay, setVolume]);

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
