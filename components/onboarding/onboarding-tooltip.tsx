import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

export type TooltipPointer = "up" | "down" | "left" | "right";

type OnboardingTooltipProps = {
  title: string;
  description: string;
  pointer: TooltipPointer;
  /** Position of the arrow along the tooltip edge, 0 (start) to 1 (end). Defaults to centered (0.5). */
  pointerOffset?: number;
  style?: ViewStyle;
};

const ARROW_SIZE = 8;

function getArrowStyle(pointer: TooltipPointer, pointerOffset: number): ViewStyle {
  const offsetPercent = `${pointerOffset * 100}%` as const;

  switch (pointer) {
    case "up":
      return {
        top: -ARROW_SIZE,
        left: offsetPercent,
        marginLeft: -ARROW_SIZE,
        borderLeftWidth: ARROW_SIZE,
        borderRightWidth: ARROW_SIZE,
        borderBottomWidth: ARROW_SIZE,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: "#fff",
      };
    case "down":
      return {
        bottom: -ARROW_SIZE,
        left: offsetPercent,
        marginLeft: -ARROW_SIZE,
        borderLeftWidth: ARROW_SIZE,
        borderRightWidth: ARROW_SIZE,
        borderTopWidth: ARROW_SIZE,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: "#fff",
      };
    case "left":
      return {
        left: -ARROW_SIZE,
        top: offsetPercent,
        marginTop: -ARROW_SIZE,
        borderTopWidth: ARROW_SIZE,
        borderBottomWidth: ARROW_SIZE,
        borderRightWidth: ARROW_SIZE,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderRightColor: "#fff",
      };
    case "right":
      return {
        right: -ARROW_SIZE,
        top: offsetPercent,
        marginTop: -ARROW_SIZE,
        borderTopWidth: ARROW_SIZE,
        borderBottomWidth: ARROW_SIZE,
        borderLeftWidth: ARROW_SIZE,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderLeftColor: "#fff",
      };
  }
}

export function OnboardingTooltip({
  title,
  description,
  pointer,
  pointerOffset = 0.5,
  style,
}: OnboardingTooltipProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.arrow, getArrowStyle(pointer, pointerOffset)]} />
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <FontAwesome5 name="map-marker-alt" size={11} color="#800000" solid />
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
  },
  arrow: {
    position: "absolute",
    width: 0,
    height: 0,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  title: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#800000",
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 11.5,
    lineHeight: 18,
    fontWeight: "600",
    color: "#1b1b1b",
  },
});
