export const COOLDOWN_MS = 15 * 60 * 1000; // 15 min

export function canUpdate(lastUpdate: Date | null): boolean {
  if (!lastUpdate) return true;
  return Date.now() - lastUpdate.getTime() > COOLDOWN_MS;
} 