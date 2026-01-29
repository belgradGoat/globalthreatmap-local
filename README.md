# GlobalThreatMap-Local

A fully self-hosted global threat intelligence dashboard that plots security events, geopolitical developments, and threat indicators on an interactive map. Think of it as an OSINT (Open Source Intelligence) command center - running entirely on local infrastructure.

> **Fork Notice**: This project is a fork of [GlobalThreatMap](https://github.com/unicodeveloper/globalthreatmap) by [Prosper Otemuyiwa](https://github.com/unicodeveloper) / [Valyu](https://valyu.ai). The original uses Valyu's cloud APIs; this fork runs on local LLMs and RSS feeds.

![GlobalThreatMap Dashboard](screenshot.png)

## Features

### Core Features

- **Real-Time Event Mapping** - Plot breaking news events (conflicts, protests, natural disasters) on a world map with color-coded threat levels
- **Interactive Mapbox Map** - Dark-themed map with clustering, heatmap visualization, and smooth navigation
- **Event Feed** - Real-time filterable feed of global events with category and threat level filters
- **Intel Dossiers** - Build intelligence dossiers on any actor with deep research capabilities
- **Alert System** - Configure keyword and region-based alerts with real-time notifications

### Country Intelligence

Click on any country to view detailed conflict intelligence:

- **Historical Conflicts** - Wars, military engagements, and conflicts throughout history with dates, opposing parties, and outcomes
- **Current Conflicts** - Ongoing wars, military tensions, border disputes, civil unrest, terrorism threats, and geopolitical tensions
- **Tabbed Interface** - Current conflicts (red-themed) and Historical conflicts (blue-themed) displayed in separate tabs
- **AI-Powered Analysis** - Conflict data synthesized using local LLM (LM Studio) or cloud API with cited sources

### Military Bases Layer

Visualize global military presence:

- **US Military Bases** - Displayed as green markers (30+ bases worldwide)
- **NATO Installations** - Displayed as blue markers
- **Base Details** - Click any base to see its name, type, and host country

### News Coverage

- **94+ Countries** - Curated RSS feeds from local news sources in native languages
- **646 RSS Sources** - Across 13 regions worldwide
- **Multi-Language** - Polish, Ukrainian, German, French, Arabic, Chinese, Japanese, and more
- **Multi-Source Aggregation** - GNews, Guardian, Google News RSS, and local feeds

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Map**: Mapbox GL JS + react-map-gl
- **UI**: Tailwind CSS v4 + custom components
- **Backend**: Express.js (news aggregation)
- **AI Analysis**: LM Studio (local) or OpenAI (cloud)
- **Schema Validation**: Zod
- **State Management**: Zustand

## Project Structure

```
globalthreatmap/
├── frontend/                    # Next.js dashboard
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Main dashboard
│   │   ├── globals.css          # Global styles
│   │   └── api/                 # API routes
│   │       ├── events/          # Event fetching
│   │       ├── entities/        # Entity research
│   │       ├── countries/
│   │       │   └── conflicts/   # Country conflict intelligence
│   │       ├── local-sources/   # Local RSS proxy
│   │       └── military-bases/  # Military base data
│   ├── components/
│   │   ├── map/                 # Map components
│   │   ├── feed/                # Event feed components
│   │   ├── search/              # Entity search
│   │   ├── alerts/              # Alert management
│   │   └── ui/                  # Base UI components
│   ├── lib/
│   │   ├── local-intel.ts       # News search & LLM integration
│   │   ├── valyu.ts             # Valyu cloud API (optional)
│   │   ├── geocoding.ts         # Location extraction
│   │   └── event-classifier.ts  # Event classification
│   ├── stores/                  # Zustand state
│   ├── types/                   # TypeScript types
│   └── hooks/                   # React hooks
│
├── backend/                     # News aggregation API
│   ├── src/
│   │   ├── services/
│   │   │   ├── gnews.js         # GNews API
│   │   │   ├── guardian.js      # Guardian API
│   │   │   ├── google-news.js   # Google News RSS
│   │   │   ├── local-news.js    # Local RSS feeds (94 countries)
│   │   │   └── aggregator.js    # Multi-source aggregator
│   │   └── routes/
│   │       ├── news.js          # /api/news, /api/local-sources
│   │       └── config.js        # /api/config/regions
│   ├── data/
│   │   └── local_news_sources.json  # 646 RSS feeds, 124 countries
│   ├── server.js                # Express server (port 3001)
│   └── package.json
│
├── package.json                 # Root monorepo scripts
├── .env.example                 # Configuration template
└── README.md                    # Quick start guide
```

## Getting Started

### Prerequisites

- Node.js 18+
- Free Mapbox account (for map visualization)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/globalthreatmap.git
cd globalthreatmap

# Install all dependencies
npm run install:all

# Configure environment
cp .env.example frontend/.env.local
# Edit frontend/.env.local and add your NEXT_PUBLIC_MAPBOX_TOKEN
```

### Running the App

```bash
# Start both frontend and backend
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

### Minimal Configuration

Only one thing is required:

1. Get a free Mapbox token at https://account.mapbox.com/access-tokens/
2. Add it to `frontend/.env.local`:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
   ```

That's it! The app works without any API keys using Google News RSS and the curated local RSS feeds.

## Configuration Options

### Environment Variables

```env
# REQUIRED: Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here

# OPTIONAL: News API Keys (enhance coverage)
GNEWS_API_KEY=           # https://gnews.io (100 req/day free)
GUARDIAN_API_KEY=        # https://open-platform.theguardian.com (free)

# OPTIONAL: AI Analysis
LM_STUDIO_URL=http://localhost:1234/v1    # Local LLM
# OR
OPENAI_API_KEY=sk-...                      # Cloud LLM

# App Mode (defaults work for most users)
USE_LOCAL_INTEL=true
WEBSCRAPPER_URL=http://localhost:3001
NEXT_PUBLIC_APP_MODE=self-hosted
```

### AI-Powered Analysis

For country dossiers and entity research, you need an LLM. Choose one:

**Option A: LM Studio (Local, Free, Private)**
1. Download from https://lmstudio.ai
2. Load any model (Mistral, Llama, Qwen, etc.)
3. Start server on port 1234
4. Set `LM_STUDIO_URL=http://localhost:1234/v1`

**Option B: OpenAI (Cloud, Paid)**
1. Get API key from https://platform.openai.com/api-keys
2. Set `OPENAI_API_KEY=sk-...`

## API Routes

### Frontend API Routes (Next.js)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/events` | GET | Fetch global events |
| `/api/entities` | GET/POST | Research entities and get locations |
| `/api/countries/conflicts` | GET | Get historical and current conflicts |
| `/api/local-sources` | GET | Proxy to backend local sources |
| `/api/military-bases` | GET | Get US and NATO military base locations |
| `/api/health` | GET | Check service status |

### Backend API Routes (Express)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/news` | GET | Aggregated news (GNews, Guardian, Google) |
| `/api/local-sources` | GET | Local RSS feeds by region/country |
| `/api/google-news-local` | GET | Google News by locale |
| `/api/config/regions` | GET | Available regions and countries |
| `/api/config/stats` | GET | Source statistics |
| `/health` | GET | Backend health check |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Global Threat Map                        │
│               (Next.js Frontend :3000)                   │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌───────────────┐ ┌─────────┐ ┌─────────────────┐
│    Backend    │ │LM Studio│ │  Valyu (opt)    │
│  (Port 3001)  │ │ (:1234) │ │  Cloud API      │
├───────────────┤ ├─────────┤ └─────────────────┘
│ • GNews API   │ │ Local   │
│ • Guardian    │ │ LLM for │
│ • Google RSS  │ │ analysis│
│ • 646 RSS     │ └─────────┘
│   feeds       │
└───────────────┘
```

## Usage

### Interactive Map

- **Click on a Country** - Opens the Country Conflicts Modal showing historical and current conflicts
- **Click on an Event Marker** - Shows event details popup
- **Click on a Military Base** - Shows base name, type (US/NATO), and country
- **Zoom/Pan** - Navigate the map or use auto-pan mode

### Event Feed

The event feed displays real-time global events. You can:
- Filter by threat level (Critical, High, Medium, Low, Info)
- Filter by category (Conflict, Protest, Disaster, Diplomatic, etc.)
- Search events by keyword
- Click on events to fly to their location on the map

### Country Conflicts

Click any country on the map to view:
- **Current Tab** (Red) - Active conflicts, military tensions, and ongoing security threats
- **Historical Tab** (Blue) - Past wars and military engagements with dates and outcomes
- **Sources** - Cited references for all conflict information

## Data Sources

### News Coverage by Region

| Region | Countries | Sources |
|--------|-----------|---------|
| Eastern Europe | 24 | 138 |
| Western Europe | 17 | 112 |
| Middle East | 14 | 63 |
| Africa | 15 | 101 |
| North America | 3 | 69 |
| South America | 8 | 33 |
| East Asia | 6 | 22 |
| Southeast Asia | 8 | 34 |
| South Asia | 5 | 23 |
| Central Asia | 6 | 30 |
| Oceania | 2 | 12 |

**Total: 124 countries, 646 RSS feeds**

### Supported Languages

Polish, Ukrainian, Russian, Czech, Hungarian, Romanian, Bulgarian, German, French, Spanish, Italian, Portuguese, Dutch, Greek, Arabic, Hebrew, Turkish, Persian, Chinese, Japanese, Korean, Vietnamese, Thai, Indonesian, Hindi, and more.

## Development

```bash
# Run frontend only
npm run dev:frontend

# Run backend only
npm run dev:backend

# Build for production
cd frontend && npm run build
```

## Alternative: Valyu Cloud Mode

Instead of the local backend, you can use Valyu's cloud API:

```env
USE_LOCAL_INTEL=false
VALYU_API_KEY=your_valyu_api_key_here
```

This provides:
- Valyu Search API for news
- Valyu Answer API for conflict analysis
- Deep Research with deliverables (CSV, PPTX, PDF)

Get an API key at https://valyu.ai

## License

MIT
