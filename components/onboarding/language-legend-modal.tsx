import { Pressable, StyleSheet, Text, View } from "react-native";

import { LOCALES, type Locale } from "@/constants/translations";

type LanguageLegendModalProps = {
  currentLocale: Locale;
  onSelect: (locale: Locale) => void;
};

/** Popover listing every language other than the one currently active. */
export function LanguageLegendModal({ currentLocale, onSelect }: LanguageLegendModalProps) {
  const options = LOCALES.filter((item) => item.code !== currentLocale);

  return (
    <View style={styles.wrapper}>
      <View style={styles.caret} />
      <View style={styles.card}>
        {options.map((option, index) => (
          <Pressable
            key={option.code}
            style={({ pressed }) => [styles.row, index > 0 && styles.rowDivider, pressed && styles.rowPressed]}
            onPress={() => onSelect(option.code)}>
            <View style={styles.dot} />
            <Text style={styles.label}>{option.nativeLabel}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-end",
  },
  caret: {
    width: 12,
    height: 12,
    marginBottom: -6,
    marginRight: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#f0ece4",
    transform: [{ rotate: "45deg" }],
  },
  card: {
    minWidth: 128,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0ece4",
    paddingVertical: 4,
    overflow: "hidden",
    shadowColor: "#2b1f1b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: "#f5f1ea",
  },
  rowPressed: {
    backgroundColor: "#faf6ef",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#b8860b",
  },
  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1b1b1b",
  },
});
