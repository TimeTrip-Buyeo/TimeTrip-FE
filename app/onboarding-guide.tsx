import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type DimensionValue,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { MapHeaderCard } from "@/components/map/map-header-card";
import { MapPin } from "@/components/map/map-pin";
import { LocationBeacon } from "@/components/map/location-beacon";
import { OnboardingTooltip, type TooltipPointer } from "@/components/onboarding/onboarding-tooltip";
import { onboardingGuideText, type Locale } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { useSession } from "@/hooks/use-session";

type StepTextKey = keyof (typeof onboardingGuideText)["ko"]["steps"];

type TooltipSpec = {
  textKey: StepTextKey;
  pointer: TooltipPointer;
  pointerOffset: number;
  style: ViewStyle;
};

type Step = {
  key: string;
  tooltips: TooltipSpec[];
  /** ids of MAP_PINS that should be lifted above the dark overlay for this step. */
  highlightIds?: string[];
  /** defaults to the "next" label; the last step uses the "start" label. */
  nextLabelKey?: "next" | "start";
};

// All positions (header, pins, tooltip boxes, buttons) are measured off the
// same Figma frame (404x924, header+map area, excluding the bottom nav which
// is a separate sibling) so everything lines up in one shared coordinate space.

// Shared by "special-guide" and "special-guide-2" (same pagoda callout repeated).
const SPECIAL_GUIDE_TOOLTIP: TooltipSpec = {
  textKey: "specialGuide",
  pointer: "down",
  pointerOffset: 0.24,
  style: { top: "24%", left: "2%", width: 250 },
};

const STEPS: Step[] = [
  {
    key: "language",
    tooltips: [
      {
        textKey: "language",
        pointer: "up",
        pointerOffset: 0.89,
        style: { top: "20%", left: "20%", width: 250 },
      },
    ],
  },
  {
    key: "map",
    highlightIds: ["busosanseong"],
    tooltips: [
      {
        textKey: "map",
        pointer: "right",
        pointerOffset: 0.41,
        style: { top: "48.6%", left: "4.5%", width: 220 },
      },
    ],
  },
  {
    key: "basic-guide",
    highlightIds: ["jeongnimsaji"],
    tooltips: [
      {
        textKey: "basicGuide",
        pointer: "up",
        pointerOffset: 0.74,
        style: { top: "47%", left: "30%", width: 230 },
      },
    ],
  },
  {
    key: "special-guide",
    highlightIds: ["pagoda"],
    tooltips: [SPECIAL_GUIDE_TOOLTIP],
  },
  {
    key: "special-guide-2",
    nextLabelKey: "start",
    highlightIds: ["pagoda", "gungnamji"],
    tooltips: [
      SPECIAL_GUIDE_TOOLTIP,
      {
        textKey: "arCamera",
        pointer: "up",
        pointerOffset: 0.5,
        style: { top: "73%", left: "1%", width: 260 },
      },
    ],
  },
];

type PinLabelKey = keyof (typeof onboardingGuideText)["ko"]["pins"];

type MapPinData = {
  id: string;
  top: DimensionValue;
  left: DimensionValue;
  color: string;
  icon: React.ComponentProps<typeof FontAwesome5>["name"];
  labelKey: PinLabelKey;
};

// Positions are % of the map area, measured off the Figma pin coordinates.
const MAP_PINS: MapPinData[] = [
  { id: "museum", top: "29%", left: "19%", color: "#089ea9", icon: "water", labelKey: "museum" },
  { id: "jeongnimsaji", top: "33%", left: "68%", color: "#800000", icon: "landmark", labelKey: "jeongnimsaji" },
  { id: "gungnamji", top: "61%", left: "32%", color: "#800000", icon: "landmark", labelKey: "gungnamji" },
  { id: "busosanseong", top: "52%", left: "72%", color: "#800000", icon: "chess-rook", labelKey: "busosanseong" },
  { id: "pagoda", top: "48%", left: "17%", color: "#800000", icon: "user", labelKey: "pagoda" },
];

export default function OnboardingGuideScreen() {
  const { login } = useSession();
  const { locale, setLocale } = useLanguage();
  // Only present when this tour was reached from the email signup screen —
  // Kakao/Google pushes here without it, so login() falls back to its
  // existing no-arg (currentEmail stays null) for those mock flows.
  const params = useLocalSearchParams<{ email?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const [stepIndex, setStepIndex] = useState(0);
  const [isLegendVisible, setIsLegendVisible] = useState(false);

  const t = onboardingGuideText[locale];

  const step = STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;
  const highlightSet = new Set(step.highlightIds ?? []);
  const dimmedPins = MAP_PINS.filter((pin) => !highlightSet.has(pin.id));
  const highlightedPins = MAP_PINS.filter((pin) => highlightSet.has(pin.id));

  const handleSelectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setIsLegendVisible(false);
  };

  const handleNext = () => {
    if (isLastStep) {
      login(params.email);
      // Always land on the real map screen from here, whether this is the
      // first-run onboarding flow or a revisit triggered by the map's guide button.
      router.replace("/(tabs)");
      return;
    }
    setStepIndex((index) => index + 1);
  };

  const handlePrev = () => {
    setStepIndex((index) => Math.max(0, index - 1));
  };

  return (
    // "bottom" excluded on purpose — BottomNav already pads itself for the
    // bottom safe area (see components/bottom-nav.tsx), same as the real map
    // screen (app/(tabs)/index.tsx). Including it here double-applied the
    // inset and pushed the whole nav bar up higher than every other screen.
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.mapArea}>
        <LinearGradient
          colors={["#d9e8d2", "#a9c9a0"]}
          style={StyleSheet.absoluteFill}
        />

        {dimmedPins.map((pin) => (
          <MapPin
            key={pin.id}
            style={{ top: pin.top, left: pin.left }}
            color={pin.color}
            icon={pin.icon}
            label={t.pins[pin.labelKey]}
            containerWidth={windowWidth}
          />
        ))}

        <LocationBeacon style={{ top: "44%", left: "50%" }} />

        <View style={styles.guideButtonGroup}>
          <View style={[styles.guideCircleButton, styles.guideCircleButtonOutline]}>
            <FontAwesome5 name="question-circle" size={15} color="#800000" solid />
            <Text style={styles.guideCircleLabel}>{t.guideLabel}</Text>
          </View>
        </View>

        <View style={styles.overlay} pointerEvents="none" />

        {/* Tap anywhere outside the legend popover to dismiss it. Sits below
            the header card in stacking order so the card and popover stay tappable. */}
        {isLegendVisible && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsLegendVisible(false)}
          />
        )}

        <MapHeaderCard
          appTitle={t.appTitle}
          appSubtitle={t.appSubtitle}
          locale={locale}
          isLegendVisible={isLegendVisible}
          onToggleLegend={() => setIsLegendVisible((visible) => !visible)}
          onSelectLocale={handleSelectLocale}
        />

        {highlightedPins.map((pin) => (
          <MapPin
            key={`${pin.id}-highlight`}
            style={{ top: pin.top, left: pin.left }}
            color={pin.color}
            icon={pin.icon}
            label={t.pins[pin.labelKey]}
            containerWidth={windowWidth}
            highlighted
          />
        ))}

        {/* Hidden while the legend popover is open so the two never overlap,
            regardless of step or how long the active language's text is. */}
        {!isLegendVisible &&
          step.tooltips.map((tooltip) => (
            <OnboardingTooltip
              key={tooltip.textKey + tooltip.pointer}
              title={t.steps[tooltip.textKey].title}
              description={t.steps[tooltip.textKey].description}
              pointer={tooltip.pointer}
              pointerOffset={tooltip.pointerOffset}
              style={tooltip.style}
            />
          ))}

        {!isFirstStep && (
          <Pressable style={styles.prevButton} onPress={handlePrev}>
            <FontAwesome5 name="chevron-left" size={10} color="#fff" solid />
            <Text style={styles.navButtonText}>{t.prevLabel}</Text>
          </Pressable>
        )}

        <Pressable style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.navButtonText}>{step.nextLabelKey === "start" ? t.startLabel : t.nextLabel}</Text>
          <FontAwesome5 name="chevron-right" size={10} color="#fff" solid />
        </Pressable>
      </View>

      {/* Reuses the map screen's own BottomNav (not a lookalike) so the icon
          set can never drift out of sync again — taps are inert here since
          onboarding has nowhere else to navigate to yet. */}
      <BottomNav active="map" labels={t.nav} onNavigate={() => {}} />
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  guideButtonGroup: {
    position: "absolute",
    bottom: "14%",
    right: "5.2%",
    gap: 10,
    opacity: 0.6,
  },
  guideCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  guideCircleButtonOutline: {
    borderWidth: 1,
    borderColor: "rgba(128,0,0,0.2)",
  },
  guideCircleLabel: {
    marginTop: 2,
    fontSize: 7,
    fontWeight: "800",
    color: "#800000",
  },
  nextButton: {
    position: "absolute",
    top: "94%",
    right: "6.4%",
    marginTop: -18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 21,
    paddingVertical: 11,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  prevButton: {
    position: "absolute",
    top: "94%",
    left: "6.4%",
    marginTop: -18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 21,
    paddingVertical: 11,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.7,
  },
});
