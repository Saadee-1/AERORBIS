"use client";

import { RecommendationCard, type RecommendationCardProps } from "./RecommendationCard";
import type { EngineeringSummary } from "@/core/engineeringText";

export interface RecommendationItem {
  airfoilId: string;
  airfoilName: string;
  mode: "engineering" | "smart-ai";
  score: number;
  reasons: string[];
  metrics?: RecommendationCardProps["metrics"];
  isFallback?: boolean;
  engineeringSummary?: EngineeringSummary; // Optional structured summary for engineering mode
  missionEmoji?: string; // Mission emoji for chip
  missionShortLabel?: string; // Mission short label for chip
}

export interface RecommendationListProps {
  recommendations: RecommendationItem[];
  selectedId?: string;
  onSelectAirfoil?: (airfoilId: string) => void;
}

export function RecommendationList({
  recommendations,
  selectedId,
  onSelectAirfoil,
}: RecommendationListProps) {
  return (
    <div className="flex flex-col gap-3">
      {recommendations.map((rec, index) => (
        <RecommendationCard
          key={rec.airfoilId}
          airfoilId={rec.airfoilId}
          airfoilName={rec.airfoilName}
          mode={rec.mode}
          score={rec.score}
          reasons={rec.reasons}
          metrics={rec.metrics}
          isFallback={rec.isFallback}
          selected={rec.airfoilId === selectedId}
          onSelect={() => onSelectAirfoil?.(rec.airfoilId)}
          engineeringSummary={rec.engineeringSummary}
          rank={index + 1}
          missionEmoji={rec.missionEmoji}
          missionShortLabel={rec.missionShortLabel}
        />
      ))}
    </div>
  );
}

