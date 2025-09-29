import { fetchShortsVideos } from '@/lib/youtube';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const pageToken = searchParams.get('pageToken') || '';
    const maxResults = parseInt(searchParams.get('maxResults') || '24', 10);
    try {
        const result = await fetchShortsVideos({ pageToken, maxResults });
        if (result && result.error) {
            return new Response(JSON.stringify(result), { status: 500 });
        }
        return Response.json(result);
    } catch (error) {
        console.error('[API] Shorts fetch error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch shorts' }), {
            status: 500,
        });
    }
}


