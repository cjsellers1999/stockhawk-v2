export const ownerCommandQueryKeys = {
  all: ["owner-commands"] as const,
  healthRefresh: () =>
    [...ownerCommandQueryKeys.all, "refresh_health"] as const,
  healthRefreshPending: () =>
    [...ownerCommandQueryKeys.healthRefresh(), "pending"] as const,
};
