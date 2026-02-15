"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/ui/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Newspaper,
  User,
  History,
  Shield,
  ExternalLink,
  Database,
  RotateCw,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { Favicon } from "@/components/ui/favicon";
import { cn } from "@/lib/utils";
import { useLLMStore } from "@/stores/llm-store";
import { NewsTab } from "./news-tab";
import { ProfileTab } from "./profile-tab";

interface CountryModalProps {
  country: string | null;
  onClose: () => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

interface ConflictSection {
  conflicts: string;
  sources: { title: string; url: string }[];
}

interface ConflictData {
  country: string;
  past: ConflictSection;
  current: ConflictSection;
}

type TabType = "news" | "profile" | "history" | "security";

function AnswerSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <RotateCw className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Researching...
        </span>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

function SourcesSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-foreground">Sources</span>
        <span className="text-sm text-muted-foreground">loading...</span>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CountryModal({
  country,
  onClose,
  onLoadingChange,
}: CountryModalProps) {
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamingCurrent, setIsStreamingCurrent] = useState(false);
  const [isStreamingPast, setIsStreamingPast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("news");
  const [securitySubTab, setSecuritySubTab] = useState<"current" | "past">("current");
  const eventSourceRef = useRef<EventSource | null>(null);
  const { settings: llmSettings } = useLLMStore();

  // Reset when country changes
  useEffect(() => {
    if (!country) {
      setConflictData(null);
      setError(null);
      setActiveTab("news");
      onLoadingChange?.(false);
    }
  }, [country, onLoadingChange]);

  // Fetch security/conflict data when security tab is selected
  useEffect(() => {
    if (!country || activeTab !== "security") return;
    if (conflictData?.country === country) return; // Already loaded

    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsLoading(true);
    setIsStreamingCurrent(true);
    setIsStreamingPast(false);
    onLoadingChange?.(true);
    setError(null);
    setSecuritySubTab("current");

    // Initialize data structure
    setConflictData({
      country,
      current: { conflicts: "", sources: [] },
      past: { conflicts: "", sources: [] },
    });

    // Build URL with LLM settings
    const url = new URL(`/api/countries/conflicts`, window.location.origin);
    url.searchParams.set("country", country);
    url.searchParams.set("stream", "true");
    if (llmSettings) {
      url.searchParams.set("llmSettings", JSON.stringify(llmSettings));
    }

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const chunk = JSON.parse(event.data);

        switch (chunk.type) {
          case "current_content":
            setConflictData((prev) =>
              prev
                ? {
                    ...prev,
                    current: {
                      ...prev.current,
                      conflicts: prev.current.conflicts + (chunk.content || ""),
                    },
                  }
                : null
            );
            break;

          case "current_sources":
            setConflictData((prev) =>
              prev
                ? {
                    ...prev,
                    current: {
                      ...prev.current,
                      sources: chunk.sources || [],
                    },
                  }
                : null
            );
            setIsStreamingCurrent(false);
            setIsStreamingPast(true);
            break;

          case "past_content":
            setConflictData((prev) =>
              prev
                ? {
                    ...prev,
                    past: {
                      ...prev.past,
                      conflicts: prev.past.conflicts + (chunk.content || ""),
                    },
                  }
                : null
            );
            break;

          case "past_sources":
            setConflictData((prev) =>
              prev
                ? {
                    ...prev,
                    past: {
                      ...prev.past,
                      sources: chunk.sources || [],
                    },
                  }
                : null
            );
            break;

          case "done":
            setIsLoading(false);
            setIsStreamingCurrent(false);
            setIsStreamingPast(false);
            onLoadingChange?.(false);
            eventSource.close();
            break;

          case "error":
            setError(chunk.error || "An error occurred");
            setIsLoading(false);
            setIsStreamingCurrent(false);
            setIsStreamingPast(false);
            onLoadingChange?.(false);
            eventSource.close();
            break;
        }
      } catch {
        // Ignore JSON parse errors
      }
    };

    eventSource.onerror = () => {
      setError("Connection lost. Please try again.");
      setIsLoading(false);
      setIsStreamingCurrent(false);
      setIsStreamingPast(false);
      onLoadingChange?.(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [country, activeTab, onLoadingChange, llmSettings, conflictData?.country]);

  const tabs = [
    { id: "news" as TabType, label: "News", icon: Newspaper },
    { id: "profile" as TabType, label: "Profile", icon: User },
    { id: "history" as TabType, label: "History", icon: History },
    { id: "security" as TabType, label: "Security", icon: Shield },
  ];

  const isStreaming =
    activeTab === "security" &&
    ((securitySubTab === "current" && isStreamingCurrent) ||
      (securitySubTab === "past" && isStreamingPast));

  const showAnswerSkeleton =
    activeTab === "security" && isLoading && !conflictData?.[securitySubTab].conflicts;
  const showSourcesSkeleton =
    activeTab === "security" && isLoading && conflictData?.[securitySubTab].sources.length === 0;

  return (
    <Dialog open={!!country} onClose={onClose} className="max-w-2xl">
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-eagle-secondary)", opacity: 0.2 }}
          >
            <Globe className="h-5 w-5" style={{ color: "var(--color-eagle-secondary)" }} />
          </div>
          <div>
            <DialogTitle>{country}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Explore news, facts, and history
            </p>
          </div>
        </div>
      </DialogHeader>

      <DialogContent className="max-h-[65vh]">
        {/* Main Tabs */}
        <div className="mb-4 flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-[var(--color-eagle-secondary)] text-[var(--color-eagle-secondary)]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="h-[calc(65vh-140px)]">
          {activeTab === "news" && country && <NewsTab country={country} />}

          {activeTab === "profile" && country && <ProfileTab country={country} />}

          {activeTab === "history" && country && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <History className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Historical timeline coming soon
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use the Security tab for conflict history
              </p>
            </div>
          )}

          {activeTab === "security" && (
            <div className="flex h-full flex-col">
              {error && (
                <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Security Sub-tabs */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setSecuritySubTab("current")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    securitySubTab === "current"
                      ? "bg-amber-500/20 text-amber-400"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Current
                  {isStreamingCurrent && <RotateCw className="h-3 w-3 animate-spin" />}
                </button>
                <button
                  onClick={() => setSecuritySubTab("past")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    securitySubTab === "past"
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <History className="h-4 w-4" />
                  Historical
                  {isStreamingPast && <RotateCw className="h-3 w-3 animate-spin" />}
                </button>
              </div>

              {/* Security Content */}
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6">
                  {showAnswerSkeleton ? (
                    <AnswerSkeleton />
                  ) : conflictData?.[securitySubTab].conflicts ? (
                    <div className="rounded-lg border border-border bg-card p-4">
                      <div className="prose prose-base prose-invert max-w-none">
                        <Markdown
                          content={conflictData[securitySubTab].conflicts}
                          className="text-base leading-relaxed"
                        />
                        {isStreaming && (
                          <span className="inline-block h-4 w-1 animate-pulse bg-primary" />
                        )}
                      </div>
                    </div>
                  ) : !isLoading ? (
                    <div className="py-8 text-center">
                      <Shield className="mx-auto h-10 w-10 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Loading security analysis...
                      </p>
                    </div>
                  ) : null}

                  {showSourcesSkeleton ? (
                    <SourcesSkeleton />
                  ) : conflictData?.[securitySubTab].sources.length ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">Sources</span>
                        <span className="text-sm text-muted-foreground">
                          ({conflictData[securitySubTab].sources.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {conflictData[securitySubTab].sources.slice(0, 10).map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:bg-muted/50"
                          >
                            <Favicon url={source.url} size={20} className="mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="line-clamp-2 text-foreground">
                                {source.title}
                              </span>
                              <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <ExternalLink className="h-3 w-3" />
                                {new URL(source.url).hostname}
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
