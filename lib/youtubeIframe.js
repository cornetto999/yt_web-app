'use client';

let iframeApiPromise = null;

export function loadYouTubeIframeAPI() {
  if (typeof window === 'undefined') return Promise.resolve(null);

  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (iframeApiPromise) return iframeApiPromise;

  iframeApiPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') {
        try { prev(); } catch {}
      }
      resolve(window.YT);
    };

    // Fallback: some browsers/extensions may call ready before we set handler
    const check = () => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      setTimeout(check, 50);
    };
    check();
  });

  return iframeApiPromise;
}
