#!/bin/bash
# run_agent.sh - RSS Feed Migration Agent Runner
# Run this in a tmux/screen session for persistence

set -e

ORCHESTRATOR_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$ORCHESTRATOR_DIR/logs/agent_$(date +%Y%m%d_%H%M%S).log"
COOLDOWN_MINUTES=10
MAX_SESSIONS=100  # Safety limit

mkdir -p "$ORCHESTRATOR_DIR/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_usage() {
    # This would ideally check Claude API usage
    # For now, we rely on Claude Code's /usage command
    log "Remember to check /usage in Claude Code session"
    return 0
}

run_session() {
    local session_num=$1
    log "=========================================="
    log "Starting session #$session_num"
    log "=========================================="
    
    cd ~/Documents/GitHub/globalthreatmap
    
    # Run Claude Code with the orchestrator instructions
    claude --dangerously-skip-permissions \
           --print \
           "Read orchestrator/ORCHESTRATOR.md and continue the RSS feed migration.
            
            First: Check /usage - if above 80%, save state and exit immediately.
            
            Then:
            1. Read state/progress.json to see current status
            2. Process up to 3 countries from the pending list
            3. For each country:
               a. Research local news RSS feeds (prioritize native language)
               b. Validate each feed URL works and has recent content
               c. Add working feeds to ../WebScrapper/WebScraper/local_news_sources.json
               d. Update state/progress.json after each country
            4. Exit cleanly when batch is complete or if usage > 80%
            
            Quality requirements:
            - Minimum 2 working feeds per country
            - At least 1 native language feed for non-English countries
            - All feeds must have content from last 30 days
            - Prefer state news agencies + independent outlets"
    
    local exit_code=$?
    log "Session #$session_num completed with exit code: $exit_code"
    
    return $exit_code
}

main() {
    log "RSS Feed Migration Agent Starting"
    log "Orchestrator directory: $ORCHESTRATOR_DIR"
    log "Cooldown between sessions: $COOLDOWN_MINUTES minutes"
    
    local session_count=0
    
    while [ $session_count -lt $MAX_SESSIONS ]; do
        session_count=$((session_count + 1))
        
        if ! run_session $session_count; then
            log "Session failed, longer cooldown (30 min)"
            sleep 1800
        else
            # Check if we're done
            local pending=$(cat "$ORCHESTRATOR_DIR/state/progress.json" | grep -o '"pending":\s*\[[^]]*\]' | grep -o '\[.*\]')
            if [ "$pending" = "[]" ]; then
                log "All countries processed! Migration complete."
                break
            fi
            
            log "Cooling down for $COOLDOWN_MINUTES minutes..."
            sleep $((COOLDOWN_MINUTES * 60))
        fi
    done
    
    log "Agent runner finished after $session_count sessions"
}

# Trap for clean shutdown
trap 'log "Received interrupt, saving state..."; exit 0' INT TERM

main "$@"
