import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LanguageLegendModal } from "@/components/onboarding/language-legend-modal";
import { LOCALES, type Locale } from "@/constants/translations";

type LangPillProps = {
  locale: Locale;
  isLegendVisible: boolean;
  onToggleLegend: () => void;
  onSelectLocale: (locale: Locale) => void;
};

// Shared top-right language badge + popover, used by every top-level list
// screen (album.tsx, collection.tsx) that mirrors this header layout — was
// previously duplicated per-screen (and, on collection.tsx, left as a static
// unpressable "KR" that ignored the active locale entirely).
export function LangPill({ locale, isLegendVisible, onToggleLegend, onSelectLocale }: LangPillProps) {
  const currentLocaleMeta = LOCALES.find((item) => item.code === locale)!;
  return (
    <View style={styles.wrapper}>
      <Pressable style={[styles.pill, isLegendVisible && styles.pillActive]} onPress={onToggleLegend} hitSlop={8}>
        <FontAwesome5 name="globe-asia" size={10} color={isLegendVisible ? "#fff" : "#b8860b"} solid />
        <Text style={[styles.text, isLegendVisible && styles.textActive]}>{currentLocaleMeta.badgeLabel}</Text>
      </Pressable>
      {isLegendVisible && (
        <View style={styles.legendAnchor}>
          <LanguageLegendModal currentLocale={locale} onSelect={onSelectLocale} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-end",
  },
  legendAnchor: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 8,
    zIndex: 10,
  },
  pill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#b8860b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  pillActive: {
    backgroundColor: "#b8860b",
    borderColor: "#b8860b",
  },
  textActive: {
    color: "#fff",
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    color: "#b8860b",
  },
});
