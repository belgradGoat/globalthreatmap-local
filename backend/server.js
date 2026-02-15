/**
 * GlobalThreatMap Backend Server
 * News aggregation API for the threat intelligence dashboard
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const newsRoutes = require('./src/routes/news');
const configRoutes = require('./src/routes/config');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for network access

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'GlobalThreatMap Backend',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api', newsRoutes);
app.use('/api/config', configRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        availableEndpoints: [
            'GET /health',
            'GET /api/news?keyword=...&lang=en&country=us&max=20',
            'GET /api/local-sources?region=...&keywords=...&limit=25',
            'POST /api/local-sources { regions: [...], keywords: "...", limit: 20 }',
            'GET /api/google-news-local?region=...&keywords=...&limit=20',
            'GET /api/config/regions',
            'GET /api/config/stats'
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start server
app.listen(PORT, HOST, () => {
    console.log(`
========================================
  GlobalThreatMap Backend
  Running on http://${HOST}:${PORT}
========================================

Endpoints:
  GET  /health                    - Health check
  GET  /api/news                  - Aggregated news (GNews, Guardian, Google)
  GET  /api/local-sources         - Local RSS feeds by region/country
  POST /api/local-sources         - Multi-region search
  GET  /api/google-news-local     - Google News by locale
  GET  /api/config/regions        - Available regions and countries
  GET  /api/config/stats          - Source statistics

API Keys (optional):
  GNEWS_API_KEY=${process.env.GNEWS_API_KEY ? 'configured' : 'not set'}
  GUARDIAN_API_KEY=${process.env.GUARDIAN_API_KEY ? 'configured' : 'not set'}
`);
});
