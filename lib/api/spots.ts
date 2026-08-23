import { ApiError, publicGet } from "@/lib/api/client";
import type { Locale } from "@/constants/translations";

export type SpotType = "MAIN" | "TOUR";

export type Spot = {
  id: number;
  nameKo: string;
  nameEn: string | null;
  nameJp: string | null;
  nameZh: string | null;
  latitude: number;
  longitude: number;
  thumbnailUrl: string | null;
  spotType: SpotType;
};

export type SpotDetail = Spot & {
  address: string;
  currentStoryType?: SpotStoryType | Uppercase<SpotStoryType> | null;
};

export type SpotStoryType = "special" | "normal";

export type SpotStory = {
  storyId: number;
  spotId: number;
  month: number;
  title: string;
  storyType: SpotStoryType;
  locationLabel: string;
  audioGuide: {
    audioGuideId: number;
    title: string;
    language: string;
    filePath: string;
    durationSec: number;
  } | null;
};

export function getSpots(): Promise<Spot[]> {
  return publicGet<Spot[]>("/api/spots");
}

export function getSpotDetail(spotId: number): Promise<SpotDetail> {
  return publicGet<SpotDetail>(`/api/spots/${spotId}`);
}

export async function getSpotStory(spotId: number, locale: Locale, month?: number): Promise<SpotStory | null> {
  try {
    const params = new URLSearchParams({ language: locale });
    if (month !== undefined) params.set("month", String(month));

    return await publicGet<SpotStory>(`/api/spots/${spotId}/story?${params.toString()}`);
  } catch (error) {
    if (error instanceof ApiError && error.code === "STORY_404") {
      return null;
    }
    throw error;
  }
}

export function isCurrentSpecialSpot(spot: SpotDetail | null | undefined) {
  return spot?.currentStoryType?.toLowerCase() === "special";
}

export function getLocalizedSpotName(spot: Spot | SpotDetail, locale: Locale) {
  if (locale === "en") return spot.nameEn || spot.nameKo;
  if (locale === "ja") return spot.nameJp || spot.nameKo;
  if (locale === "zh") return spot.nameZh || spot.nameKo;
  return spot.nameKo;
}
