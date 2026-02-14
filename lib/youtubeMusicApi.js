'use client';

export async function musicSearch(query) {
  const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Music search failed');
  return data;
}

export async function fetchRelated(videoId) {
  const res = await fetch(`/api/music/related?videoId=${encodeURIComponent(videoId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Related fetch failed');
  return data;
}
