import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNav, type BottomNavKey } from "@/components/bottom-nav";
import { LocationBeacon } from "@/components/map/location-beacon";
import { MapHeaderCard } from "@/components/map/map-header-card";
import { MapPin } from "@/components/map/map-pin";
import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import {
  MAP_LOCATIONS,
  NEXT_SPECIAL_GUIDE_MONTH,
  SPECIAL_GUIDE_COLOR,
  SPECIAL_GUIDE_LOCATION_IDS,
  type LocationId,
} from "@/constants/locations";
import { mapScreenText, type Locale } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";

const SPECIAL_GUIDE_LOCATION_SET = new Set<LocationId>(SPECIAL_GUIDE_LOCATION_IDS);

export default function MapScreen() {
  const { locale, setLocale } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<LocationId | null>(null);

  const t = mapScreenText[locale];
  const selectedLocation = MAP_LOCATIONS.find((location) => location.id === selectedLocationId) ?? null;
  const isSelectedSpecial = selectedLocationId !== null && SPECIAL_GUIDE_LOCATION_SET.has(selectedLocationId);
  const selectedLocationMessage = selectedLocation
    ? isSelectedSpecial
      ? t.specialGuideMessage
      : selectedLocation.alwaysBasicGuideOnly
        ? t.visitInPersonMessage
        : t.revisitWarning(NEXT_SPECIAL_GUIDE_MONTH[selectedLocation.id])
    : "";

  const handleSelectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setIsLegendVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.mapArea}>
        {/* Placeholder terrain — swapped for a real map (react-native-maps or
            similar) once GPS-based positioning lands; see MAP_LOCATIONS. */}
        <LinearGradient colors={["#d9e8d2", "#a9c9a0"]} style={StyleSheet.absoluteFill} />

        {MAP_LOCATIONS.map((location) => {
          const isSpecial = SPECIAL_GUIDE_LOCATION_SET.has(location.id);
          return (
            <MapPin
              key={location.id}
              style={{ top: location.top, left: location.left }}
              color={isSpecial ? SPECIAL_GUIDE_COLOR : location.defaultColor}
              icon={location.icon}
              label={t.pins[location.id]}
              containerWidth={windowWidth}
              highlighted={selectedLocationId === location.id}
              onPress={() => setSelectedLocationId(location.id)}
            />
          );
        })}

        <LocationBeacon style={{ top: "44%", left: "50%" }} />

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

        {selectedLocation && (
          <View style={styles.detailCardWrapper}>
            <View style={styles.detailCard}>
              <Pressable
                style={styles.detailCardCloseButton}
                onPress={() => setSelectedLocationId(null)}
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
                <Text style={styles.detailCardTitle}>{t.pins[selectedLocation.id]}</Text>
                <View style={[styles.detailCardOverlay, isSelectedSpecial && styles.detailCardOverlaySpecial]}>
                  <Text style={styles.detailCardOverlayText}>{selectedLocationMessage}</Text>
                </View>
              </View>
              {/* Tapping this is a stand-in trigger for now. Eventually arriving
                  at the location's real GPS coordinates should open the AR
                  camera automatically instead of requiring a manual tap. */}
              <Pressable
                style={({ pressed }) => [styles.detailCardPlayButton, pressed && styles.detailCardPlayButtonPressed]}
                onPress={() => router.push({ pathname: "/ar-camera", params: { locationId: selectedLocation.id } })}>
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
