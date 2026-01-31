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
} from "lucide-react";
import { useLLMStore, type LLMProvider } from "@/stores/llm-store";
import { testConnection, getProviderDefaults } from "@/lib/llm-client";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  const { settings, setSettings, isConnected, lastError, setConnectionStatus } =
    useLLMStore();

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
  };

  const handleSave = () => {
    setSettings(localSettings);
    if (testResult?.success) {
      setConnectionStatus(true);
    }
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-lg">
      <DialogHeader onClose={handleClose}>
        <DialogTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          LLM Provider Settings
        </DialogTitle>
      </DialogHeader>

      <DialogContent className="space-y-6">
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
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div
                  className={`mt-0.5 h-4 w-4 rounded-full border-2 ${
                    localSettings.provider === provider.value
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}
                >
                  {localSettings.provider === provider.value && (
                    <Check className="h-3 w-3 text-primary-foreground" />
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
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <Input
            value={localSettings.model}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, model: e.target.value })
            }
            placeholder={
              localSettings.provider === "ollama"
                ? "llama3.2"
                : localSettings.provider === "openai"
                ? "gpt-4o-mini"
                : "Leave empty for server default"
            }
          />
          {testResult?.models && testResult.models.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Available: {testResult.models.slice(0, 5).join(", ")}
              {testResult.models.length > 5 &&
                ` +${testResult.models.length - 5} more`}
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
      </DialogContent>

      <DialogFooter>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Settings</Button>
      </DialogFooter>
    </Dialog>
  );
}
