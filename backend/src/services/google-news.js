/**
 * Google News RSS Service
 * Fetches news from Google News RSS feeds (no API key required)
 */

const cheerio = require('cheerio');

async function scrapeGoogleNews(keyword, maxResults = 10) {
    try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en&gl=US&ceid=US:en`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; GlobalThreatMap/1.0)'
            },
            signal: AbortSignal.timeout(10000)
        });

        const xmlText = await response.text();
        const $ = cheerio.load(xmlText, { xmlMode: true });
        const articles = [];

        $('item').each((i, element) => {
            if (i >= maxResults) return false;

            const $item = $(element);
            const title = $item.find('title').text();
            const link = $item.find('link').text();
            const description = $item.find('description').text().replace(/<[^>]*>/g, '');
            const pubDate = $item.find('pubDate').text();

            if (title && link) {
                articles.push({
                    title: title,
                    description: description || `Google News article about ${keyword}`,
                    url: link,
                    urlToImage: null,
                    publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                    source: {
                        name: 'Google News',
                        url: 'news.google.com',
                        type: 'Google News RSS'
                    }
                });
            }
        });

        console.log(`[Google News] Fetched ${articles.length} articles for "${keyword}"`);
        return articles;

    } catch (error) {
        console.error('[Google News] Error:', error.message);
        return [];
    }
}

/**
 * Fetch Google News for a specific locale/country
 */
async function scrapeGoogleNewsLocal(keyword, lang = 'en', country = 'US', maxResults = 10) {
    try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=${lang}&gl=${country}&ceid=${country}:${lang}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; GlobalThreatMap/1.0)'
            },
            signal: AbortSignal.timeout(10000)
        });

        const xmlText = await response.text();
        const $ = cheerio.load(xmlText, { xmlMode: true });
        const articles = [];

        $('item').each((i, element) => {
            if (i >= maxResults) return false;

            const $item = $(element);
            const title = $item.find('title').text();
            const link = $item.find('link').text();
            const description = $item.find('description').text().replace(/<[^>]*>/g, '');
            const pubDate = $item.find('pubDate').text();

            if (title && link) {
                articles.push({
                    title: title,
                    description: description || `News article about ${keyword}`,
                    url: link,
                    urlToImage: null,
                    publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                    source: {
                        name: `Google News (${country})`,
                        url: 'news.google.com',
                        type: 'Google News RSS',
                        country: country,
                        language: lang
                    }
                });
            }
        });

        console.log(`[Google News ${country}] Fetched ${articles.length} articles for "${keyword}"`);
        return articles;

    } catch (error) {
        console.error(`[Google News ${country}] Error:`, error.message);
        return [];
    }
}

module.exports = {
    scrapeGoogleNews,
    scrapeGoogleNewsLocal
};
