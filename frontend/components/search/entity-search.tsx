"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  Globe,
  FileText,
  Maximize2,
  AlertCircle,
  Shield,
  BookOpen,
} from "lucide-react";
import { Favicon } from "@/components/ui/favicon";
import { useMapStore } from "@/stores/map-store";
import { useLLMStore } from "@/stores/llm-store";
import { useSettingsStore } from "@/stores/settings-store";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import type { EntityProfile } from "@/types";

interface Source {
  title: string;
  url: string;
  source?: string;
}

interface ResearchResult {
  output: string;
  sources: Source[];
}

export function EntitySearch() {
  const { includeSecurityAnalysisByDefault } = useSettingsStore();
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState<EntityProfile | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [includeSecurityAnalysis, setIncludeSecurityAnalysis] = useState(includeSecurityAnalysisByDefault);

  // Streaming research state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [streamedContent, setStreamedContent] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { flyTo, setEntityLocations, clearEntityLocations } = useMapStore();
  const { settings: llmSettings, isConnected } = useLLMStore();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;

    // Check if LLM is configured
    if (!isConnected) {
      setError("LLM not connected. Please configure your LLM provider in Settings.");
      return;
    }

    // Reset state
    clearEntityLocations();
    setEntity(null);
    setResearchResult(null);
    setStreamedContent("");
    setSources([]);
    setError(null);
    setStatusMessage(null);
    setIsLoading(true);

    // Create placeholder entity
    setEntity({
      id: `entity_${Date.now()}`,
      name: query,
      type: "group",
      description: "",
      locations: [],
      relatedEntities: [],
      economicData: {},
    });

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/deepresearch/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: query,
          includeSecurityAnalysis,
          llmSettings: {
            provider: llmSettings.provider,
            serverUrl: llmSettings.serverUrl,
            model: llmSettings.model,
            apiKey: llmSettings.apiKey,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let fullContent = "";
      let collectedSources: Source[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(line => line.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case "status":
                setStatusMessage(data.message);
                break;

              case "sources":
                collectedSources = data.sources || [];
                setSources(collectedSources);
                break;

              case "content":
                fullContent += data.content;
                setStreamedContent(fullContent);
                setStatusMessage(null);
                break;

              case "done":
                setResearchResult({
                  output: fullContent,
                  sources: collectedSources,
                });
                setIsLoading(false);
                break;

              case "error":
                setError(data.error || "Research failed");
                setIsLoading(false);
                break;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Research failed");
      setIsLoading(false);
    }
  };

  const handleShowOnMap = () => {
    if (entity?.locations && entity.locations.length > 0) {
      setEntityLocations(entity.name, entity.locations);
      const firstLocation = entity.locations[0];
      flyTo(firstLocation.longitude, firstLocation.latitude, 4);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setStatusMessage(null);
  };

  // Current display content (streaming or final)
  const displayContent = researchResult?.output || streamedContent;
  const displaySources = researchResult?.sources || sources;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5" style={{ color: "var(--color-eagle-secondary)" }} />
          <h2 className="text-lg font-semibold text-foreground">Research</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Deep research on any topic using your local LLM
        </p>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="e.g. Ukraine history, Climate summit, Olympics 2024..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          {isLoading ? (
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          ) : (
            <Button
              onClick={handleSearch}
              disabled={!query.trim()}
              style={{ backgroundColor: "var(--color-eagle-secondary)" }}
              className="text-white hover:opacity-90"
            >
              Research
            </Button>
          )}
        </div>

        {/* Security Analysis Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeSecurityAnalysis}
            onChange={(e) => setIncludeSecurityAnalysis(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--color-eagle-secondary)]"
          />
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Include security & threat analysis
          </span>
        </label>

        {/* Status message */}
        {isLoading && statusMessage && (
          <div
            className="rounded-lg border p-3 text-sm"
            style={{
              backgroundColor: "rgba(13, 148, 136, 0.1)",
              borderColor: "rgba(13, 148, 136, 0.2)",
            }}
          >
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Loader2
                className="h-4 w-4 animate-spin"
                style={{ color: "var(--color-eagle-secondary)" }}
              />
              {statusMessage}
            </div>
          </div>
        )}

        {/* Streaming indicator */}
        {isLoading && !statusMessage && streamedContent && (
          <div
            className="rounded-lg border p-3 text-sm"
            style={{
              backgroundColor: "rgba(13, 148, 136, 0.1)",
              borderColor: "rgba(13, 148, 136, 0.2)",
            }}
          >
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Loader2
                className="h-4 w-4 animate-spin"
                style={{ color: "var(--color-eagle-secondary)" }}
              />
              Generating research report...
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span className="text-destructive">{error}</span>
          </div>
        )}

        {/* LLM not connected warning */}
        {!isConnected && !error && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <span className="text-yellow-500">
              LLM not connected. Configure your provider in Settings (gear icon in header).
            </span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {entity && displayContent && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(13, 148, 136, 0.2)" }}
                >
                  <Globe className="h-5 w-5" style={{ color: "var(--color-eagle-secondary)" }} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{entity.name}</CardTitle>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: "var(--color-eagle-secondary)",
                        color: "var(--color-eagle-secondary)",
                      }}
                    >
                      <BookOpen className="mr-1 h-3 w-3" />
                      Research Report
                    </Badge>
                    {includeSecurityAnalysis && (
                      <Badge variant="outline" className="text-slate-400 border-slate-500">
                        <Shield className="mr-1 h-3 w-3" />
                        Security
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Report Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <FileText className="h-4 w-4" />
                    Report
                    {isLoading && (
                      <Loader2
                        className="h-3 w-3 animate-spin"
                        style={{ color: "var(--color-eagle-secondary)" }}
                      />
                    )}
                  </h4>
                  {researchResult && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFullReport(true)}
                      className="h-7 text-xs"
                    >
                      <Maximize2 className="mr-1 h-3 w-3" />
                      View Full Report
                    </Button>
                  )}
                </div>

                {/* Preview - first 800 chars or streaming content */}
                <div className="text-sm text-muted-foreground max-h-40 overflow-hidden relative">
                  <Markdown
                    content={
                      researchResult
                        ? displayContent.slice(0, 800) + "..."
                        : displayContent
                    }
                  />
                  {researchResult && (
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
                  )}
                </div>
              </div>

              {/* Sources */}
              {displaySources.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-foreground">
                    Sources ({displaySources.length})
                  </h4>
                  <div className="space-y-1">
                    {displaySources.slice(0, 10).map((source, i) => (
                      <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-foreground hover:text-[var(--color-eagle-secondary)] transition-colors"
                      >
                        <Favicon url={source.url} size={16} />
                        <span className="truncate">{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!entity && !isLoading && (
          <div className="py-8 text-center">
            <Globe
              className="mx-auto h-12 w-12"
              style={{ color: "rgba(13, 148, 136, 0.3)" }}
            />
            <p className="mt-4 text-sm text-muted-foreground">
              Research any topic in depth
            </p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground/70">
              <p>Countries, events, organizations, historical topics</p>
              <p>Ukraine conflict, Climate change, Olympics, Tech companies</p>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <p>
                Uses your configured LLM ({llmSettings.provider}) to generate
                comprehensive research reports from 600+ global news sources.
              </p>
            </div>
          </div>
        )}

        {entity && isLoading && !displayContent && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(13, 148, 136, 0.2)" }}
                >
                  <Globe className="h-5 w-5" style={{ color: "var(--color-eagle-secondary)" }} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{entity.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className="mt-1"
                    style={{
                      borderColor: "var(--color-eagle-secondary)",
                      color: "var(--color-eagle-secondary)",
                    }}
                  >
                    <BookOpen className="mr-1 h-3 w-3" />
                    Research Report
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-full" />
                <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              </div>
            </CardContent>
          </Card>
        )}
      </ScrollArea>

      {/* Full Report Dialog */}
      <Dialog
        open={showFullReport}
        onClose={() => setShowFullReport(false)}
        className="max-w-4xl"
      >
        <DialogHeader onClose={() => setShowFullReport(false)}>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: "var(--color-eagle-secondary)" }} />
            Research Report: {entity?.name}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="h-[70vh] flex flex-col">
          <ScrollArea className="flex-1">
            <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
              {researchResult && <Markdown content={researchResult.output} />}
            </div>
            {/* Sources at bottom */}
            {researchResult?.sources && researchResult.sources.length > 0 && (
              <div className="mt-8 pt-4 border-t border-border">
                <h4 className="text-sm font-medium mb-3">
                  Sources ({researchResult.sources.length})
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {researchResult.sources.slice(0, 20).map((source, i) => (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground truncate"
                    >
                      <Favicon url={source.url} size={12} />
                      <span className="truncate">{source.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
