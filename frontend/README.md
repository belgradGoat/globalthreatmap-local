# Eagle Eye

**Your lens on the world** - A comprehensive global news research platform.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Mapbox](https://img.shields.io/badge/Mapbox-GL-green)

---

## Overview

Eagle Eye is an interactive global news research platform that combines:

- **Interactive World Map** - Explore countries with satellite, light, dark, or street views
- **Real-time News Feed** - Aggregated from 600+ global sources across multiple languages
- **AI-Powered Research** - Deep research on any topic using local LLMs (LM Studio, Ollama) or OpenAI
- **Country Profiles** - Instant access to country facts, news, and optional security analysis

## Features

### News Feed
- Category filtering (Politics, Economy, Technology, Environment, Health, World)
- Optional security & military news toggle
- Breaking/Important priority badges
- Source links with favicons

### Interactive Map
- 4 map styles: Satellite (default), Light, Dark, Streets
- Click any country for detailed modal
- Optional military bases overlay
- Smooth fly-to animations

### Country Modal
| Tab | Content |
|-----|---------|
| News | Latest headlines from local sources |
| Profile | Capital, population, languages, currencies |
| History | Historical context (LLM-generated) |
| Security | Conflict analysis (optional) |

### Deep Research
- Research any topic with comprehensive AI analysis
- Streaming responses with real-time updates
- Sources from Google News, Wikipedia, Guardian, GNews, 600+ RSS feeds
- Optional security & threat analysis sections

## Quick Start

### Prerequisites
- Node.js 18+
- Mapbox account (free tier works)
- (Optional) LM Studio or Ollama for local AI

### Installation

```bash
# Clone and enter directory
git clone https://github.com/your-repo/globalthreatmap.git
cd globalthreatmap/frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Mapbox token
```

### Environment Variables

```env
# Required
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token

# Backend (if running separately)
WEBSCRAPPER_URL=http://localhost:3001

# Optional: API keys for enhanced news coverage
GNEWS_API_KEY=your_gnews_key
GUARDIAN_API_KEY=your_guardian_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## LLM Setup

Eagle Eye supports multiple LLM providers for AI-powered research:

### LM Studio (Recommended for local)
1. Download [LM Studio](https://lmstudio.ai/)
2. Load a model (e.g., Llama, Mistral, Qwen)
3. Start local server (default: `http://localhost:1234/v1`)
4. Configure in Eagle Eye Settings

### Ollama
1. Install [Ollama](https://ollama.ai/)
2. Pull a model: `ollama pull llama3`
3. Server runs automatically on `http://localhost:11434`
4. Configure in Eagle Eye Settings

### OpenAI
1. Get API key from [OpenAI](https://platform.openai.com/)
2. Enter key in Eagle Eye Settings

## Project Structure

```
frontend/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   └── page.tsx        # Main page
├── components/          # React components
│   ├── map/            # Map & country modal
│   ├── feed/           # News feed
│   └── search/         # Research UI
├── stores/             # Zustand state stores
├── lib/                # Utilities
├── types/              # TypeScript types
└── Docs/               # Documentation
```

## Documentation

- [Developer Guide](./Docs/DEVELOPER_GUIDE.md) - Full technical documentation
- [Rebrand Plan](./Docs/EAGLE_EYE_REBRAND_PLAN.md) - Design decisions and implementation notes

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Maps | Mapbox GL JS |
| State | Zustand |
| UI | Custom + Radix primitives |
| Icons | Lucide React |
| Markdown | react-markdown |

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
npx tsc --noEmit # Type check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run type checking: `npx tsc --noEmit`
5. Submit a pull request

## License

MIT

---

*Built with Next.js, Mapbox, and local AI*
