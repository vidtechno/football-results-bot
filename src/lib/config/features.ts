/**
 * Central Feature Flags configuration for Manbora Platform.
 * All feature flags are strictly typed.
 */

// Notifications feature flag: disabled by default in production optimization phase.
// To re-enable, set NEXT_PUBLIC_NOTIFICATIONS_ENABLED=true in environment variables.
export const NOTIFICATIONS_ENABLED =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED === 'true';

export function areNotificationsEnabled(): boolean {
  return NOTIFICATIONS_ENABLED;
}
