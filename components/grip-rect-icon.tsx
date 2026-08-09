import { StyleSheet, View } from "react-native";

// Figma's own "부여세컷" FAB icon (nodes 0:1109 / 0:436 / 0:1653): 3 solid
// gold rectangles stacked almost edge-to-edge — not a FontAwesome glyph.
export function GripRectIcon() {
  return (
    <View style={styles.stack}>
      <View style={styles.bar} />
      <View style={styles.bar} />
      <View style={styles.bar} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: 10,
    gap: 1,
  },
  bar: {
    width: 10,
    height: 6,
    borderRadius: 1,
    backgroundColor: "#b8860b",
  },
});
