import type { ImageSourcePropType } from "react-native";

import type { LocationId } from "./locations";
import type { Locale } from "./translations";

export type PersonPose = {
  id: string;
  label: Record<Locale, string>;
  image: ImageSourcePropType;
  /** width/height of the trimmed cutout — lets the overlay box match it exactly (no letterbox gaps, no "floating" look). */
  aspectRatio: number;
};

// Matches Figma "인물 카메라 (포즈 선택 가능)" (node 0:1000) literally: 법왕 has
// 3 selectable poses there. Other person locations don't have a pose set
// designed yet, so they just get their one existing portrait. Every image is
// trimmed to its alpha bounding box, so `aspectRatio` here is exact.
export const PERSON_POSES: Partial<Record<LocationId, PersonPose[]>> = {
  pagoda: [
    {
      id: "kind",
      label: { ko: "인자한 법왕", en: "Kind Beopwang", zh: "仁慈的法王", ja: "慈悲深い法王" },
      image: require("@/assets/images/collection/pagoda-beopwang.png"),
      aspectRatio: 532 / 1122,
    },
    {
      id: "seated",
      label: { ko: "앉은 법왕", en: "Seated Beopwang", zh: "端坐的法王", ja: "座った法王" },
      image: require("@/assets/images/poses/pagoda/pose-2-seated.png"),
      aspectRatio: 671 / 1048,
    },
    {
      id: "fist",
      label: { ko: "힘찬 법왕", en: "Energetic Beopwang", zh: "有力的法王", ja: "力強い法王" },
      image: require("@/assets/images/poses/pagoda/pose-3-fist.png"),
      aspectRatio: 995 / 1396,
    },
  ],
  busosanseong: [
    {
      id: "default",
      label: { ko: "성왕", en: "King Seongwang", zh: "圣王", ja: "聖王" },
      image: require("@/assets/images/collection/busosanseong-seongwang.png"),
      aspectRatio: 625 / 651,
    },
  ],
};
