import { fetchRelatedMusicVideos } from '@/lib/youtubeMusic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return new Response(JSON.stringify({ error: 'Missing videoId' }), { status: 400 });
  }

  try {
    const data = await fetchRelatedMusicVideos(videoId);
    return Response.json(data);
  } catch (error) {
    console.error('[API] Music related error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch related music' }), { status: 500 });
  }
}
