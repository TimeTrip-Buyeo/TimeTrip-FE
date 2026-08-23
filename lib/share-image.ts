import { requireOptionalNativeModule } from "expo-modules-core";
import * as FileSystem from "expo-file-system/legacy";

import { getAuthHeaders, toApiUrl } from "@/lib/api/client";

type ExpoSharingModule = {
  isAvailableAsync?: () => Promise<boolean>;
  shareAsync?: (url: string, options?: { mimeType?: string; dialogTitle?: string; UTI?: string }) => Promise<void>;
};
type ExpoSharingModuleShape = ExpoSharingModule & { default?: ExpoSharingModule };

async function getSharingModule(): Promise<ExpoSharingModule | null> {
  if (!requireOptionalNativeModule("ExpoSharing")) {
    console.warn("[share-image] ExpoSharing native module is unavailable. Rebuild the dev client to enable image sharing.");
    return null;
  }

  try {
    const sharing = (await import("expo-sharing")) as ExpoSharingModuleShape;
    return sharing.isAvailableAsync ? sharing : sharing.default ?? null;
  } catch (error) {
    console.error("[share-image] expo-sharing native module is unavailable", error);
    return null;
  }
}

function hasJpegExtension(uri: string) {
  return /\.(jpe?g)(\?.*)?$/i.test(uri);
}

async function ensureShareableJpegUri(uri: string) {
  if (!FileSystem.cacheDirectory) return uri;

  const shareUri = `${FileSystem.cacheDirectory}timetrip-selfie-share-${Date.now()}.jpg`;
  if (/^https?:\/\//.test(uri)) {
    const headers = await getAuthHeaders();
    const downloaded = await FileSystem.downloadAsync(toApiUrl(uri), shareUri, headers ? { headers } : undefined);
    return downloaded.uri;
  }

  if (uri.startsWith("file://") && hasJpegExtension(uri)) return uri;

  await FileSystem.copyAsync({ from: uri, to: shareUri });
  return shareUri;
}

export async function shareImageAsync(uri: string, dialogTitle: string) {
  const sharing = await getSharingModule();
  const isAvailable = await sharing?.isAvailableAsync?.();
  if (!sharing?.shareAsync || !isAvailable) return false;

  const shareUri = await ensureShareableJpegUri(uri);
  await sharing.shareAsync(shareUri, {
    mimeType: "image/jpeg",
    UTI: "public.jpeg",
    dialogTitle,
  });
  return true;
}
