
import { parseISO8601Duration } from '@/utils/parseDuration';

export async function fetchTrendingVideos({ pageToken = '', maxResults = 12 } = {}) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const regionCode = 'PH';

  const url =
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=${regionCode}` +
    `&maxResults=${maxResults}&key=${apiKey}` +
    (pageToken ? `&pageToken=${pageToken}` : '');

  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();

  return {
    items: (data.items || []).map((item) => ({
      id: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails?.high?.url || '',
      viewCount: Number(item.statistics.viewCount),
      publishedAt: item.snippet.publishedAt,
      duration: parseISO8601Duration(item.contentDetails.duration),
    })),
    nextPageToken: data.nextPageToken || null,
  };
}

export async function searchVideos(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  // First, search for videos to get their IDs
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(query)}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const data = await res.json();
  if (!data.items) return [];
  const videoIds = data.items.map((item) => item.id.videoId).filter(Boolean);
  if (videoIds.length === 0) return [];

  // Fetch statistics for these videos
  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const statsData = await statsRes.json();
  const statsMap = {};
  (statsData.items || []).forEach((item) => {
    statsMap[item.id] = {
      viewCount: Number(item.statistics?.viewCount) || 0,
      duration: item.contentDetails?.duration || '',
    };
  });

  return data.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails?.high?.url || '',
    publishedAt: item.snippet.publishedAt,
    viewCount: statsMap[item.id.videoId]?.viewCount || 0,
    duration: statsMap[item.id.videoId]?.duration || '',
  }));
}
