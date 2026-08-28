export function formatAssetTag(sequenceNumber: number): string {
  return `ASSET-${String(sequenceNumber).padStart(6, "0")}`;
}
