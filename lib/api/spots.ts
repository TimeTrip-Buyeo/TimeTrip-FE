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

export async function getSpotSpecialMonths(spotId: number): Promise<number[]> {
  return SPOT_SPECIAL_MONTHS[spotId] ?? [];
}

const SPOT_SPECIAL_MONTHS: Partial<Record<number, number[]>> = {
  1: [1, 2, 3, 4, 7, 8, 9],
  2: [8, 9, 10, 11, 12],
  3: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12],
  4: [5, 6, 10, 11, 12],
  5: [3, 4, 7],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 7],
  8: [1, 2, 10, 11, 12],
  12: [5, 6, 7, 8, 9],
  13: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

export function getLocalizedSpotName(spot: Spot | SpotDetail, locale: Locale) {
  if (locale === "en") return spot.nameEn || spot.nameKo;
  if (locale === "ja") return spot.nameJp || spot.nameKo;
  if (locale === "zh") return spot.nameZh || spot.nameKo;
  return spot.nameKo;
}
