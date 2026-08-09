import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useIntro } from "@/hooks/use-intro";

const logoIcon = require("@/assets/images/splash/logo-icon.png");
const incenseBurner = require("@/assets/images/splash/incense-burner.png");

const INTRO_DURATION = 4200;

export default function SplashScreen() {
  const { finishIntro } = useIntro();

  const entrance = useSharedValue(0);
  const breathe = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    entrance.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    progress.value = withTiming(1, {
      duration: INTRO_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    const timer = setTimeout(finishIntro, INTRO_DURATION);
    return () => clearTimeout(timer);
  }, [breathe, entrance, finishIntro, progress]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ scale: 0.96 + entrance.value * 0.04 }],
  }));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + breathe.value * 0.06 },
      { translateY: -breathe.value * 8 },
    ],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.dot, styles.dot1]} />
      <View style={[styles.dot, styles.dot2]} />
      <View style={[styles.dot, styles.dot3]} />
      <View style={styles.glow} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Animated.View style={[styles.content, contentStyle]}>
          <View style={styles.top}>
            <Text style={styles.eyebrow}>1400년 전 백제로의 시간여행</Text>
            <View style={styles.logoRow}>
              <Image
                source={logoIcon}
                style={styles.logoIcon}
                contentFit="cover"
              />
              <Text style={styles.logoText}>TimeTrip</Text>
            </View>
            <Text style={styles.tagline}>부여 AR 역사관광 플랫폼</Text>
          </View>

          <View style={styles.center}>
            <Animated.View style={imageStyle}>
              <Image
                source={incenseBurner}
                style={styles.image}
                contentFit="contain"
              />
            </Animated.View>
          </View>

          <View style={styles.bottom}>
            <Text style={styles.loadingText}>
              사비성으로 시간여행을 준비하는 중...
            </Text>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, progressStyle]}>
                <LinearGradient
                  colors={["#b8860b", "#f2c94c"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>

      <LinearGradient
        colors={["rgba(17,17,17,0)", "rgba(17,17,17,0.85)"]}
        style={styles.bottomFade}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  dot: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "rgba(242,201,76,0.35)",
  },
  dot1: {
    top: "19%",
    left: "13%",
    width: 8,
    height: 8,
  },
  dot2: {
    top: "34%",
    right: "19%",
    width: 6,
    height: 6,
    backgroundColor: "rgba(242,201,76,0.28)",
  },
  dot3: {
    top: "11%",
    right: "28%",
    width: 10,
    height: 10,
    backgroundColor: "rgba(242,201,76,0.2)",
  },
  glow: {
    position: "absolute",
    top: "38%",
    left: "50%",
    width: 320,
    height: 320,
    marginLeft: -160,
    borderRadius: 160,
    backgroundColor: "rgba(184,134,11,0.16)",
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "46%",
  },
  top: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 32,
  },
  eyebrow: {
    color: "#f2c94c",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.75,
    textTransform: "uppercase",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
  },
  logoIcon: {
    width: 44,
    height: 42,
    borderRadius: 11,
  },
  logoText: {
    fontFamily: "serif",
    fontWeight: "bold",
    fontSize: 26,
    color: "#fff",
    letterSpacing: -0.6,
  },
  tagline: {
    marginTop: 12,
    color: "#9ca3af",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: 220,
    height: 330,
  },
  bottom: {
    paddingHorizontal: 48,
    paddingBottom: 40,
    gap: 12,
  },
  track: {
    height: 3,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 9999,
  },
  loadingText: {
    textAlign: "center",
    color: "#ffe08a",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.45,
  },
});
