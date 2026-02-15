"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Server,
  Check,
  X,
  Loader2,
  RefreshCw,
  Map,
  Newspaper,
  Search,
  Cpu,
} from "lucide-react";
import { useLLMStore, type LLMProvider } from "@/stores/llm-store";
import { useMapStore, MAP_STYLES, type MapStyleId } from "@/stores/map-store";
import { useSettingsStore } from "@/stores/settings-store";
import { testConnection, getProviderDefaults } from "@/lib/llm-client";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = "llm" | "map" | "news" | "research";

const TABS: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
  { id: "llm", label: "AI Model", icon: Cpu },
  { id: "map", label: "Map", icon: Map },
  { id: "news", label: "News", icon: Newspaper },
  { id: "research", label: "Research", icon: Search },
];

const PROVIDERS: { value: LLMProvider; label: string; description: string }[] = [
  {
    value: "lmstudio",
    label: "LM Studio",
    description: "Local LLM server (default port 1234)",
  },
  {
    value: "ollama",
    label: "Ollama",
    description: "Run models locally (default port 11434)",
  },
  {
    value: "openai-compatible",
    label: "OpenAI-Compatible",
    description: "vLLM, LocalAI, text-generation-webui, etc.",
  },
  {
    value: "openai",
    label: "OpenAI Cloud",
    description: "Requires API key",
  },
];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("llm");

  // LLM Store
  const { settings, setSettings, isConnected, lastError, setConnectionStatus } =
    useLLMStore();

  // Map Store
  const { mapStyle, showMilitaryBases, setMapStyle, toggleMilitaryBases } =
    useMapStore();

  // Settings Store
  const {
    showSecurityNews,
    includeSecurityAnalysisByDefault,
    setShowSecurityNews,
    setIncludeSecurityAnalysisByDefault,
  } = useSettingsStore();

  const [localSettings, setLocalSettings] = useState(settings);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    models?: string[];
  } | null>(null);

  // Sync local state when modal opens
  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
      setTestResult(null);
    }
  }, [open, settings]);

  const handleProviderChange = (provider: LLMProvider) => {
    const defaults = getProviderDefaults(provider);
    setLocalSettings({
      ...localSettings,
      provider,
      serverUrl: defaults.serverUrl || localSettings.serverUrl,
      model: defaults.model || "",
    });
    setTestResult(null);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const result = await testConnection(localSettings);
    setTestResult(result);
    setIsTesting(false);

    // Auto-select first model for Ollama if none selected and models available
    if (
      result.success &&
      localSettings.provider === "ollama" &&
      !localSettings.model &&
      result.models &&
      result.models.length > 0
    ) {
      setLocalSettings({ ...localSettings, model: result.models[0] });
    }
  };

  const handleSave = () => {
    // Validate Ollama requires a model
    if (localSettings.provider === "ollama" && !localSettings.model) {
      setTestResult({
        success: false,
        message: "Ollama requires a model. Please test connection and select a model.",
      });
      return;
    }

    setSettings(localSettings);
    if (testResult?.success) {
      setConnectionStatus(true);
    }
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const renderLLMTab = () => (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Provider
        </label>
        <div className="grid gap-2">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.value}
              onClick={() => handleProviderChange(provider.value)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                localSettings.provider === provider.value
                  ? "border-[var(--color-eagle-secondary)] bg-[var(--color-eagle-secondary)]/10"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <div
                className={`mt-0.5 h-4 w-4 rounded-full border-2 ${
                  localSettings.provider === provider.value
                    ? "border-[var(--color-eagle-secondary)] bg-[var(--color-eagle-secondary)]"
                    : "border-muted-foreground"
                }`}
              >
                {localSettings.provider === provider.value && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">
                  {provider.label}
                </div>
                <div className="text-sm text-muted-foreground">
                  {provider.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Server URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Server URL
        </label>
        <div className="flex gap-2">
          <Input
            value={localSettings.serverUrl}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, serverUrl: e.target.value })
            }
            placeholder="http://localhost:1234/v1"
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const defaults = getProviderDefaults(localSettings.provider);
              setLocalSettings({
                ...localSettings,
                serverUrl: defaults.serverUrl || localSettings.serverUrl,
              });
            }}
            title="Reset to default"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Model Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Model{" "}
          {localSettings.provider === "ollama" ? (
            <span className="text-red-400 font-normal">(required)</span>
          ) : (
            <span className="text-muted-foreground font-normal">(optional)</span>
          )}
        </label>

        {/* Show dropdown for Ollama if models are available */}
        {localSettings.provider === "ollama" && testResult?.models && testResult.models.length > 0 ? (
          <select
            value={localSettings.model}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, model: e.target.value })
            }
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-eagle-secondary)]"
          >
            <option value="">Select a model...</option>
            {testResult.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        ) : (
          <Input
            value={localSettings.model}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, model: e.target.value })
            }
            placeholder={
              localSettings.provider === "ollama"
                ? "Test connection to see available models"
                : localSettings.provider === "openai"
                ? "gpt-4o-mini"
                : "Leave empty for server default"
            }
          />
        )}

        {/* Show available models hint for non-Ollama or when no test done */}
        {localSettings.provider !== "ollama" && testResult?.models && testResult.models.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Available: {testResult.models.slice(0, 5).join(", ")}
            {testResult.models.length > 5 &&
              ` +${testResult.models.length - 5} more`}
          </div>
        )}

        {/* Hint for Ollama to test connection */}
        {localSettings.provider === "ollama" && (!testResult?.models || testResult.models.length === 0) && (
          <div className="text-xs text-yellow-500">
            Click "Test Connection" to load available models
          </div>
        )}
      </div>

      {/* API Key (for OpenAI) */}
      {localSettings.provider === "openai" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            API Key
          </label>
          <Input
            type="password"
            value={localSettings.apiKey}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, apiKey: e.target.value })
            }
            placeholder="sk-..."
          />
        </div>
      )}

      {/* Test Connection */}
      <div className="space-y-2">
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={isTesting}
          className="w-full"
        >
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <Server className="mr-2 h-4 w-4" />
              Test Connection
            </>
          )}
        </Button>

        {testResult && (
          <div
            className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
              testResult.success
                ? "bg-green-500/10 text-green-500"
                : "bg-red-500/10 text-red-500"
            }`}
          >
            {testResult.success ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <X className="h-4 w-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current Status:</span>
          <span
            className={`flex items-center gap-1.5 ${
              isConnected ? "text-green-500" : "text-yellow-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            {isConnected ? "Connected" : "Not tested"}
          </span>
        </div>
        {lastError && (
          <div className="mt-2 text-xs text-red-500">{lastError}</div>
        )}
      </div>
    </div>
  );

  const renderMapTab = () => (
    <div className="space-y-6">
      {/* Map Style */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Map Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(MAP_STYLES) as MapStyleId[]).map((styleId) => {
            const style = MAP_STYLES[styleId];
            return (
              <button
                key={styleId}
                onClick={() => setMapStyle(styleId)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                  mapStyle === styleId
                    ? "border-[var(--color-eagle-secondary)] bg-[var(--color-eagle-secondary)]/10"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <span className="text-2xl">
                  {style.icon === "satellite" && "🛰️"}
                  {style.icon === "sun" && "☀️"}
                  {style.icon === "moon" && "🌙"}
                  {style.icon === "map" && "🗺️"}
                </span>
                <div className="text-center">
                  <div className="font-medium text-foreground text-sm">
                    {style.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {style.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Overlays */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Map Overlays
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30">
            <input
              type="checkbox"
              checked={showMilitaryBases}
              onChange={() => toggleMilitaryBases()}
              className="h-4 w-4 rounded border-border accent-[var(--color-eagle-secondary)]"
            />
            <div>
              <div className="font-medium text-foreground text-sm">
                Show Military Bases
              </div>
              <div className="text-xs text-muted-foreground">
                Display US and NATO military installations
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderNewsTab = () => (
    <div className="space-y-6">
      {/* Security News Toggle */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Content Preferences
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30">
            <input
              type="checkbox"
              checked={showSecurityNews}
              onChange={(e) => setShowSecurityNews(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--color-eagle-secondary)]"
            />
            <div>
              <div className="font-medium text-foreground text-sm">
                Include Security & Military News
              </div>
              <div className="text-xs text-muted-foreground">
                Show conflict, terrorism, and military-related articles in your feed
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          Security-related content includes articles about conflicts, military operations,
          terrorism, and defense matters. These can be toggled on when needed.
        </p>
      </div>
    </div>
  );

  const renderResearchTab = () => (
    <div className="space-y-6">
      {/* Research Defaults */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Research Defaults
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30">
            <input
              type="checkbox"
              checked={includeSecurityAnalysisByDefault}
              onChange={(e) => setIncludeSecurityAnalysisByDefault(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--color-eagle-secondary)]"
            />
            <div>
              <div className="font-medium text-foreground text-sm">
                Include Security Analysis by Default
              </div>
              <div className="text-xs text-muted-foreground">
                Research reports will include threat assessments and security sections
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          When enabled, research reports will automatically include security-focused sections
          like threat assessments and capability analysis. You can always toggle this per-research.
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-2xl">
      <DialogHeader onClose={handleClose}>
        <DialogTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" style={{ color: "var(--color-eagle-secondary)" }} />
          Eagle Eye Settings
        </DialogTitle>
      </DialogHeader>

      <DialogContent className="p-0">
        <div className="flex min-h-[400px]">
          {/* Sidebar Tabs */}
          <div className="w-40 border-r border-border bg-muted/20 p-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left",
                    activeTab === tab.id
                      ? "bg-[var(--color-eagle-secondary)]/10 text-[var(--color-eagle-secondary)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "llm" && renderLLMTab()}
            {activeTab === "map" && renderMapTab()}
            {activeTab === "news" && renderNewsTab()}
            {activeTab === "research" && renderResearchTab()}
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          style={{ backgroundColor: "var(--color-eagle-secondary)" }}
          className="text-white hover:opacity-90"
        >
          Save Settings
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
