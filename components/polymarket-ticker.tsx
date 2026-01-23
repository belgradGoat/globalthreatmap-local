"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, TrendingUp } from "lucide-react";

interface PolymarketTickerProps {
  category?: "geopolitics" | "politics" | "breaking-news" | "crypto" | "sports" | "world";
}

export function PolymarketTicker({ category = "geopolitics" }: PolymarketTickerProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Polymarket ticker URL - direct category path
  // Categories: geopolitics, politics, breaking-news, crypto, sports, world
  const tickerUrl = `https://ticker.polymarket.com/${category}`;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border transition-all duration-300 ${
        isCollapsed ? "h-10" : "h-64"
      }`}
    >
      {/* Header bar */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full h-10 px-4 border-b border-border hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span>Prediction Markets</span>
          <span className="text-xs opacity-60">powered by Polymarket</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground capitalize">{category}</span>
          {isCollapsed ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Ticker content */}
      {!isCollapsed && (
        <div className="h-[calc(100%-2.5rem)] w-full bg-background">
          <iframe
            src={tickerUrl}
            className="w-full h-full border-0"
            title="Polymarket Prediction Markets"
            sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
