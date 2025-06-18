export function canUpdate(lastUpdate: Date | null, cooldownMinutes: number = 5): boolean {
  if (!lastUpdate) return true;
  const cooldownMs = cooldownMinutes * 60 * 1000;
  return Date.now() - lastUpdate.getTime() > cooldownMs;
} 