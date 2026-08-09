import type { ImageSourcePropType } from "react-native";

import type { LocationId } from "./locations";
import type { Locale } from "./translations";

export type AlbumEntry = {
  /** The figure/story this location's photos center on — not always the same as the 도감 collectible (e.g. 궁남지's album follows 무왕, its collectible is 연화문 와당). */
  name: Record<Locale, string>;
  locationCaption: Record<Locale, string>;
  photoCount: number;
  thumbnail?: ImageSourcePropType;
};

// Matches the Figma "앨범" screen (node 0:1079) content literally — its card
// layer names ("1: 부소산성", "2: 정림사지") don't match what's actually inside
// them, so this keys off the real name/location text shown on each card
// instead of the (seemingly mislabeled) layer name.
//
// name/locationCaption are per-locale (not a bare string) because this text
// used to stay Korean no matter which language the rest of the app switched
// to — the album card title, its subtitle, and the photo viewer's subtitle
// all read straight from these fields.
export const ALBUM_ENTRIES: Partial<Record<LocationId, AlbumEntry>> = {
  pagoda: {
    name: { ko: "법왕", en: "King Beopwang", zh: "法王", ja: "法王" },
    locationCaption: {
      ko: "정림사지 5층석탑",
      en: "Jeongnimsaji 5-Story Pagoda",
      zh: "定林寺址五层石塔",
      ja: "定林寺址五重石塔",
    },
    photoCount: 6,
  },
  gungnamji: {
    name: { ko: "무왕", en: "King Muwang", zh: "武王", ja: "武王" },
    locationCaption: {
      ko: "부여군 부여읍 동남리",
      en: "Dongnam-ri, Buyeo-eup, Buyeo-gun",
      zh: "扶余郡扶余邑东南里",
      ja: "扶余郡扶余邑東南里",
    },
    photoCount: 3,
    thumbnail: require("@/assets/images/album/gungnamji-album.png"),
  },
};
