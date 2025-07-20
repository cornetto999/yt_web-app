import { fetchTrendingVideos } from '@/lib/youtube';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const pageToken = searchParams.get('pageToken') || '';
    const maxResults = parseInt(searchParams.get('maxResults') || '12', 10);
    try {
        const result = await fetchTrendingVideos({ pageToken, maxResults });
        return Response.json(result);
    } catch (error) {
        console.error('[API] Trending fetch error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch videos' }), {
            status: 500,
        });
    }
}
