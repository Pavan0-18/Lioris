"use client";
import { useQuery } from "@tanstack/react-query";

interface FeaturesResponse {
  data: { features: string[] };
}

export function useFeature(featureKey: string) {
  const { data, isLoading } = useQuery<FeaturesResponse>({
    queryKey: ["tenant-features"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/features");
      if (!res.ok) throw new Error("Failed to fetch features");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasFeature = data?.data?.features ? data.data.features.includes(featureKey) : false;

  return { hasFeature, isLoading };
}
