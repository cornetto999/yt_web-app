import { searchVideos } from '@/lib/youtube';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400 });
  }

  try {
    const videos = await searchVideos(query);
    return Response.json(videos);
  } catch (error) {
    console.error('[API] Search error:', error);
    return new Response(JSON.stringify({ error: 'Failed to search' }), { status: 500 });
  }
}
