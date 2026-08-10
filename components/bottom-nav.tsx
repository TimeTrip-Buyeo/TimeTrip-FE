import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type BottomNavKey = "map" | "collection" | "album" | "myPage";

type BottomNavLabels = Record<BottomNavKey, string>;

type BottomNavProps = {
  active: BottomNavKey;
  labels: BottomNavLabels;
  onNavigate: (key: BottomNavKey) => void;
};

const ITEMS: { key: BottomNavKey; icon: React.ComponentProps<typeof FontAwesome5>["name"] }[] = [
  { key: "map", icon: "map" },
  { key: "collection", icon: "layer-group" },
  { key: "album", icon: "image" },
  { key: "myPage", icon: "user" },
];

// The single source of truth for bottom-nav placement — every screen that
// renders this component gets an identical position/size because they all
// route through here instead of adding their own safe-area padding.
export function BottomNav({ active, labels, onNavigate }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 14 }]}>
      {ITEMS.map((item) => {
        const isActive = item.key === active;
        const color = isActive ? "#800000" : "#ccc";
        return (
          <Pressable key={item.key} style={styles.navItem} onPress={() => onNavigate(item.key)} hitSlop={8}>
            <FontAwesome5 name={item.icon} size={16} color={color} solid={isActive} />
            <Text style={[styles.navLabel, { color }]}>{labels[item.key]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingTop: 14,
    backgroundColor: "#fff",
    borderTopWidth: 0.667,
    borderTopColor: "#f1f1f1",
  },
  navItem: {
    alignItems: "center",
    gap: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
});
