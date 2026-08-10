import { StyleSheet, View, type ViewStyle } from "react-native";

type LocationBeaconProps = {
  style?: ViewStyle;
};

/** "My location" beacon — a plain gray dot inside a white ring, kept simple. */
export function LocationBeacon({ style }: LocationBeaconProps) {
  return <View style={[styles.compassPin, style]} />;
}

const styles = StyleSheet.create({
  compassPin: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ccc",
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});
