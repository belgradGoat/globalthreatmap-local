/**
 * GNews API Service
 * Fetches news from GNews.io API
 */

const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const GNEWS_BASE_URL = 'https://gnews.io/api/v4';

async function fetchFromGNews(keyword, lang = 'en', country = 'us', max = 10) {
    if (!GNEWS_API_KEY) {
        console.log('[GNews] API key not configured, skipping');
        return { articles: [] };
    }

    try {
        const params = new URLSearchParams({
            q: keyword,
            lang: lang,
            country: country,
            max: String(max),
            apikey: GNEWS_API_KEY
        });

        const response = await fetch(`${GNEWS_BASE_URL}/search?${params}`, {
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            throw new Error(`GNews API error: ${response.status}`);
        }

        const data = await response.json();

        // Transform to standard format
        const articles = (data.articles || []).map(item => ({
            title: item.title,
            description: item.description,
            url: item.url,
            urlToImage: item.image,
            publishedAt: item.publishedAt,
            source: {
                name: item.source?.name || 'GNews',
                url: item.source?.url,
                type: 'GNews API'
            }
        }));

        console.log(`[GNews] Fetched ${articles.length} articles for "${keyword}"`);
        return { articles };

    } catch (error) {
        console.error('[GNews] Error:', error.message);
        return { articles: [] };
    }
}

module.exports = {
    fetchFromGNews
};
