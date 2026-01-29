/**
 * Guardian API Service
 * Fetches news from The Guardian's Content API
 */

const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;
const GUARDIAN_BASE_URL = 'https://content.guardianapis.com/search';

async function fetchFromGuardianAPI(keyword, maxResults = 10) {
    if (!GUARDIAN_API_KEY) {
        console.log('[Guardian] API key not configured, skipping');
        return [];
    }

    try {
        const url = `${GUARDIAN_BASE_URL}?q=${encodeURIComponent(keyword)}&page-size=${Math.min(maxResults, 50)}&show-fields=headline,byline,thumbnail,short-url,body&show-tags=keyword&api-key=${GUARDIAN_API_KEY}`;

        console.log(`[Guardian API] Searching for: "${keyword}"`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'GlobalThreatMap/1.0'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            throw new Error(`Guardian API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.response || !data.response.results) {
            throw new Error('Invalid response format from Guardian API');
        }

        const articles = data.response.results.map(item => ({
            title: item.fields?.headline || item.webTitle,
            description: item.fields?.body ?
                item.fields.body.replace(/<[^>]*>/g, '').substring(0, 200) + '...' :
                `Guardian article about ${keyword}`,
            url: item.fields?.shortUrl || item.webUrl,
            urlToImage: item.fields?.thumbnail || null,
            publishedAt: item.webPublicationDate,
            source: {
                name: 'The Guardian',
                url: 'theguardian.com',
                type: 'Guardian API'
            }
        }));

        console.log(`[Guardian API] Fetched ${articles.length} articles`);
        return articles;

    } catch (error) {
        console.error('[Guardian API] Error:', error.message);
        return [];
    }
}

module.exports = {
    fetchFromGuardianAPI
};
