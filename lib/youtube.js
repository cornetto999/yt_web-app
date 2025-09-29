
import { parseISO8601Duration } from '@/utils/parseDuration';

export async function fetchTrendingVideos({ pageToken = '', maxResults = 12, categoryId = '' } = {}) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const regionCode = 'PH';

  let url =
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=${regionCode}` +
    `&maxResults=${maxResults}&key=${apiKey}` +
    (pageToken ? `&pageToken=${pageToken}` : '');
  if (categoryId) {
    url += `&videoCategoryId=${categoryId}`;
  }

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

// Shorts: videos with duration <= 60 seconds and vertical-friendly thumbnails
export async function fetchShortsVideos({ pageToken = '', maxResults = 24 } = {}) {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  const regionCode = 'PH';
  try {
    if (!apiKey) {
      throw new Error('Missing YOUTUBE_API_KEY');
    }

    // Strategy: use search endpoint to find recent videos, then filter by duration
    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&order=date&maxResults=${maxResults}` +
      (pageToken ? `&pageToken=${pageToken}` : '') +
      `&regionCode=${regionCode}&key=${apiKey}`;

    const searchRes = await fetch(searchUrl, { cache: 'no-store' });
    const searchData = await searchRes.json();
    const videoIds = (searchData.items || [])
      .map((item) => item.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      return { items: [], nextPageToken: searchData.nextPageToken || null };
    }

    const detailsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`,
      { cache: 'no-store' }
    );
    const detailsData = await detailsRes.json();

    const shorts = (detailsData.items || [])
      .map((item) => {
        const durationIso = item.contentDetails?.duration || 'PT0S';
        const durationText = parseISO8601Duration(durationIso);
        // Compute total seconds from ISO8601
        const match = durationIso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const h = parseInt(match?.[1] || 0, 10);
        const m = parseInt(match?.[2] || 0, 10);
        const s = parseInt(match?.[3] || 0, 10);
        const totalSeconds = h * 3600 + m * 60 + s;

        return {
          id: item.id,
          title: item.snippet?.title || '',
          channelTitle: item.snippet?.channelTitle || '',
          // Prefer highest available, fallback to constructed thumbnail
          thumbnailUrl:
            item.snippet?.thumbnails?.maxres?.url ||
            item.snippet?.thumbnails?.standard?.url ||
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
          viewCount: Number(item.statistics?.viewCount || 0),
          publishedAt: item.snippet?.publishedAt || '',
          duration: durationText,
          totalSeconds,
        };
      })
      .filter((v) => v.totalSeconds <= 60)
      .map(({ totalSeconds, ...rest }) => ({
        ...rest,
        // Ultimate fallback thumbnail
        thumbnailUrl: rest.thumbnailUrl || `https://i.ytimg.com/vi/${rest.id}/hqdefault.jpg`,
      }));

    return {
      items: shorts,
      nextPageToken: searchData.nextPageToken || null,
    };
  } catch (e) {
    console.error('[Shorts] fetch error:', e);
    return { items: [], nextPageToken: null, error: e?.message || 'Unknown error' };
  }
}
