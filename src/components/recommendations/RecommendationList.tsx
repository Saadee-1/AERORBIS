"use client";

import { RecommendationCard, type RecommendationCardProps } from "./RecommendationCard";

export interface RecommendationItem {
  airfoilId: string;
  airfoilName: string;
  mode: "engineering" | "smart-ai";
  score: number;
  reasons: string[];
  metrics?: RecommendationCardProps["metrics"];
  isFallback?: boolean;
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
      {recommendations.map((rec) => (
        <RecommendationCard
          key={rec.airfoilId}
          airfoilName={rec.airfoilName}
          mode={rec.mode}
          score={rec.score}
          reasons={rec.reasons}
          metrics={rec.metrics}
          isFallback={rec.isFallback}
          selected={rec.airfoilId === selectedId}
          onSelect={() => onSelectAirfoil?.(rec.airfoilId)}
        />
      ))}
    </div>
  );
}

