"use client";

import { useEffect, useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Favicon } from "@/components/ui/favicon";
import { Markdown } from "@/components/ui/markdown";
import {
  ExternalLink,
  Newspaper,
  Building2,
  TrendingUp,
  Cpu,
  Leaf,
  Heart,
  FlaskConical,
  Shield,
  Palette,
  RotateCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLLMStore } from "@/stores/llm-store";

interface NewsArticle {
  title: string;
  url: string;
  description: string;
  source: string;
  publishedAt: string;
  category?: string;
}

interface NewsTabProps {
  country: string;
}

interface NewsSummary {
  general: string;
  politics: string;
  business: string;
  sources: { title: string; url: string; source?: string }[];
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  politics: { icon: Building2, color: "bg-blue-500/20 text-blue-400", label: "Politics" },
  economy: { icon: TrendingUp, color: "bg-green-500/20 text-green-400", label: "Economy" },
  technology: { icon: Cpu, color: "bg-purple-500/20 text-purple-400", label: "Technology" },
  environment: { icon: Leaf, color: "bg-emerald-500/20 text-emerald-400", label: "Environment" },
  health: { icon: Heart, color: "bg-red-500/20 text-red-400", label: "Health" },
  science: { icon: FlaskConical, color: "bg-indigo-500/20 text-indigo-400", label: "Science" },
  security: { icon: Shield, color: "bg-slate-500/20 text-slate-400", label: "Security" },
  culture: { icon: Palette, color: "bg-pink-500/20 text-pink-400", label: "Culture" },
  sports: { icon: Newspaper, color: "bg-orange-500/20 text-orange-400", label: "Sports" },
  general: { icon: Newspaper, color: "bg-gray-500/20 text-gray-400", label: "General" },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NewsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <RotateCw className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Generating AI summary...</span>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

function SummarySection({
  title,
  icon: Icon,
  content,
  isStreaming,
  color,
}: {
  title: string;
  icon: React.ElementType;
  content: string;
  isStreaming: boolean;
  color: string;
}) {
  if (!content && !isStreaming) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={cn("rounded-md p-1", color)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-medium text-foreground">{title}</span>
        {isStreaming && <RotateCw className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <div className="pl-7 text-sm text-muted-foreground">
        {content ? (
          <Markdown content={content} className="text-sm leading-relaxed" />
        ) : (
          <SummarySkeleton />
        )}
        {isStreaming && content && (
          <span className="inline-block h-3 w-0.5 animate-pulse bg-primary ml-0.5" />
        )}
      </div>
    </div>
  );
}

export function NewsTab({ country }: NewsTabProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // AI Summary state
  const [summary, setSummary] = useState<NewsSummary>({
    general: "",
    politics: "",
    business: "",
    sources: [],
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isStreamingGeneral, setIsStreamingGeneral] = useState(false);
  const [isStreamingPolitics, setIsStreamingPolitics] = useState(false);
  const [isStreamingBusiness, setIsStreamingBusiness] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const { settings: llmSettings } = useLLMStore();

  // Fetch news articles
  useEffect(() => {
    if (!country) return;

    const fetchNews = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/countries/${encodeURIComponent(country)}/news?limit=30`
        );

        if (!response.ok) throw new Error("Failed to fetch news");

        const data = await response.json();
        setArticles(data.articles || []);
      } catch (err) {
        setError("Failed to load news");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [country]);

  // Fetch AI summary via SSE
  useEffect(() => {
    if (!country) return;

    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Reset summary state
    setSummary({ general: "", politics: "", business: "", sources: [] });
    setIsSummaryLoading(true);
    setIsStreamingGeneral(true);
    setIsStreamingPolitics(false);
    setIsStreamingBusiness(false);
    setSummaryError(null);

    // Build URL with LLM settings
    const url = new URL(`/api/countries/${encodeURIComponent(country)}/news-summary`, window.location.origin);
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
          case "sources":
            setSummary((prev) => ({ ...prev, sources: chunk.sources || [] }));
            break;

          case "general_content":
            setSummary((prev) => ({
              ...prev,
              general: prev.general + (chunk.content || ""),
            }));
            break;

          case "politics_content":
            setIsStreamingGeneral(false);
            setIsStreamingPolitics(true);
            setSummary((prev) => ({
              ...prev,
              politics: prev.politics + (chunk.content || ""),
            }));
            break;

          case "business_content":
            setIsStreamingPolitics(false);
            setIsStreamingBusiness(true);
            setSummary((prev) => ({
              ...prev,
              business: prev.business + (chunk.content || ""),
            }));
            break;

          case "done":
            setIsSummaryLoading(false);
            setIsStreamingGeneral(false);
            setIsStreamingPolitics(false);
            setIsStreamingBusiness(false);
            eventSource.close();
            break;

          case "error":
            setSummaryError(chunk.error || "Failed to generate summary");
            setIsSummaryLoading(false);
            setIsStreamingGeneral(false);
            setIsStreamingPolitics(false);
            setIsStreamingBusiness(false);
            eventSource.close();
            break;
        }
      } catch {
        // Ignore JSON parse errors
      }
    };

    eventSource.onerror = () => {
      setSummaryError("Connection lost. Summary may be incomplete.");
      setIsSummaryLoading(false);
      setIsStreamingGeneral(false);
      setIsStreamingPolitics(false);
      setIsStreamingBusiness(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [country, llmSettings]);

  const filteredArticles =
    selectedCategory === "all"
      ? articles
      : articles.filter((a) => a.category === selectedCategory);

  const categories = ["all", ...new Set(articles.map((a) => a.category || "general"))];

  const hasSummaryContent = summary.general || summary.politics || summary.business;

  return (
    <div className="flex h-full flex-col">
      {/* AI Summary Section */}
      <div className="mb-4 rounded-lg border border-border bg-card/50 overflow-hidden">
        <button
          onClick={() => setSummaryExpanded(!summaryExpanded)}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-eagle-secondary)]" />
            <span className="text-sm font-medium text-foreground">AI News Summary</span>
            {isSummaryLoading && (
              <RotateCw className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </div>
          {summaryExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {summaryExpanded && (
          <div className="border-t border-border px-4 py-3 space-y-4">
            {summaryError ? (
              <p className="text-sm text-destructive">{summaryError}</p>
            ) : !hasSummaryContent && isSummaryLoading ? (
              <SummarySkeleton />
            ) : (
              <>
                <SummarySection
                  title="Headlines"
                  icon={Newspaper}
                  content={summary.general}
                  isStreaming={isStreamingGeneral}
                  color="bg-gray-500/20 text-gray-400"
                />
                <SummarySection
                  title="Politics"
                  icon={Building2}
                  content={summary.politics}
                  isStreaming={isStreamingPolitics}
                  color="bg-blue-500/20 text-blue-400"
                />
                <SummarySection
                  title="Business & Economy"
                  icon={TrendingUp}
                  content={summary.business}
                  isStreaming={isStreamingBusiness}
                  color="bg-green-500/20 text-green-400"
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              selectedCategory === cat
                ? "bg-[var(--color-eagle-secondary)] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {cat === "all" ? "All" : CATEGORY_CONFIG[cat]?.label || cat}
          </button>
        ))}
      </div>

      {/* Articles List */}
      <ScrollArea className="flex-1 pr-2">
        {isLoading ? (
          <NewsSkeleton />
        ) : error ? (
          <div className="rounded-lg bg-destructive/10 p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-8 text-center">
            <Newspaper className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No news found for {country}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map((article, i) => {
              const categoryConfig = CATEGORY_CONFIG[article.category || "general"];
              const CategoryIcon = categoryConfig?.icon || Newspaper;

              return (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    <Favicon url={article.url} size={20} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="line-clamp-2 text-sm font-medium text-foreground">
                        {article.title}
                      </h4>
                      {article.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {article.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {article.source}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(article.publishedAt)}
                        </span>
                        {article.category && (
                          <Badge
                            variant="outline"
                            className={cn("text-xs", categoryConfig?.color)}
                          >
                            <CategoryIcon className="mr-1 h-3 w-3" />
                            {categoryConfig?.label || article.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
