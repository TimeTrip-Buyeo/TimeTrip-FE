import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LanguageLegendModal } from "@/components/onboarding/language-legend-modal";
import { GUNGSEO_FONT } from "@/constants/fonts";
import { LOCALES, type Locale } from "@/constants/translations";

const logo = require("@/assets/images/login/logo.png");

type MapHeaderCardProps = {
  appTitle: string;
  appSubtitle: string;
  locale: Locale;
  isLegendVisible: boolean;
  onToggleLegend: () => void;
  onSelectLocale: (locale: Locale) => void;
};

/**
 * Floating header card — matches the Figma "top card": rounded glass panel
 * over the map, with the logo/title on the left and the language switcher
 * (badge + legend popover) on the right. Shared by the onboarding tour and
 * the real map screen since both use the exact same Figma component.
 */
export function MapHeaderCard({
  appTitle,
  appSubtitle,
  locale,
  isLegendVisible,
  onToggleLegend,
  onSelectLocale,
}: MapHeaderCardProps) {
  const currentLocaleMeta = LOCALES.find((item) => item.code === locale)!;

  return (
    <View style={styles.headerCardWrapper}>
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <Image source={logo} style={styles.logoImage} contentFit="cover" />
          <View>
            <Text style={styles.title}>{appTitle}</Text>
            <Text style={styles.subtitle}>{appSubtitle}</Text>
          </View>
        </View>
        <Pressable
          style={[styles.langBadge, isLegendVisible && styles.langBadgeActive]}
          onPress={onToggleLegend}
          hitSlop={8}>
          <FontAwesome5 name="globe" size={10} color={isLegendVisible ? "#fff" : "#b8860b"} solid />
          <Text style={[styles.langBadgeText, isLegendVisible && styles.langBadgeTextActive]}>
            {currentLocaleMeta.badgeLabel}
          </Text>
        </Pressable>
      </View>

      {isLegendVisible && (
        <View style={styles.legendAnchor}>
          <LanguageLegendModal currentLocale={locale} onSelect={onSelectLocale} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerCardWrapper: {
    position: "absolute",
    top: "6.7%",
    left: "7.4%",
    right: "7.4%",
    zIndex: 10,
  },
  legendAnchor: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 8,
    zIndex: 10,
  },
  headerCard: {
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoImage: {
    width: 42,
    height: 45,
    borderRadius: 10,
  },
  title: {
    fontFamily: "serif",
    fontWeight: "bold",
    fontSize: 18,
    color: "#2b1f1b",
  },
  subtitle: {
    fontFamily: GUNGSEO_FONT,
    fontSize: 13,
    color: "#5b4339",
  },
  langBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#b8860b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  langBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#b8860b",
  },
  langBadgeActive: {
    backgroundColor: "#b8860b",
    borderColor: "#b8860b",
  },
  langBadgeTextActive: {
    color: "#fff",
  },
});
