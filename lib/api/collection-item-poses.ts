import { apiGet } from "@/lib/api/client";

export type CollectionItemPose = {
  id?: number;
  poseId?: number;
  name: string;
  poseImageUrl: string | null;
  thumbnailUrl: string | null;
  sortOrder: number | null;
};

type CollectionItemPoseListResponse = {
  poses?: CollectionItemPose[];
};

export function getCollectionItemPoses(collectionItemId: number): Promise<CollectionItemPose[]> {
  return apiGet<CollectionItemPoseListResponse | CollectionItemPose[]>(
    `/api/collection-items/${collectionItemId}/poses`,
  ).then((result) => (Array.isArray(result) ? result : result.poses ?? []));
}
