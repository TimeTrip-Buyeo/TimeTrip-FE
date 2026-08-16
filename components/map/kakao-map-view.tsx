import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent, type WebViewProps } from "react-native-webview";

import type { Locale } from "@/constants/translations";
import { getLocalizedSpotName, type Spot } from "@/lib/api/spots";

type KakaoMapViewProps = {
  spots: Spot[];
  locale: Locale;
  selectedSpotId: number | null;
  onSelectSpot: (spotId: number) => void;
};

const KAKAO_JAVASCRIPT_KEY = process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "";
const KAKAO_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JAVASCRIPT_KEY}&autoload=false`;
const BUYO_CENTER = { latitude: 36.2756, longitude: 126.9099 };
const DEV_MOCK_CURRENT_LOCATION = __DEV__ ? BUYO_CENTER : null;

function escapeScriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function buildMapHtml(spots: Spot[], locale: Locale) {
  const markerData = spots
    .filter((spot) => Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude))
    .map((spot) => ({
      id: spot.id,
      name: getLocalizedSpotName(spot, locale),
      latitude: spot.latitude,
      longitude: spot.longitude,
      spotType: spot.spotType,
    }));

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body, #map {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #d9e8d2;
      }
      .label {
        transform: translateY(42px);
        padding: 3px 7px;
        border-radius: 5px;
        border: 1px solid rgba(27, 27, 27, 0.08);
        background: rgba(255, 255, 255, 0.92);
        color: #1b1b1b;
        font-size: 11px;
        font-weight: 800;
        line-height: 14px;
        white-space: nowrap;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
      }
      .pin {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 2px solid #fff;
        background: #800000;
        color: #fff;
        font-size: 17px;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
      }
      .pin.main {
        background: #b8860b;
      }
      .pin.selected {
        width: 42px;
        height: 42px;
        box-shadow: 0 0 0 12px rgba(255, 255, 255, 0.38), 0 8px 18px rgba(0, 0, 0, 0.28);
      }
      .current-location {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 3px solid #fff;
        background: #2f7df6;
        box-shadow: 0 0 0 10px rgba(47, 125, 246, 0.18), 0 4px 12px rgba(0, 0, 0, 0.22);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const spots = ${escapeScriptJson(markerData)};
      const center = ${escapeScriptJson(BUYO_CENTER)};
      const currentLocation = ${escapeScriptJson(DEV_MOCK_CURRENT_LOCATION)};
      const sdkUrl = ${escapeScriptJson(KAKAO_SDK_URL)};
      let map = null;
      let selectedLabel = null;
      const markers = {};
      const spotById = {};

      function send(type, payload) {
        window.ReactNativeWebView?.postMessage(JSON.stringify({ type, payload }));
      }

      spots.forEach((spot) => {
        spotById[spot.id] = spot;
      });

      window.onerror = function (message, source, lineno, colno) {
        send("mapError", {
          message: String(message),
          source,
          lineno,
          colno,
          href: location.href,
          origin: location.origin,
          referrer: document.referrer,
          sdkUrl,
        });
      };

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      document.addEventListener("click", function (event) {
        const target = event.target.closest("[data-spot-id]");
        if (!target) return;
        send("spotPress", { spotId: Number(target.getAttribute("data-spot-id")) });
      });

      window.selectSpot = function (spotId) {
        const selectedSpot = spotById[Number(spotId)] ?? null;

        Object.keys(markers).forEach(function (id) {
          const marker = markers[id];
          const markerNode = document.querySelector('[data-spot-id="' + id + '"]');
          if (markerNode) markerNode.classList.toggle("selected", Boolean(selectedSpot && Number(id) === selectedSpot.id));
          marker.setZIndex(selectedSpot && Number(id) === selectedSpot.id ? 20 : 10);
        });

        if (selectedLabel) {
          selectedLabel.setMap(null);
          selectedLabel = null;
        }

        if (!map || !selectedSpot) return;

        const position = new kakao.maps.LatLng(selectedSpot.latitude, selectedSpot.longitude);
        selectedLabel = new kakao.maps.CustomOverlay({
          position,
          content: '<div class="label">' + escapeHtml(selectedSpot.name) + '</div>',
          xAnchor: 0.5,
          yAnchor: -0.15,
          zIndex: 19,
        });
        selectedLabel.setMap(map);
        map.setLevel(4);
        map.panTo(position);
      };

      function renderMap() {
        if (window.__kakaoSdkLoadFailed) {
          send("mapError", {
            message: "Kakao Maps SDK 스크립트 로드에 실패했습니다.",
            href: location.href,
            origin: location.origin,
            referrer: document.referrer,
            sdkUrl,
          });
          return;
        }

        if (!window.kakao?.maps) {
          send("mapError", {
            message: "Kakao Maps SDK가 로드되지 않았습니다.",
            href: location.href,
            origin: location.origin,
            referrer: document.referrer,
            sdkUrl,
          });
          return;
        }

        kakao.maps.load(function () {
          map = new kakao.maps.Map(document.getElementById("map"), {
            center: new kakao.maps.LatLng(
              currentLocation?.latitude ?? center.latitude,
              currentLocation?.longitude ?? center.longitude
            ),
            level: 7,
          });

          if (currentLocation) {
            const currentPosition = new kakao.maps.LatLng(currentLocation.latitude, currentLocation.longitude);
            const currentMarker = new kakao.maps.CustomOverlay({
              position: currentPosition,
              content: '<div class="current-location" aria-label="현재 위치"></div>',
              xAnchor: 0.5,
              yAnchor: 0.5,
              zIndex: 30,
            });
            currentMarker.setMap(map);
          }

          spots.forEach((spot) => {
            const position = new kakao.maps.LatLng(spot.latitude, spot.longitude);

            const markerContent =
              '<button data-spot-id="' +
              spot.id +
              '" class="pin ' +
              (spot.spotType === "MAIN" ? "main " : "") +
              '" type="button">⌖</button>';

            const marker = new kakao.maps.CustomOverlay({
              position,
              content: markerContent,
              clickable: true,
              xAnchor: 0.5,
              yAnchor: 0.5,
              zIndex: 10,
            });
            marker.setMap(map);
            markers[spot.id] = marker;
          });

          send("mapReady", { spotCount: spots.length });
        });
      }

      const sdkScript = document.createElement("script");
      sdkScript.src = sdkUrl;
      sdkScript.onload = renderMap;
      sdkScript.onerror = function () {
        send("mapError", {
          message: "Kakao Maps SDK 스크립트 로드에 실패했습니다.",
          href: location.href,
          origin: location.origin,
          referrer: document.referrer,
          sdkUrl,
        });
      };
      document.head.appendChild(sdkScript);
    </script>
  </body>
</html>`;
}

export function KakaoMapView({ spots, locale, selectedSpotId, onSelectSpot }: KakaoMapViewProps) {
  const webViewRef = useRef<any>(null);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [mapReadyCount, setMapReadyCount] = useState(0);
  const mapHtml = useMemo(() => buildMapHtml(spots, locale), [spots, locale]);
  const mapKey = useMemo(() => `${locale}-${spots.map((spot) => spot.id).join(",")}`, [spots, locale]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `window.selectSpot(${selectedSpotId === null ? "null" : JSON.stringify(selectedSpotId)}); true;`,
    );
  }, [mapReadyCount, selectedSpotId]);

  if (!KAKAO_JAVASCRIPT_KEY) {
    return (
      <View style={styles.missingKey}>
        <Text style={styles.missingKeyTitle}>Kakao JavaScript Key 필요</Text>
        <Text style={styles.missingKeyText}>.env에 EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY를 추가해 주세요.</Text>
      </View>
    );
  }

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        payload?: {
          spotId?: number;
          message?: string;
          href?: string;
          origin?: string;
          referrer?: string;
          sdkUrl?: string;
        };
      };
      if (data.type === "spotPress" && typeof data.payload?.spotId === "number") {
        onSelectSpot(data.payload.spotId);
      }
      if (data.type === "mapError") {
        const payload = data.payload;
        const message = typeof payload?.message === "string" ? payload.message : "카카오 지도를 불러오지 못했어요.";
        setWebViewError(
          [
            message,
            payload?.origin ? `origin=${payload.origin}` : null,
            payload?.href ? `href=${payload.href}` : null,
            payload?.referrer ? `referrer=${payload.referrer}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }
      if (data.type === "mapReady") {
        setWebViewError(null);
        setMapReadyCount((count) => count + 1);
      }
    } catch {
      // Ignore malformed messages from the WebView boundary.
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={(ref) => {
          webViewRef.current = ref;
        }}
        key={mapKey}
        source={{ html: mapHtml, baseUrl: "https://api.timetrip.store" }}
        style={StyleSheet.absoluteFill}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        onError={(event: Parameters<NonNullable<WebViewProps["onError"]>>[0]) =>
          setWebViewError(event.nativeEvent.description)
        }
        onHttpError={(event: Parameters<NonNullable<WebViewProps["onHttpError"]>>[0]) =>
          setWebViewError(`HTTP ${event.nativeEvent.statusCode}`)
        }
        scrollEnabled={false}
        bounces={false}
      />
      {webViewError && (
        <View style={styles.webViewError}>
          <Text style={styles.webViewErrorTitle}>카카오 지도 로드 실패</Text>
          <Text style={styles.webViewErrorText}>{webViewError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  missingKey: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#d9e8d2",
  },
  missingKeyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#800000",
  },
  missingKeyText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
    color: "#5b4339",
  },
  webViewError: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "42%",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(128,0,0,0.22)",
    padding: 14,
  },
  webViewErrorTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#800000",
    textAlign: "center",
  },
  webViewErrorText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    color: "#5b4339",
    textAlign: "center",
  },
});
