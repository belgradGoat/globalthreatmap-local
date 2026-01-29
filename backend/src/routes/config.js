/**
 * Config API Routes
 * Handles /api/config/* endpoints
 */

const express = require('express');
const router = express.Router();

const { getRegionConfig, reloadLocalSources } = require('../services/local-news');

/**
 * GET /api/config/regions
 * Get available regions and countries
 */
router.get('/regions', (req, res) => {
    try {
        const config = getRegionConfig();
        res.json(config);
    } catch (error) {
        console.error('[/api/config/regions] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/config/stats
 * Get source statistics
 */
router.get('/stats', (req, res) => {
    try {
        const config = getRegionConfig();
        res.json({
            totalSources: config.stats.totalSources,
            totalRegions: Object.keys(config.regions).length,
            totalCountries: config.countries.length,
            byRegion: config.stats.byRegion
        });
    } catch (error) {
        console.error('[/api/config/stats] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/config/reload
 * Reload local sources from disk
 */
router.post('/reload', (req, res) => {
    try {
        const result = reloadLocalSources();
        res.json(result);
    } catch (error) {
        console.error('[/api/config/reload] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
