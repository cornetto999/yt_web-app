import { parseISO8601Duration } from '@/utils/parseDuration';

function mapVideoItem(item, extra = {}) {
  const id = item?.id?.videoId || item?.id;
  return {
    id,
    title: item?.snippet?.title || '',
    channelTitle: item?.snippet?.channelTitle || '',
    thumbnailUrl: item?.snippet?.thumbnails?.high?.url || item?.snippet?.thumbnails?.medium?.url || '',
    publishedAt: item?.snippet?.publishedAt || '',
    duration: extra.durationText || '',
    viewCount: Number(extra.viewCount || 0),
  };
}

async function fetchVideoDetailsByIds(videoIds, apiKey) {
  if (!videoIds.length) return {};
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const data = await res.json();
  const map = {};
  (data.items || []).forEach((v) => {
    map[v.id] = {
      viewCount: Number(v.statistics?.viewCount || 0),
      durationIso: v.contentDetails?.duration || 'PT0S',
      durationText: parseISO8601Duration(v.contentDetails?.duration || 'PT0S'),
    };
  });
  return map;
}

export async function searchMusicVideos(query, { maxResults = 20, pageToken = '' } = {}) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('Missing YOUTUBE_API_KEY');

  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=${maxResults}` +
    `&videoCategoryId=10&q=${encodeURIComponent(query)}&key=${apiKey}` +
    (pageToken ? `&pageToken=${pageToken}` : '');

  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  const items = data.items || [];
  const ids = items.map((it) => it?.id?.videoId).filter(Boolean);
  const details = await fetchVideoDetailsByIds(ids, apiKey);

  return {
    items: items.map((it) => {
      const id = it?.id?.videoId;
      const d = details[id] || {};
      return mapVideoItem(it, { viewCount: d.viewCount, durationText: d.durationText });
    }),
    nextPageToken: data.nextPageToken || null,
  };
}

export async function fetchRelatedMusicVideos(videoId, { maxResults = 20, pageToken = '' } = {}) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('Missing YOUTUBE_API_KEY');

  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=${maxResults}` +
    `&relatedToVideoId=${encodeURIComponent(videoId)}&key=${apiKey}` +
    (pageToken ? `&pageToken=${pageToken}` : '');

  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  const items = data.items || [];
  const ids = items.map((it) => it?.id?.videoId).filter(Boolean);
  const details = await fetchVideoDetailsByIds(ids, apiKey);

  return {
    items: items.map((it) => {
      const id = it?.id?.videoId;
      const d = details[id] || {};
      return mapVideoItem(it, { viewCount: d.viewCount, durationText: d.durationText });
    }),
    nextPageToken: data.nextPageToken || null,
  };
}
