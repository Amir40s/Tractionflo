const oversizedAuthMetadataKeys = [
  "lead_qualifications",
  "revenue_outcome_providers",
];

export function compactUserAuthMetadata(metadata: Record<string, unknown> | null | undefined) {
  const nextMetadata: Record<string, unknown> = { ...(metadata || {}) };

  oversizedAuthMetadataKeys.forEach((key) => {
    if (key in nextMetadata) {
      nextMetadata[key] = null;
    }
  });

  return nextMetadata;
}
