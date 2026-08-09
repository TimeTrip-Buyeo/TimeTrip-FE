import type FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import type { DimensionValue } from "react-native";

export type LocationId = "museum" | "royalTombs" | "busosanseong" | "pagoda" | "gungnamji";

export type MapLocationData = {
  id: LocationId;
  // Percentages of the map area today; a future map-API integration can swap
  // these for lat/lng-projected pixel offsets without touching MapPin, which
  // already resolves either DimensionValue kind (see resolveOffsetPx).
  top: DimensionValue;
  left: DimensionValue;
  /** Pin color when this location does NOT offer the special guide right now. */
  defaultColor: string;
  icon: React.ComponentProps<typeof FontAwesome5>["name"];
  /**
   * True for indoor/museum-style locations that will never rotate into the
   * special (AR/outdoor) guide — their detail card shows a plain "visit in
   * person" message instead of the "come back next month" reminder.
   */
  alwaysBasicGuideOnly?: boolean;
};

// Positions are % of the map area, measured off the Figma "지도: 스페셜가이드" frame.
export const MAP_LOCATIONS: MapLocationData[] = [
  { id: "museum", top: "26%", left: "18%", defaultColor: "#089ea9", icon: "university", alwaysBasicGuideOnly: true },
  { id: "royalTombs", top: "30%", left: "68%", defaultColor: "#800000", icon: "gopuram" },
  { id: "busosanseong", top: "52%", left: "75%", defaultColor: "#800000", icon: "chess-rook" },
  { id: "pagoda", top: "47%", left: "19%", defaultColor: "#800000", icon: "user" },
  { id: "gungnamji", top: "56%", left: "38%", defaultColor: "#800000", icon: "gopuram" },
];

// Gold pin color for whichever locations currently offer the special guide —
// exact Figma color.
export const SPECIAL_GUIDE_COLOR = "#b8860b";

/**
 * Mocked "this month's special guide locations" — matches the Figma mock
 * exactly (부소산성, 정림사지5층석탑 shown gold). In production this should
 * come from an API keyed by the current month: each month ~4-5 locations
 * offer the special guide (AR/photo/collectible) and the rest fall back to
 * the basic audio guide.
 */
export const SPECIAL_GUIDE_LOCATION_IDS: LocationId[] = ["busosanseong", "pagoda"];

/**
 * Mocked "next month this location offers the special guide" used for the
 * basic-guide detail card's reminder text (see Figma: "3월에 다시 방문하시면...").
 * Should come from the same schedule API as SPECIAL_GUIDE_LOCATION_IDS.
 */
export const NEXT_SPECIAL_GUIDE_MONTH: Record<LocationId, number> = {
  museum: 3,
  royalTombs: 3,
  busosanseong: 3,
  pagoda: 3,
  gungnamji: 3,
};
