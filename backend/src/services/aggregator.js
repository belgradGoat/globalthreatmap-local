/**
 * News Aggregator Service
 * Combines multiple news sources into a unified response
 */

const { fetchFromGNews } = require('./gnews');
const { fetchFromGuardianAPI } = require('./guardian');
const { scrapeGoogleNews } = require('./google-news');

/**
 * Aggregate news from all available sources
 */
async function aggregateNews(keyword, lang = 'en', country = 'us', max = 20) {
    console.log(`[Aggregator] Searching for "${keyword}" (lang: ${lang}, country: ${country}, max: ${max})`);

    const sources = [];
    const errors = [];
    const seenUrls = new Set();

    // Fetch from all sources in parallel
    const [gnewsResult, guardianResult, googleResult] = await Promise.all([
        fetchFromGNews(keyword, lang, country, Math.ceil(max / 2)).catch(err => {
            errors.push({ source: 'GNews', error: err.message });
            return { articles: [] };
        }),
        fetchFromGuardianAPI(keyword, Math.ceil(max / 3)).catch(err => {
            errors.push({ source: 'Guardian', error: err.message });
            return [];
        }),
        scrapeGoogleNews(keyword, Math.ceil(max / 2)).catch(err => {
            errors.push({ source: 'Google News', error: err.message });
            return [];
        })
    ]);

    // Combine results
    const allArticles = [];

    // Add GNews articles
    if (gnewsResult.articles?.length > 0) {
        sources.push('GNews');
        gnewsResult.articles.forEach(article => {
            if (article.url && !seenUrls.has(article.url)) {
                seenUrls.add(article.url);
                allArticles.push(article);
            }
        });
    }

    // Add Guardian articles
    if (guardianResult.length > 0) {
        sources.push('Guardian');
        guardianResult.forEach(article => {
            if (article.url && !seenUrls.has(article.url)) {
                seenUrls.add(article.url);
                allArticles.push(article);
            }
        });
    }

    // Add Google News articles
    if (googleResult.length > 0) {
        sources.push('Google News');
        googleResult.forEach(article => {
            if (article.url && !seenUrls.has(article.url)) {
                seenUrls.add(article.url);
                allArticles.push(article);
            }
        });
    }

    // Sort by date (newest first)
    allArticles.sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
    });

    // Limit results
    const limitedArticles = allArticles.slice(0, max);

    console.log(`[Aggregator] Returning ${limitedArticles.length} articles from ${sources.length} sources`);

    return {
        articles: limitedArticles,
        totalResults: limitedArticles.length,
        sources,
        errors: errors.length > 0 ? errors : undefined
    };
}

module.exports = {
    aggregateNews
};
