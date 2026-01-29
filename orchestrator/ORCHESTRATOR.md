# GlobalThreatMap RSS Feed Migration Orchestrator

## Mission
Systematically add locally-sourced RSS feeds for EVERY country in country-keywords.ts.
Goal: News FROM each country, not news ABOUT each country.

## Current Date Context
Always check the current date when running. Use this for:
- Validating feed freshness (must have content from last 30 days)
- Logging progress with timestamps

## State Management

### Progress File: `state/progress.json`
```json
{
  "lastUpdated": "ISO-8601 timestamp",
  "totalCountries": 80,
  "completed": ["poland", "ukraine"],
  "inProgress": null,
  "failed": [],
  "pending": ["remaining", "countries"],
  "stats": {
    "feedsAdded": 0,
    "feedsValidated": 0,
    "feedsFailed": 0
  }
}
```

### Per-Country Plans: `state/plans/{country_code}.json`
```json
{
  "country": "somalia",
  "region": "africa",
  "language": "so",
  "nativeLanguageName": "Soomaaliya",
  "status": "planned|building|testing|complete|failed",
  "researchNotes": "Found 5 potential sources...",
  "proposedSources": [
    {
      "name": "Shabelle Media Network",
      "url": "https://shabellemedia.com/feed/",
      "language": "so",
      "bias": "center",
      "validated": false,
      "lastChecked": null
    }
  ],
  "testResults": null
}
```

## Workflow Per Country

### Phase 1: Research (Planning Agent)
1. Read country from pending list
2. Check country-keywords.ts for native language terms
3. Use web search to find:
   - Major national newspapers (look for /rss, /feed endpoints)
   - State news agencies
   - Independent media outlets
   - Regional/local news sites
4. Prioritize sources that publish in NATIVE LANGUAGE
5. Save plan to `state/plans/{country}.json`

### Phase 2: Build (Worker Agent)
1. Read plan from `state/plans/{country}.json`
2. Validate each proposed RSS URL:
   - Fetch the feed
   - Check for valid XML/RSS structure
   - Verify recent content (within 30 days)
   - Extract sample headlines
3. Update `local_news_sources.json` with working feeds
4. Update plan status to "testing"

### Phase 3: Test (Testing Agent)
1. For each added feed, verify:
   - Feed returns valid RSS/XML
   - Has content from last 7 days
   - Headlines match expected language
   - At least 5 articles present
2. Mark feeds as validated or failed
3. Update progress.json

### Phase 4: Loop
1. Move country from "inProgress" to "completed" or "failed"
2. Pick next pending country
3. Repeat

## Rate Limit Awareness

### Checking Usage
Run `/usage` command in Claude Code CLI to check current usage.
If usage > 80%:
- Save current state immediately
- Exit gracefully with status message
- Do NOT start new country processing

### Batch Sizes
- Process max 3-5 countries per session
- Save state after EACH country completion
- Allow 10-second pause between countries

## Quality Criteria

### Minimum Requirements per Country
- At least 2 working RSS feeds
- At least 1 feed in native language (if non-English country)
- Feed must have content from last 30 days
- Diverse source types (government + independent preferred)

### Source Quality Hierarchy
1. **Best**: National news agency (state media)
2. **Good**: Major independent newspapers  
3. **Acceptable**: Regional news, English-language local sites
4. **Avoid**: Western media coverage OF the country (BBC, CNN, etc.)

## File Locations

```
globalthreatmap/
├── orchestrator/
│   ├── ORCHESTRATOR.md          # This file - instructions
│   ├── state/
│   │   ├── progress.json        # Overall progress tracking
│   │   └── plans/               # Per-country planning docs
│   │       ├── somalia.json
│   │       ├── nepal.json
│   │       └── ...
│   └── scripts/
│       ├── run_agent.sh         # Launch script
│       └── validate_feed.py     # Test RSS feed validity
├── lib/
│   └── country-keywords.ts      # Reference: native language keywords
└── ../WebScrapper/WebScraper/
    └── local_news_sources.json  # TARGET: Add feeds here
```

## CLI Commands

### Start Session
```bash
cd ~/Documents/GitHub/globalthreatmap
claude --dangerously-skip-permissions
```

### Resume Work
Tell Claude:
```
Read orchestrator/ORCHESTRATOR.md and continue the RSS feed migration.
Check state/progress.json for current status.
Process 3 countries max this session.
Check /usage before starting each country.
```

### Manual Feed Test
```bash
curl -s "https://example.com/feed/" | head -50
```

## Error Recovery

### If Session Crashes
1. State is preserved in progress.json
2. Incomplete country marked in "inProgress"
3. Next session: Check inProgress first, complete or reset it

### If Feed Validation Fails
1. Try alternative URL patterns: /rss, /feed, /rss.xml, /feed.xml
2. Check if site has changed their RSS location
3. Search "{site_name} RSS feed" 
4. Mark as failed after 3 attempts, move to next source

## Countries Needing Priority Attention

Based on country-keywords.ts vs local_news_sources.json gaps:

### Missing Entirely (need full RSS setup):
- Bahrain, Oman, Kuwait, Qatar (Gulf states minus UAE/Saudi)
- Turkmenistan, Kyrgyzstan, Tajikistan
- Cuba, Chile, Peru, Colombia (South America gaps)
- Iceland (Nordic but not in nordic regional)

### Sparse Coverage (need more native sources):
- Nepal, Sri Lanka, Bangladesh (have some, need native language)
- Most African countries (have English-only, need local language)
- Central Asian "-stans" 

### Data Inconsistencies to Fix:
- "Venezuela" should be "venezuela" (lowercase)
- Some regions mixed with countries (nordic should have country breakdown)

## Session Checklist

Before each session:
- [ ] Check /usage (must be < 80%)
- [ ] Read progress.json for state
- [ ] Identify next 3-5 countries

During session:
- [ ] Save state after each country
- [ ] Validate feeds before adding
- [ ] Use native language sources when possible

After session:
- [ ] Update progress.json
- [ ] Log session summary
- [ ] Note any blockers for next session

## Example: Adding a New Country (Nepal)

### Step 1: Research
```
Web search: "Nepal news RSS feed"
Web search: "नेपाल समाचार RSS" (native)
Web search: "Kathmandu Post RSS"
Web search: "Kantipur RSS feed"
```

### Step 2: Found Sources
- Kathmandu Post: https://kathmandupost.com/rss
- Kantipur (Nepali): https://ekantipur.com/rss  
- OnlineKhabar: https://www.onlinekhabar.com/feed
- Republica: https://myrepublica.nagariknetwork.com/rss

### Step 3: Validate
```bash
curl -s "https://kathmandupost.com/rss" | grep -E "<item>|<title>"
# Check for recent dates, valid XML
```

### Step 4: Add to local_news_sources.json
```json
"nepal": [
  {
    "name": "Kathmandu Post",
    "url": "https://kathmandupost.com/rss",
    "language": "en",
    "bias": "center"
  },
  {
    "name": "eKantipur",
    "url": "https://ekantipur.com/rss",
    "language": "ne",
    "bias": "center"
  }
]
```

### Step 5: Update State
Mark Nepal as complete, move to next country.
