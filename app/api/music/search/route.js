import { searchMusicVideos } from '@/lib/youtubeMusic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q) {
    return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400 });
  }

  try {
    const data = await searchMusicVideos(q);
    return Response.json(data);
  } catch (error) {
    console.error('[API] Music search error:', error);
    return new Response(JSON.stringify({ error: 'Failed to search music' }), { status: 500 });
  }
}
