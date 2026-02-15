/**
 * Local News Service
 * Parses RSS feeds from 94+ countries using curated local_news_sources.json
 */

const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');

const rssParser = new Parser({
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GlobalThreatMap/1.0)'
    }
});

// Google News locales for country-specific searches
const GOOGLE_NEWS_LOCALES = {
    // Eastern Europe
    poland: { lang: 'pl', country: 'PL', name: 'Poland' },
    ukraine: { lang: 'uk', country: 'UA', name: 'Ukraine' },
    czech: { lang: 'cs', country: 'CZ', name: 'Czech Republic' },
    hungary: { lang: 'hu', country: 'HU', name: 'Hungary' },
    romania: { lang: 'ro', country: 'RO', name: 'Romania' },
    bulgaria: { lang: 'bg', country: 'BG', name: 'Bulgaria' },
    russia: { lang: 'ru', country: 'RU', name: 'Russia' },
    belarus: { lang: 'ru', country: 'BY', name: 'Belarus' },
    estonia: { lang: 'et', country: 'EE', name: 'Estonia' },
    latvia: { lang: 'lv', country: 'LV', name: 'Latvia' },
    lithuania: { lang: 'lt', country: 'LT', name: 'Lithuania' },
    slovakia: { lang: 'sk', country: 'SK', name: 'Slovakia' },
    slovenia: { lang: 'sl', country: 'SI', name: 'Slovenia' },
    croatia: { lang: 'hr', country: 'HR', name: 'Croatia' },
    serbia: { lang: 'sr', country: 'RS', name: 'Serbia' },
    bosnia: { lang: 'bs', country: 'BA', name: 'Bosnia and Herzegovina' },
    albania: { lang: 'sq', country: 'AL', name: 'Albania' },
    north_macedonia: { lang: 'mk', country: 'MK', name: 'North Macedonia' },
    montenegro: { lang: 'sr', country: 'ME', name: 'Montenegro' },
    moldova: { lang: 'ro', country: 'MD', name: 'Moldova' },
    georgia: { lang: 'ka', country: 'GE', name: 'Georgia' },
    kosovo: { lang: 'sq', country: 'XK', name: 'Kosovo' },
    // Western Europe
    germany: { lang: 'de', country: 'DE', name: 'Germany' },
    france: { lang: 'fr', country: 'FR', name: 'France' },
    spain: { lang: 'es', country: 'ES', name: 'Spain' },
    italy: { lang: 'it', country: 'IT', name: 'Italy' },
    netherlands: { lang: 'nl', country: 'NL', name: 'Netherlands' },
    uk: { lang: 'en', country: 'GB', name: 'United Kingdom' },
    ireland: { lang: 'en', country: 'IE', name: 'Ireland' },
    portugal: { lang: 'pt', country: 'PT', name: 'Portugal' },
    greece: { lang: 'el', country: 'GR', name: 'Greece' },
    austria: { lang: 'de', country: 'AT', name: 'Austria' },
    switzerland: { lang: 'de', country: 'CH', name: 'Switzerland' },
    belgium: { lang: 'nl', country: 'BE', name: 'Belgium' },
    sweden: { lang: 'sv', country: 'SE', name: 'Sweden' },
    norway: { lang: 'no', country: 'NO', name: 'Norway' },
    denmark: { lang: 'da', country: 'DK', name: 'Denmark' },
    finland: { lang: 'fi', country: 'FI', name: 'Finland' },
    iceland: { lang: 'is', country: 'IS', name: 'Iceland' },
    // Americas
    us: { lang: 'en', country: 'US', name: 'United States' },
    usa: { lang: 'en', country: 'US', name: 'United States' },
    united_states: { lang: 'en', country: 'US', name: 'United States' },
    brazil: { lang: 'pt', country: 'BR', name: 'Brazil' },
    mexico: { lang: 'es', country: 'MX', name: 'Mexico' },
    argentina: { lang: 'es', country: 'AR', name: 'Argentina' },
    canada: { lang: 'en', country: 'CA', name: 'Canada' },
    chile: { lang: 'es', country: 'CL', name: 'Chile' },
    colombia: { lang: 'es', country: 'CO', name: 'Colombia' },
    peru: { lang: 'es', country: 'PE', name: 'Peru' },
    venezuela: { lang: 'es', country: 'VE', name: 'Venezuela' },
    cuba: { lang: 'es', country: 'CU', name: 'Cuba' },
    // Asia-Pacific
    japan: { lang: 'ja', country: 'JP', name: 'Japan' },
    south_korea: { lang: 'ko', country: 'KR', name: 'South Korea' },
    taiwan: { lang: 'zh-TW', country: 'TW', name: 'Taiwan' },
    china: { lang: 'zh-CN', country: 'CN', name: 'China' },
    india: { lang: 'en', country: 'IN', name: 'India' },
    australia: { lang: 'en', country: 'AU', name: 'Australia' },
    new_zealand: { lang: 'en', country: 'NZ', name: 'New Zealand' },
    singapore: { lang: 'en', country: 'SG', name: 'Singapore' },
    indonesia: { lang: 'id', country: 'ID', name: 'Indonesia' },
    malaysia: { lang: 'ms', country: 'MY', name: 'Malaysia' },
    thailand: { lang: 'th', country: 'TH', name: 'Thailand' },
    vietnam: { lang: 'vi', country: 'VN', name: 'Vietnam' },
    philippines: { lang: 'en', country: 'PH', name: 'Philippines' },
    pakistan: { lang: 'en', country: 'PK', name: 'Pakistan' },
    bangladesh: { lang: 'bn', country: 'BD', name: 'Bangladesh' },
    // Central Asia
    kazakhstan: { lang: 'ru', country: 'KZ', name: 'Kazakhstan' },
    uzbekistan: { lang: 'uz', country: 'UZ', name: 'Uzbekistan' },
    afghanistan: { lang: 'ps', country: 'AF', name: 'Afghanistan' },
    // Middle East
    israel: { lang: 'he', country: 'IL', name: 'Israel' },
    turkey: { lang: 'tr', country: 'TR', name: 'Turkey' },
    uae: { lang: 'ar', country: 'AE', name: 'UAE' },
    saudi_arabia: { lang: 'ar', country: 'SA', name: 'Saudi Arabia' },
    egypt: { lang: 'ar', country: 'EG', name: 'Egypt' },
    iran: { lang: 'fa', country: 'IR', name: 'Iran' },
    iraq: { lang: 'ar', country: 'IQ', name: 'Iraq' },
    syria: { lang: 'ar', country: 'SY', name: 'Syria' },
    lebanon: { lang: 'ar', country: 'LB', name: 'Lebanon' },
    jordan: { lang: 'ar', country: 'JO', name: 'Jordan' },
    qatar: { lang: 'ar', country: 'QA', name: 'Qatar' },
    kuwait: { lang: 'ar', country: 'KW', name: 'Kuwait' },
    bahrain: { lang: 'ar', country: 'BH', name: 'Bahrain' },
    oman: { lang: 'ar', country: 'OM', name: 'Oman' },
    yemen: { lang: 'ar', country: 'YE', name: 'Yemen' },
    // Africa
    south_africa: { lang: 'en', country: 'ZA', name: 'South Africa' },
    nigeria: { lang: 'en', country: 'NG', name: 'Nigeria' },
    kenya: { lang: 'en', country: 'KE', name: 'Kenya' },
    ethiopia: { lang: 'am', country: 'ET', name: 'Ethiopia' },
    morocco: { lang: 'ar', country: 'MA', name: 'Morocco' },
    algeria: { lang: 'ar', country: 'DZ', name: 'Algeria' },
    tunisia: { lang: 'ar', country: 'TN', name: 'Tunisia' },
    libya: { lang: 'ar', country: 'LY', name: 'Libya' },
    sudan: { lang: 'ar', country: 'SD', name: 'Sudan' },
    ghana: { lang: 'en', country: 'GH', name: 'Ghana' }
};

// Country name aliases (map names → backend keys)
const COUNTRY_ALIASES = {
    // United States
    'united_states': 'us',
    'united states': 'us',
    'america': 'us',
    'usa': 'us',
    // United Kingdom
    'united_kingdom': 'uk',
    'united kingdom': 'uk',
    'britain': 'uk',
    'england': 'uk',
    'great britain': 'uk',
    'great_britain': 'uk',
    // Korea
    'south_korea': 'south_korea',
    'korea': 'south_korea',
    'republic of korea': 'south_korea',
    'republic_of_korea': 'south_korea',
    'north_korea': 'north_korea',
    'democratic peoples republic of korea': 'north_korea',
    'dprk': 'north_korea',
    // Czech
    'czechia': 'czech',
    'czech_republic': 'czech',
    'czech republic': 'czech',
    // Turkey
    'turkiye': 'turkey',
    'türkiye': 'turkey',
    // UAE
    'united_arab_emirates': 'uae',
    'united arab emirates': 'uae',
    // Bosnia
    'bosnia_and_herzegovina': 'bosnia',
    'bosnia and herzegovina': 'bosnia',
    'bosnia-herzegovina': 'bosnia',
    // North Macedonia
    'macedonia': 'north_macedonia',
    // DR Congo
    'democratic_republic_of_the_congo': 'dr_congo',
    'democratic republic of the congo': 'dr_congo',
    'drc': 'dr_congo',
    'congo': 'dr_congo',
    // New Zealand
    'new_zealand': 'new_zealand',
    // South Africa
    'south_africa': 'south_africa',
    // Saudi Arabia
    'saudi_arabia': 'saudi_arabia'
};

// Load local news sources
const localSourcesPath = path.resolve(__dirname, '..', '..', 'data', 'local_news_sources.json');
let localNewsSources = {};

function loadLocalSources() {
    try {
        if (fs.existsSync(localSourcesPath)) {
            const raw = fs.readFileSync(localSourcesPath, 'utf8');
            localNewsSources = JSON.parse(raw);
            const regionCount = Object.keys(localNewsSources).length;
            console.log(`Loaded local news sources: ${regionCount} regions`);
        } else {
            console.warn('local_news_sources.json not found');
            localNewsSources = {};
        }
    } catch (error) {
        console.error('Error loading local news sources:', error.message);
        localNewsSources = {};
    }
}

loadLocalSources();

function normalizeRegionName(name) {
    if (!name) return name;
    const lower = name.toLowerCase().trim();
    return COUNTRY_ALIASES[lower] || lower;
}

/**
 * Find RSS sources for a region or country
 */
function findSourcesForRegion(region) {
    if (!region) return [];

    const needle = normalizeRegionName(region);
    const results = [];

    for (const [regionKey, countries] of Object.entries(localNewsSources)) {
        if (!countries) continue;

        // Check if needle matches the region key
        if (regionKey.toLowerCase() === needle) {
            if (Array.isArray(countries)) {
                countries.forEach(src => results.push({
                    source: src,
                    country: regionKey,
                    region: regionKey
                }));
            } else if (typeof countries === 'object') {
                // Region contains nested countries
                for (const [countryKey, feeds] of Object.entries(countries)) {
                    if (Array.isArray(feeds)) {
                        feeds.forEach(src => results.push({
                            source: src,
                            country: countryKey,
                            region: regionKey
                        }));
                    }
                }
            }
            continue;
        }

        // Check if needle matches a country within this region
        if (typeof countries === 'object' && !Array.isArray(countries)) {
            for (const [countryKey, feeds] of Object.entries(countries)) {
                const keyLower = countryKey.toLowerCase();
                // Match exact country key OR sub-category keys (e.g., "us" matches "us", "us_liberal_politics", "us_conservative_politics")
                if (keyLower === needle || keyLower.startsWith(needle + '_')) {
                    if (Array.isArray(feeds)) {
                        feeds.forEach(src => results.push({
                            source: src,
                            country: countryKey,
                            region: regionKey
                        }));
                    }
                }
            }
        }
    }

    return results;
}

/**
 * Parse a single RSS feed
 */
async function parseRssFeed(feedUrl, sourceName = 'RSS Feed', sourceMetadata = {}) {
    try {
        const feed = await rssParser.parseURL(feedUrl);

        const articles = feed.items.map(item => ({
            title: item.title || 'No title',
            description: item.contentSnippet || item.summary || item.content || 'No description',
            url: item.link || item.guid || '',
            source: {
                name: sourceName,
                type: 'Local RSS',
                ...sourceMetadata
            },
            publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
            urlToImage: item.enclosure?.url || null
        }));

        return articles;
    } catch (error) {
        console.error(`[RSS] Error parsing ${feedUrl}:`, error.message);
        return [];
    }
}

/**
 * Filter articles by keywords
 */
function filterByKeywords(articles, keywords) {
    if (!keywords) return articles;

    const terms = keywords
        .split(/[,\s]+/)
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length >= 2);

    if (terms.length === 0) return articles;

    return articles.filter(article => {
        const text = `${article.title} ${article.description || ''}`.toLowerCase();
        return terms.some(term => text.includes(term));
    });
}

/**
 * Search local RSS sources for a region
 */
async function searchLocalSources(region, keywords = '', limit = 25) {
    if (!region) {
        throw new Error('Region is required');
    }

    const sourceEntries = findSourcesForRegion(region);
    console.log(`[Local Sources] Found ${sourceEntries.length} sources for: ${region}`);

    if (sourceEntries.length === 0) {
        return {
            articles: [],
            region,
            sources: []
        };
    }

    // Parse all RSS feeds in parallel
    const articlePromises = sourceEntries.map(entry =>
        parseRssFeed(entry.source.url, entry.source.name, {
            language: entry.source.language,
            bias: entry.source.bias,
            country: entry.country,
            region: entry.region
        })
    );

    const articleArrays = await Promise.all(articlePromises);
    let articles = articleArrays.flat();

    // Filter by keywords
    articles = filterByKeywords(articles, keywords);

    // Sort by date (newest first)
    articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Limit results
    const limitedArticles = articles.slice(0, Math.min(limit, 100));

    return {
        articles: limitedArticles,
        region,
        sources: sourceEntries.map(e => ({
            name: e.source.name,
            language: e.source.language,
            country: e.country
        }))
    };
}

/**
 * Get region configuration (available regions and countries)
 */
function getRegionConfig() {
    const regions = {};
    const countries = [];
    let totalSources = 0;
    const byRegion = {};

    for (const [regionKey, regionData] of Object.entries(localNewsSources)) {
        if (typeof regionData === 'object' && !Array.isArray(regionData)) {
            regions[regionKey] = Object.keys(regionData);
            countries.push(...Object.keys(regionData));

            let regionSourceCount = 0;
            for (const feeds of Object.values(regionData)) {
                if (Array.isArray(feeds)) {
                    regionSourceCount += feeds.length;
                }
            }
            byRegion[regionKey] = regionSourceCount;
            totalSources += regionSourceCount;
        } else if (Array.isArray(regionData)) {
            regions[regionKey] = [];
            byRegion[regionKey] = regionData.length;
            totalSources += regionData.length;
        }
    }

    return {
        regions,
        countries: [...new Set(countries)],
        stats: {
            totalSources,
            byRegion
        },
        lastUpdated: new Date().toISOString()
    };
}

/**
 * Reload local sources from disk
 */
function reloadLocalSources() {
    loadLocalSources();
    return {
        success: true,
        regionsLoaded: Object.keys(localNewsSources).length
    };
}

module.exports = {
    searchLocalSources,
    getRegionConfig,
    reloadLocalSources,
    findSourcesForRegion,
    GOOGLE_NEWS_LOCALES
};
