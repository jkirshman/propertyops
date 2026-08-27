export function formatWorkOrderNumber(sequenceNumber: number): string {
  return `WO-${String(sequenceNumber).padStart(6, "0")}`;
}
