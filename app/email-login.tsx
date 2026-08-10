import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { authText } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { useSession } from "@/hooks/use-session";

// Real (in-session) credential check against accounts registered via
// /signup — not a stub. On success this is a returning member, so it skips
// the onboarding tour and goes straight to the map, unlike /signup which
// still routes new members through it.
export default function EmailLoginScreen() {
  const { locale } = useLanguage();
  const t = authText[locale];
  const { logIn } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const result = logIn(email.trim(), password);
    if (!result.ok) {
      setError(result.error === "not-found" ? t.errors.notFound : t.errors.wrongPassword);
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <FontAwesome5 name="chevron-left" size={20} color="#1b1b1b" solid />
        </Pressable>
        <Text style={styles.headerTitle}>{t.loginTitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>{t.emailLabel}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
            }}
            placeholder={t.emailPlaceholder}
            placeholderTextColor="#a8a29e"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t.passwordLabel}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
            placeholder={t.passwordPlaceholder}
            placeholderTextColor="#a8a29e"
            secureTextEntry
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed]}
          onPress={handleSubmit}
          disabled={!email || !password}>
          <Text style={styles.submitButtonText}>{t.loginButton}</Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>{t.noAccountPrompt}</Text>
          <Pressable
            style={({ pressed }) => [styles.footerLink, pressed && styles.footerLinkPressed]}
            onPress={() => router.push("/signup")}
            hitSlop={8}>
            <Text style={styles.footerLinkText}>{t.signUpLink}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdfcf8",
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    position: "absolute",
    left: 24,
    bottom: 16,
  },
  headerTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 18,
    color: "#1b1b1b",
  },
  form: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5b4339",
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ececec",
    backgroundColor: "#fafaf8",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1b1b1b",
  },
  errorText: {
    fontSize: 12,
    color: "#b91c1c",
    marginTop: -8,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#800000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitButtonPressed: {
    backgroundColor: "#cccccc",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  footerText: {
    fontSize: 13,
    color: "#8b7b73",
  },
  footerLink: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  footerLinkPressed: {
    backgroundColor: "#cccccc",
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#800000",
    textDecorationLine: "underline",
  },
});
