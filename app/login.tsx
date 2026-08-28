import { login as kakaoLogin } from "@react-native-seoul/kakao-login";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LanguagePickerModal } from "@/components/login/language-picker-modal";
import { LOCALES, loginText } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { useSession } from "@/hooks/use-session";

const logo = require("@/assets/images/login/logo.png");
const google = require("@/assets/images/login/google.png");

function formatLoginError(error: unknown, fallbackMessage: string) {
  if (typeof error === "string") {
    return error;
  }

  if (!error || typeof error !== "object") {
    return fallbackMessage;
  }

  const maybeApiError = error as {
    name?: string;
    status?: number;
    code?: string;
    message?: string;
  };

  const detail = [
    maybeApiError.name,
    maybeApiError.status ? `status=${maybeApiError.status}` : null,
    maybeApiError.code ? `code=${maybeApiError.code}` : null,
    maybeApiError.message,
  ]
    .filter(Boolean)
    .join(" / ");

  return detail || fallbackMessage;
}

export default function LoginScreen() {
  const { locale, setLocale } = useLanguage();
  const { loginWithKakao, loginWithGoogle } = useSession();
  const [isLangPickerVisible, setIsLangPickerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = loginText[locale];
  const currentLocaleMeta = LOCALES.find((item) => item.code === locale)!;

  useEffect(() => {
    GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
  }, []);

  const handleKakaoLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { accessToken } = await kakaoLogin();
      await loginWithKakao(accessToken);
      router.push("/onboarding-guide");
    } catch (error) {
      console.error(`[login] kakao login failed ${formatLoginError(error, t.socialLoginError)}`);
      setError(t.socialLoginError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === "cancelled") return;
      const { idToken } = response.data;
      if (!idToken) throw new Error("no idToken in Google sign-in response");
      await loginWithGoogle(idToken);
      router.push("/onboarding-guide");
    } catch (error) {
      console.error(`[login] google login failed ${formatLoginError(error, t.socialLoginError)}`);
      setError(t.socialLoginError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {isLangPickerVisible && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setIsLangPickerVisible(false)}
        />
      )}

      <View style={styles.langButtonWrapper}>
        <Pressable
          style={styles.langButton}
          onPress={() => setIsLangPickerVisible((visible) => !visible)}>
          <Text style={styles.langButtonText}>🌐 {currentLocaleMeta.badgeLabel}</Text>
        </Pressable>

        {isLangPickerVisible && (
          <View style={styles.langPickerAnchor}>
            <LanguagePickerModal
              currentLocale={locale}
              onSelect={(nextLocale) => {
                setLocale(nextLocale);
                setIsLangPickerVisible(false);
              }}
            />
          </View>
        )}
      </View>

      <View style={styles.center}>
        <View style={styles.logoRow}>
          <Image source={logo} style={styles.logoImage} contentFit="cover" />
          <View style={styles.logoText}>
            <Text style={styles.title}>{t.appTitle}</Text>
            <Text style={styles.subtitle}>{t.appSubtitle}</Text>
          </View>
        </View>
        <Text style={styles.description}>{t.description}</Text>
      </View>

      <View style={styles.bottom}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable style={styles.kakaoButton} onPress={handleKakaoLogin} disabled={isSubmitting}>
          <Text style={styles.kakaoEmoji}>💬</Text>
          <Text style={styles.kakaoText}>{t.kakaoButton}</Text>
        </Pressable>

        <Pressable style={styles.googleButton} onPress={handleGoogleLogin} disabled={isSubmitting}>
          <Image
            source={google}
            style={styles.googleIcon}
            contentFit="contain"
          />
          <Text style={styles.googleText}>{t.googleButton}</Text>
        </Pressable>

        <Text style={styles.terms}>{t.terms}</Text>

        <Pressable
          style={styles.devLoginToggle}
          onPress={() => router.push("/dev-login")}
          hitSlop={8}>
          <Text style={styles.devLoginToggleText}>{t.devLoginToggle}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdfcf8",
  },
  langButtonWrapper: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1,
  },
  langButton: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 3,
  },
  langButtonText: {
    fontSize: 13.5,
    color: "#000",
  },
  langPickerAnchor: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  logoImage: {
    width: 74,
    height: 79,
    borderRadius: 18,
  },
  logoText: {
    justifyContent: "center",
  },
  title: {
    fontFamily: "serif",
    fontWeight: "bold",
    fontSize: 34,
    color: "#2b1f1b",
  },
  subtitle: {
    fontFamily: "serif",
    fontSize: 22,
    color: "#5b4339",
  },
  description: {
    marginTop: 32,
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    color: "#8b7b73",
  },
  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 35,
    gap: 12,
  },
  errorText: {
    fontSize: 12,
    textAlign: "center",
    color: "#b91c1c",
  },
  kakaoButton: {
    height: 68,
    borderRadius: 16,
    backgroundColor: "#fee500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 2,
  },
  kakaoEmoji: {
    fontSize: 20,
  },
  kakaoText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#191919",
  },
  googleButton: {
    height: 68,
    borderRadius: 16,
    backgroundColor: "#fafaf8",
    borderWidth: 1,
    borderColor: "#ececec",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 2,
  },
  googleIcon: {
    width: 15,
    height: 20,
  },
  googleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#191919",
  },
  terms: {
    marginTop: 6,
    fontSize: 11,
    textAlign: "center",
    color: "#a09087",
  },
  devLoginToggle: {
    marginTop: 14,
    alignSelf: "center",
  },
  devLoginToggleText: {
    fontSize: 11,
    color: "#c3b8ae",
    textDecorationLine: "underline",
  },
});
