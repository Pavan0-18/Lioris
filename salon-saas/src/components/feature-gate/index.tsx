"use client";
import React from "react";
import { useFeature } from "@/hooks/use-feature";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeCard } from "./upgrade-card";

interface FeatureGateProps {
  feature: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGate({ feature, fallback, children }: FeatureGateProps) {
  const { hasFeature, isLoading } = useFeature(feature);

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!hasFeature) {
    return fallback || <UpgradeCard featureName={feature} />;
  }

  return <>{children}</>;
}
