import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, type DimensionValue, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/**
 * Resolves a `top`/`left` DimensionValue to a pixel offset within `containerSize`.
 * Handles both the design-time "%" strings used today and the raw pixel
 * offsets a future map-API integration (lat/lng → screen projection) would
 * supply, so the edge-detection below keeps working either way.
 */
export function resolveOffsetPx(value: DimensionValue | undefined, containerSize: number): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.endsWith("%")) {
    const percent = parseFloat(value);
    if (!Number.isNaN(percent)) return (percent / 100) * containerSize;
  }
  return null;
}

const PIN_LABEL_EDGE_MARGIN = 16;
const PIN_LABEL_WRAP_WIDTH = 88;
// Any label naturally wider than this reads as cramped/too long regardless of
// where its pin sits, so it wraps on its own merits — not just when it
// happens to run past the screen edge. Keeps future, unknown location names
// (e.g. once a real map API supplies them) from ever rendering as one long line.
const PIN_LABEL_MAX_SINGLE_LINE_WIDTH = 100;
// Rough average glyph width at the label's font size/weight, used to predict
// a label's width synchronously (see estimateLabelWidth below).
const PIN_LABEL_AVG_CHAR_WIDTH = 6;

/**
 * Predicts a label's rendered width from its character count instead of an
 * async onLayout measurement. A measured approach only knows a label is too
 * long *after* it first paints (and again after every remount — e.g. every
 * time a pin swaps between the dimmed and highlighted layers), so wrapping
 * only reliably kicked in once a pin had already been highlighted. This is
 * synchronous and mount-independent, so the same pin wraps identically every
 * time, on the very first render.
 */
function estimateLabelWidth(text: string): number {
  return text.length * PIN_LABEL_AVG_CHAR_WIDTH;
}

export type MapPinProps = {
  style: ViewStyle;
  color: string;
  icon: React.ComponentProps<typeof FontAwesome5>["name"];
  label: string;
  /** Width of the map area, used to detect when a label would run past the screen edge. */
  containerWidth: number;
  /** Bigger circle + glow ring, used for the currently selected/active pin. */
  highlighted?: boolean;
  onPress?: () => void;
};

export function MapPin({ style, color, icon, label, containerWidth, highlighted, onPress }: MapPinProps) {
  const pinX = resolveOffsetPx(style.left, containerWidth);
  const estimatedLabelWidth = estimateLabelWidth(label);
  const isTooLongForOneLine = estimatedLabelWidth > PIN_LABEL_MAX_SINGLE_LINE_WIDTH;
  const overflowsScreenEdge =
    pinX !== null &&
    (pinX - estimatedLabelWidth / 2 < PIN_LABEL_EDGE_MARGIN ||
      pinX + estimatedLabelWidth / 2 > containerWidth - PIN_LABEL_EDGE_MARGIN);
  const shouldWrapLabel = isTooLongForOneLine || overflowsScreenEdge;

  // Only the circle+icon pulses while selected — the glow and label stay put
  // so the text underneath doesn't jitter.
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (highlighted) {
      pulse.value = withRepeat(withSequence(withTiming(1.18, { duration: 550 }), withTiming(1, { duration: 550 })), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [highlighted, pulse]);

  const animatedPinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Pressable style={[styles.pinWrapper, style]} onPress={onPress} hitSlop={onPress ? 8 : undefined} disabled={!onPress}>
      {highlighted && <View style={styles.pinGlow} />}
      <Animated.View style={[styles.pin, { backgroundColor: color }, animatedPinStyle]}>
        <FontAwesome5 name={icon} size={11} color="#fff" solid />
      </Animated.View>
      <View style={[styles.pinLabel, highlighted && styles.pinLabelHighlighted, shouldWrapLabel && styles.pinLabelWrapped]}>
        <Text style={styles.pinLabelText}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pinWrapper: {
    position: "absolute",
    alignItems: "center",
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  pinGlow: {
    position: "absolute",
    top: -12,
    left: "50%",
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  pinLabel: {
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pinLabelHighlighted: {
    backgroundColor: "#fff",
  },
  // Applied once a label is measured to run past the screen edge — caps the
  // width so long translations (e.g. English) wrap onto a second line
  // instead of overflowing, without affecting labels that already fit.
  pinLabelWrapped: {
    maxWidth: PIN_LABEL_WRAP_WIDTH,
  },
  pinLabelText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#1b1b1b",
    textAlign: "center",
  },
});
