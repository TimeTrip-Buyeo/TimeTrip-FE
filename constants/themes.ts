import type { Locale } from "./translations";
import type { LocationId } from "./locations";

export type CollectionTheme = {
  id: string;
  /** "?" for locked themes — locale-agnostic on purpose, not a translation gap. */
  title: string | Record<Locale, string>;
  /** Present only for themes with confirmed content (Figma "Screen 4: 컬렉션", node 0:901). */
  locationIds?: LocationId[];
  locked: boolean;
};

// Matches Figma "도감" (node 0:1148) literally: 2 unlocked theme cards + 3
// locked ones (Figma itself repeats the same locked placeholder 3 times).
// "왕실의례 사찰창건"'s member locations are confirmed via the theme's own
// grid screen (node 0:901: 법왕@정림사지 + 성왕@부소산성). The second theme's
// grid was never designed in Figma, so its members are our best-guess
// assignment of the two remaining locations rather than sourced content.
export const COLLECTION_THEMES: CollectionTheme[] = [
  {
    id: "royal-rituals",
    title: {
      ko: "왕실의례 사찰창건",
      en: "Royal Rites & Temple Founding",
      zh: "王室礼仪与寺庙创建",
      ja: "王室儀礼と寺院創建",
    },
    locationIds: ["pagoda", "busosanseong"],
    locked: false,
  },
  {
    id: "sabi-capital",
    title: {
      ko: "사비천도와 왕도의 시작",
      en: "Sabi Relocation & the New Capital",
      zh: "泗沘迁都与王都的开始",
      ja: "泗沘遷都と王都の始まり",
    },
    locationIds: ["royalTombs", "gungnamji"],
    locked: false,
  },
  { id: "locked-1", title: "?", locked: true },
  { id: "locked-2", title: "?", locked: true },
  { id: "locked-3", title: "?", locked: true },
];
