import { Inter_400Regular } from '@expo-google-fonts/inter';
import { NanumMyeongjo_400Regular, NanumMyeongjo_700Bold, useFonts } from '@expo-google-fonts/nanum-myeongjo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { CapturedPhotosProvider } from '@/hooks/use-captured-photos';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IntroProvider, useIntro } from '@/hooks/use-intro';
import { LanguageProvider } from '@/hooks/use-language';
import { SessionProvider, useSession } from '@/hooks/use-session';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ NanumMyeongjo_400Regular, NanumMyeongjo_700Bold, Inter_400Regular });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <LanguageProvider>
      <SessionProvider>
        <IntroProvider>
          <CapturedPhotosProvider>
            <RootNavigator />
          </CapturedPhotosProvider>
        </IntroProvider>
      </SessionProvider>
    </LanguageProvider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { isLoggedIn, isSessionReady } = useSession();
  const { hasSeenIntro } = useIntro();

  // Wait for the stored-token check to finish so a real (Kakao/Google)
  // session doesn't flash the login screen before landing on the tabs.
  if (!isSessionReady) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Protected guard={!hasSeenIntro}>
          <Stack.Screen name="splash" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={hasSeenIntro && isLoggedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={hasSeenIntro && !isLoggedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="email-login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* Always reachable (not gated on login) so the map's guide button can
            reopen the tour for a logged-in user at any time. */}
        <Stack.Screen name="onboarding-guide" options={{ headerShown: false }} />
        <Stack.Screen name="ar-camera" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="collection" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="album" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="my-page" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="buyeo-cut" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="person-camera" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="photo-save" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
