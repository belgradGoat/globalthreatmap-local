"use client";

import { useState } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Map,
  Newspaper,
  Search,
  Globe,
  Satellite,
  Eye,
} from "lucide-react";

const WELCOME_DISMISSED_KEY = "eagle_eye_welcome_dismissed";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: <Satellite className="h-6 w-6" />,
    title: "Interactive Globe",
    description:
      "Explore the world with satellite imagery. Switch between map styles and click any location to discover news and information.",
    color: "text-teal-500",
  },
  {
    icon: <Newspaper className="h-6 w-6" />,
    title: "News Feed",
    description:
      "Browse live news from around the world. Filter by category, region, or search for specific topics.",
    color: "text-blue-500",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Country Explorer",
    description:
      "Click any country on the map to view latest news, country profile, and historical context with AI-powered analysis.",
    color: "text-amber-500",
  },
  {
    icon: <Search className="h-6 w-6" />,
    title: "Deep Research",
    description:
      "Research any topic in depth. Generate comprehensive reports from hundreds of global news sources.",
    color: "text-purple-500",
  },
  {
    icon: <Map className="h-6 w-6" />,
    title: "Multiple Map Styles",
    description:
      "Choose your view: Satellite for real imagery, Light for daytime, Dark for night mode, or Streets for traditional maps.",
    color: "text-green-500",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    title: "Your Lens on the World",
    description:
      "Eagle Eye aggregates news from 600+ sources across 94 countries, giving you a comprehensive global perspective.",
    color: "text-cyan-500",
  },
];

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WelcomeModal({ open, onOpenChange }: WelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(WELCOME_DISMISSED_KEY, "true");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-3xl">
      <DialogHeader onClose={handleClose}>
        <DialogTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" style={{ color: "var(--color-eagle-secondary)" }} />
          Welcome to Eagle Eye
        </DialogTitle>
      </DialogHeader>

      <DialogContent className="max-h-[60vh]">
        <p className="mb-6 text-muted-foreground">
          Your lens on the world. Explore global news, research countries,
          and discover what&apos;s happening around the planet.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="mb-2 flex items-center gap-3">
                <div className={feature.color}>{feature.icon}</div>
                <h3 className="font-medium text-foreground">{feature.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>

      <DialogFooter className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-background accent-primary"
          />
          Don&apos;t show this again
        </label>
        <Button onClick={handleClose}>Get Started</Button>
      </DialogFooter>
    </Dialog>
  );
}
