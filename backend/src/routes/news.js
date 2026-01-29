/**
 * News API Routes
 * Handles /api/news, /api/local-sources, /api/google-news-local
 */

const express = require('express');
const router = express.Router();

const { aggregateNews } = require('../services/aggregator');
const { searchLocalSources, GOOGLE_NEWS_LOCALES } = require('../services/local-news');
const { scrapeGoogleNewsLocal } = require('../services/google-news');

/**
 * GET /api/news
 * Aggregate news from GNews, Guardian, Google News RSS
 */
router.get('/news', async (req, res) => {
    try {
        const keyword = req.query.keyword || req.query.q || 'news';
        const lang = req.query.lang || 'en';
        const country = req.query.country || 'us';
        const max = parseInt(req.query.max) || 20;

        const result = await aggregateNews(keyword, lang, country, max);
        res.json(result);

    } catch (error) {
        console.error('[/api/news] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/local-sources
 * Search local RSS feeds by region/country
 */
router.get('/local-sources', async (req, res) => {
    try {
        const region = req.query.region;
        const keywords = req.query.keywords || '';
        const limit = parseInt(req.query.limit) || 25;

        if (!region) {
            return res.status(400).json({
                error: 'Region is required',
                usage: 'GET /api/local-sources?region=poland&keywords=military&limit=20'
            });
        }

        const result = await searchLocalSources(region, keywords, limit);
        res.json(result);

    } catch (error) {
        console.error('[/api/local-sources] Error:', error);
        res.status(error.status || 500).json({ error: error.message });
    }
});

/**
 * POST /api/local-sources
 * Search multiple regions at once
 */
router.post('/local-sources', async (req, res) => {
    try {
        const { regions, keywords, limit = 20 } = req.body;

        if (!regions || !Array.isArray(regions) || regions.length === 0) {
            return res.status(400).json({ error: 'regions array is required' });
        }

        // Fetch from all regions in parallel
        const results = await Promise.all(
            regions.map(region =>
                searchLocalSources(region, keywords || '', Math.ceil(limit / regions.length))
            )
        );

        // Combine and deduplicate
        const seenUrls = new Set();
        const allArticles = results.flatMap(r => r.articles).filter(article => {
            if (seenUrls.has(article.url)) return false;
            seenUrls.add(article.url);
            return true;
        });

        // Sort by date
        allArticles.sort((a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );

        res.json({
            regions,
            keywords,
            count: Math.min(allArticles.length, limit),
            articles: allArticles.slice(0, limit)
        });

    } catch (error) {
        console.error('[POST /api/local-sources] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/google-news-local
 * Google News RSS for specific country/locale
 */
router.get('/google-news-local', async (req, res) => {
    try {
        const region = req.query.region;
        const keywords = req.query.keywords || req.query.keyword || 'news';
        const limit = parseInt(req.query.limit) || 20;

        if (!region) {
            return res.status(400).json({
                error: 'Region is required',
                availableRegions: Object.keys(GOOGLE_NEWS_LOCALES)
            });
        }

        const locale = GOOGLE_NEWS_LOCALES[region.toLowerCase()];
        if (!locale) {
            return res.status(400).json({
                error: `Unsupported region: ${region}`,
                availableRegions: Object.keys(GOOGLE_NEWS_LOCALES)
            });
        }

        const articles = await scrapeGoogleNewsLocal(
            keywords,
            locale.lang,
            locale.country,
            limit
        );

        res.json({
            region: locale.name,
            locale,
            articles,
            count: articles.length
        });

    } catch (error) {
        console.error('[/api/google-news-local] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
