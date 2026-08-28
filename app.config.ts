import type { ConfigContext, ExpoConfig } from "expo/config";

// Static app.json can't read process.env, and the Kakao/Google native keys
// need to come from .env (see .env.example) instead of being committed.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TimeSlip_buyeo",
  slug: "TimeSlip_buyeo",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "timeslipbuyeo",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: ["android.permission.CAMERA", "android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION"],
    package: "com.anonymous.TimeSlip_buyeo",
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-asset",
    "expo-audio",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "TimeTrip이 유적지 위에 과거 모습을 겹쳐 보여주려면 카메라 접근 권한이 필요해요.",
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "TimeTrip이 유적지와의 거리를 확인해 타임슬립 오버레이를 보여주려면 위치 접근 권한이 필요해요.",
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: "TimeTrip이 완성된 부여세컷 콜라주를 갤러리에 저장하려면 사진 접근 권한이 필요해요.",
        savePhotosPermission: "TimeTrip이 완성된 부여세컷 콜라주를 갤러리에 저장하려면 사진 저장 권한이 필요해요.",
        granularPermissions: [],
      },
    ],
    [
      "@react-native-seoul/kakao-login",
      {
        kakaoAppKey: process.env.KAKAO_NATIVE_APP_KEY ?? "",
        overrideKakaoSDKVersion: "2.11.2",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          extraMavenRepos: ["https://devrepo.kakao.com/nexus/content/groups/public/"],
        },
      },
    ],
    // @react-native-google-signin/google-signin's own config plugin is
    // intentionally NOT registered here: on Android it needs no native
    // config (just GoogleSignin.configure({ webClientId }) at runtime, see
    // app/login.tsx). Registering the plugin without options pulls in its
    // Firebase-file-based Android path (google-services.json, which this
    // project doesn't have) and registering it WITH options requires a
    // valid iosUrlScheme or the plugin throws during prebuild — only add it
    // back (with GOOGLE_IOS_URL_SCHEME) if iOS support is picked up later.
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "859e5f21-1c36-4c44-ab44-84ba771106b2",
    },
  },
  owner: "ohyeeun",
});
