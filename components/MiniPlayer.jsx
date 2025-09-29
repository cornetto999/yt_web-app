'use client';

import { useEffect, useRef, useState } from 'react';

export default function MiniPlayer() {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [active, setActive] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const saveIntervalRef = useRef(null);

  const ensureApi = () => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve();
      if (window.YT && window.YT.Player) return resolve();
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => resolve();
    });
  };

  const createPlayer = async () => {
    await ensureApi();
    if (!containerRef.current) return;
    if (playerRef.current) return;
    playerRef.current = new window.YT.Player(containerRef.current, {
      playerVars: {
        autoplay: 1,
        enablejsapi: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        controls: 1,
      },
      events: {},
    });
  };

  const persistState = (payload) => {
    try {
      const existing = JSON.parse(sessionStorage.getItem('miniPlayerState') || '{}');
      const next = { ...existing, ...payload };
      sessionStorage.setItem('miniPlayerState', JSON.stringify(next));
    } catch {}
  };

  const startSavingTime = () => {
    if (saveIntervalRef.current) return;
    saveIntervalRef.current = setInterval(() => {
      try {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const t = Math.floor(playerRef.current.getCurrentTime() || 0);
          persistState({ time: t });
        }
      } catch {}
    }, 1000);
  };

  const stopSavingTime = () => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
  };

  const start = async ({ id, time = 0 }) => {
    setActive(true);
    await createPlayer();

    // If already playing same video, avoid reloading; optionally seek forward
    try {
      const playingSame = currentVideoId && currentVideoId === id;
      if (playingSame && playerRef.current) {
        if (typeof playerRef.current.getCurrentTime === 'function' && typeof playerRef.current.seekTo === 'function') {
          const cur = Math.floor(playerRef.current.getCurrentTime() || 0);
          if (Math.abs(cur - time) > 2 && time > cur) {
            playerRef.current.seekTo(time, true);
          }
        }
        try { playerRef.current.playVideo(); } catch {}
      } else if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById({ videoId: id, startSeconds: time });
        setCurrentVideoId(id);
        try { playerRef.current.playVideo(); } catch {}
      }
    } catch {}

    persistState({ active: true, id, time });
    startSavingTime();
  };

  const stop = () => {
    if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
      try { playerRef.current.stopVideo(); } catch {}
    }
    setActive(false);
    stopSavingTime();
    persistState({ active: false });
  };

  useEffect(() => {
    const onStart = (e) => start(e.detail || {});
    const onStop = () => stop();
    window.addEventListener('mini-player:start', onStart);
    window.addEventListener('mini-player:stop', onStop);
    // Resume from session if previously active
    try {
      const saved = JSON.parse(sessionStorage.getItem('miniPlayerState') || '{}');
      if (saved && saved.active && saved.id) {
        start({ id: saved.id, time: saved.time || 0 });
      }
    } catch {}
    return () => {
      window.removeEventListener('mini-player:start', onStart);
      window.removeEventListener('mini-player:stop', onStop);
      stopSavingTime();
    };
  }, []);

  return (
    <div
      className={active ? 'fixed bottom-4 right-4 z-50 w-80 h-44 shadow-2xl rounded-xl overflow-hidden bg-black' : 'hidden'}
      style={{ maxWidth: '320px', maxHeight: '180px' }}
    >
      <div ref={containerRef} className="w-full h-full" />
      <button
        onClick={stop}
        className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1 shadow"
        aria-label="Close mini player"
      >
        ×
      </button>
    </div>
  );
}


