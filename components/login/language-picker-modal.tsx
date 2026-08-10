import { Pressable, StyleSheet, Text, View } from "react-native";

import { LOCALES, type Locale } from "@/constants/translations";

type LanguagePickerModalProps = {
  currentLocale: Locale;
  onSelect: (locale: Locale) => void;
};

/** Language switcher popover styled to match the login screen's soft, rounded-pill look. */
export function LanguagePickerModal({ currentLocale, onSelect }: LanguagePickerModalProps) {
  const options = LOCALES.filter((item) => item.code !== currentLocale);

  return (
    <View style={styles.card}>
      {options.map((option, index) => (
        <Pressable
          key={option.code}
          style={({ pressed }) => [styles.row, index > 0 && styles.rowDivider, pressed && styles.rowPressed]}
          onPress={() => onSelect(option.code)}>
          <Text style={styles.emoji}>🌐</Text>
          <Text style={styles.label}>{option.nativeLabel}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 140,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingVertical: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  rowPressed: {
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2b1f1b",
  },
});
