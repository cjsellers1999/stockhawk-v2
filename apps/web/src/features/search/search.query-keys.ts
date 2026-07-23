export const searchQueryKeys = {
  all: ["search"] as const,
  offers: () => [...searchQueryKeys.all, "offers"] as const,
};
