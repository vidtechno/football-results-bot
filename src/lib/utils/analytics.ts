/**
 * Manbora Author Analytics Utilities
 * Provides canonical calculation for drop-off rate and retention rate across chapters.
 */

/**
 * Calculates drop-off rate percent between two consecutive chapters.
 * 
 * Formula:
 *   dropOffRate = previousReads > 0 ? ((previousReads - currentReads) / previousReads) * 100 : 0
 * 
 * Rules:
 * 1. If isFirstChapter is true, returns null (neutral state, no previous chapter exists).
 * 2. If previousReads <= 0, returns 0 (prevents division by zero or Infinity).
 * 3. If currentReads >= previousReads, returns 0 (drop-off cannot be negative).
 * 4. Clamped strictly between 0 and 100.
 */
export function calculateDropOffRate(
  previousReads: number,
  currentReads: number,
  isFirstChapter = false
): number | null {
  if (isFirstChapter) return null;
  if (!previousReads || previousReads <= 0) return 0;
  if (currentReads >= previousReads) return 0;

  const rawDrop = ((previousReads - currentReads) / previousReads) * 100;
  if (isNaN(rawDrop) || !isFinite(rawDrop)) return 0;

  return Math.min(100, Math.max(0, Math.round(rawDrop)));
}

/**
 * Calculates retention rate percent between two consecutive chapters.
 * 
 * Formula:
 *   retentionRate = previousReads > 0 ? (currentReads / previousReads) * 100 : 0
 */
export function calculateRetentionRate(
  previousReads: number,
  currentReads: number,
  isFirstChapter = false
): number | null {
  if (isFirstChapter) return null;
  if (!previousReads || previousReads <= 0) return 0;

  const rawRetention = (currentReads / previousReads) * 100;
  if (isNaN(rawRetention) || !isFinite(rawRetention)) return 0;

  return Math.min(100, Math.max(0, Math.round(rawRetention)));
}
