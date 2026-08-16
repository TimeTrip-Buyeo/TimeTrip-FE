import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNav, type BottomNavKey } from "@/components/bottom-nav";
import { KakaoMapView } from "@/components/map/kakao-map-view";
import { MapHeaderCard } from "@/components/map/map-header-card";
import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { SPOT_ID_TO_LOCATION_ID } from "@/constants/locations";
import { mapScreenText, type Locale } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import {
  getLocalizedSpotName,
  getSpotDetail,
  getSpotSpecialMonths,
  getSpots,
  getSpotStory,
  type Spot,
  type SpotDetail,
  type SpotStory,
} from "@/lib/api/spots";

export default function MapScreen() {
  const { locale, setLocale } = useLanguage();
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);
  const [selectedSpotDetail, setSelectedSpotDetail] = useState<SpotDetail | null>(null);
  const [selectedSpotStory, setSelectedSpotStory] = useState<SpotStory | null>(null);
  const [selectedSpotSpecialMonths, setSelectedSpotSpecialMonths] = useState<number[]>([]);
  const [isLoadingSpots, setIsLoadingSpots] = useState(true);
  const [hasMapError, setHasMapError] = useState(false);

  const t = mapScreenText[locale];
  const selectedSpot = selectedSpotDetail ?? spots.find((spot) => spot.id === selectedSpotId) ?? null;
  const isTourSpot = selectedSpot?.spotType === "TOUR";
  const isSelectedSpecial = !isTourSpot && selectedSpotStory?.storyType === "special";
  const nextSpecialMonth = getNextSpecialMonth(
    selectedSpotSpecialMonths,
    selectedSpotStory?.month ?? new Date().getMonth() + 1,
  );
  const selectedSpotMessage = selectedSpot
    ? isTourSpot
      ? t.tourBasicGuideMessage
      : isSelectedSpecial
      ? t.specialGuideMessage
      : nextSpecialMonth
        ? t.revisitWarning(nextSpecialMonth)
        : t.visitInPersonMessage
    : "";

  useEffect(() => {
    let isActive = true;

    getSpots()
      .then((nextSpots) => {
        if (!isActive) return;
        setSpots(nextSpots);
        setHasMapError(false);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error("[map] spots failed", error);
        setHasMapError(true);
      })
      .finally(() => {
        if (isActive) setIsLoadingSpots(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (selectedSpotId === null) {
      setSelectedSpotDetail(null);
      setSelectedSpotStory(null);
      setSelectedSpotSpecialMonths([]);
      return;
    }

    let isActive = true;
    setSelectedSpotStory(null);
    setSelectedSpotSpecialMonths([]);

    const spotSummary = spots.find((spot) => spot.id === selectedSpotId);
    const isTourSummary = spotSummary?.spotType === "TOUR";

    Promise.allSettled([
      getSpotDetail(selectedSpotId),
      isTourSummary ? Promise.resolve(null) : getSpotStory(selectedSpotId, locale),
      isTourSummary ? Promise.resolve([]) : getSpotSpecialMonths(selectedSpotId),
    ])
      .then(([detailResult, storyResult, monthsResult]) => {
        if (!isActive) return;

        if (detailResult.status === "fulfilled") {
          setSelectedSpotDetail(detailResult.value);
        } else {
          const message = detailResult.reason instanceof Error ? detailResult.reason.message : t.mapLoadError;
          console.error(`[map] spot detail failed ${message}`);
        }

        if (storyResult.status === "fulfilled") {
          setSelectedSpotStory(storyResult.value);
        } else {
          const message = storyResult.reason instanceof Error ? storyResult.reason.message : t.mapLoadError;
          console.error(`[map] spot story failed ${message}`);
        }

        if (monthsResult.status === "fulfilled") {
          setSelectedSpotSpecialMonths(monthsResult.value);
        } else {
          const message = monthsResult.reason instanceof Error ? monthsResult.reason.message : t.mapLoadError;
          console.error(`[map] spot special months failed ${message}`);
        }
      })

    return () => {
      isActive = false;
    };
  }, [locale, selectedSpotId, spots, t.mapLoadError]);

  const handleSelectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setIsLegendVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.mapArea}>
        <KakaoMapView
          spots={spots}
          locale={locale}
          selectedSpotId={selectedSpotId}
          onSelectSpot={setSelectedSpotId}
        />

        {(isLoadingSpots || hasMapError) && (
          <View style={[styles.mapStatusPill, hasMapError && styles.mapStatusPillError]}>
            <Text style={styles.mapStatusText}>{hasMapError ? t.mapLoadError : t.mapLoading}</Text>
          </View>
        )}

        <View style={styles.guideButtonGroup}>
          <Pressable
            style={styles.guideCircleButton}
            onPress={() => router.push("/onboarding-guide")}>
            <FontAwesome5 name="question-circle" size={16} color="#800000" solid />
            <Text style={styles.guideCircleLabel}>{t.guideLabel}</Text>
          </Pressable>
        </View>

        {/* Tap anywhere outside the legend popover to dismiss it. Sits below
            the header card in stacking order so the card and popover stay tappable. */}
        {isLegendVisible && (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsLegendVisible(false)} />
        )}

        <MapHeaderCard
          appTitle={t.appTitle}
          appSubtitle={t.appSubtitle}
          locale={locale}
          isLegendVisible={isLegendVisible}
          onToggleLegend={() => setIsLegendVisible((visible) => !visible)}
          onSelectLocale={handleSelectLocale}
        />

        {selectedSpot && (
          <View style={styles.detailCardWrapper}>
            <View style={styles.detailCard}>
              <Pressable
                style={styles.detailCardCloseButton}
                onPress={() => setSelectedSpotId(null)}
                hitSlop={8}>
                <FontAwesome5 name="times" size={12} color="#8b7b73" solid />
              </Pressable>
              <View style={styles.detailCardBody}>
                <View style={styles.detailCardTagRow}>
                  <Text style={styles.detailCardTag}>{t.heritageTag}</Text>
                  <View style={[styles.detailCardPill, isSelectedSpecial && styles.detailCardPillSpecial]}>
                    <FontAwesome5
                      name={isSelectedSpecial ? "star" : "headphones"}
                      size={7}
                      color="#b8860b"
                      solid
                    />
                    <Text style={styles.detailCardPillText}>
                      {isSelectedSpecial ? t.audioSpecialGuideAvailable : t.audioBasicGuideOnly}
                    </Text>
                  </View>
                </View>
                <Text style={styles.detailCardTitle}>{getLocalizedSpotName(selectedSpot, locale)}</Text>
                {selectedSpotDetail?.address && (
                  <Text style={styles.detailCardAddress} numberOfLines={1}>
                    {selectedSpotDetail.address}
                  </Text>
                )}
                <View style={[styles.detailCardOverlay, isSelectedSpecial && styles.detailCardOverlaySpecial]}>
                  <Text style={styles.detailCardOverlayText}>{selectedSpotMessage}</Text>
                </View>
              </View>
              {/* Tapping this is a stand-in trigger for now. Eventually arriving
                  at the location's real GPS coordinates should open the AR
                  camera automatically instead of requiring a manual tap. */}
              <Pressable
                style={({ pressed }) => [styles.detailCardPlayButton, pressed && styles.detailCardPlayButtonPressed]}
                onPress={() =>
                  router.push({
                    pathname: "/ar-camera",
                    params: {
                      spotId: String(selectedSpot.id),
                      spotName: getLocalizedSpotName(selectedSpot, locale),
                      ...(SPOT_ID_TO_LOCATION_ID[selectedSpot.id]
                        ? { locationId: SPOT_ID_TO_LOCATION_ID[selectedSpot.id] }
                        : {}),
                      ...(selectedSpotStory ? { storyId: String(selectedSpotStory.storyId) } : {}),
                    },
                  })
                }>
                <FontAwesome5 name="volume-up" size={18} color="#fff" solid />
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <BottomNav
        active="map"
        labels={t.nav}
        onNavigate={(key: BottomNavKey) => {
          if (key === "collection") router.push("/collection");
          if (key === "album") router.push("/album");
          if (key === "myPage") router.push("/my-page");
        }}
      />
    </SafeAreaView>
  );
}

function getNextSpecialMonth(months: number[], currentMonth: number) {
  const sortedMonths = [...new Set(months)].sort((a, b) => a - b);
  return sortedMonths.find((month) => month > currentMonth) ?? sortedMonths[0] ?? null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdfcf8",
  },
  mapArea: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  guideButtonGroup: {
    position: "absolute",
    bottom: "24.4%",
    right: "4.3%",
    opacity: 0.6,
  },
  mapStatusPill: {
    position: "absolute",
    left: "7.4%",
    right: "7.4%",
    bottom: "17%",
    zIndex: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(184,134,11,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mapStatusPillError: {
    borderColor: "rgba(128,0,0,0.22)",
  },
  mapStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#800000",
    textAlign: "center",
  },
  guideCircleButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(128,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  guideCircleLabel: {
    marginTop: 2,
    fontSize: 7,
    fontWeight: "800",
    color: "#800000",
  },
  detailCardWrapper: {
    position: "absolute",
    left: "5%",
    right: "5%",
    top: "69%",
  },
  detailCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 24,
    padding: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.06,
    shadowRadius: 35,
    elevation: 6,
  },
  detailCardBody: {
    flex: 1,
    gap: 6,
  },
  detailCardTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailCardTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#b8860b",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  detailCardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fffbeb",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  detailCardPillSpecial: {
    backgroundColor: "#fdf1cf",
  },
  detailCardPillText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#b8860b",
  },
  detailCardTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 18,
    color: "#1b1b1b",
  },
  detailCardAddress: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8b7b73",
  },
  detailCardOverlay: {
    backgroundColor: "rgba(184,134,11,0.2)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detailCardOverlaySpecial: {
    backgroundColor: "rgba(184,134,11,0.12)",
  },
  detailCardOverlayText: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 18,
    color: "#800000",
  },
  detailCardPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#b8860b",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  detailCardPlayButtonPressed: {
    backgroundColor: "#96700a",
  },
  detailCardCloseButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f5f1ea",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
});
