/**
 * Developer Mode Utilities
 *
 * This module provides utilities for bypassing authentication in local development.
 * Enable developer mode by setting NEXT_PUBLIC_DEV_MODE=true in your .env.local file.
 */

import type { User, Session } from "@supabase/supabase-js";

/**
 * Check if developer mode is enabled
 */
export function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV_MODE === "true";
}

/**
 * Mock user data for development
 */
export const DEV_USER: User = {
  id: "dev-user-id-123",
  aud: "authenticated",
  role: "authenticated",
  email: "dev@localhost.local",
  email_confirmed_at: new Date().toISOString(),
  phone: "",
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {
    provider: "dev",
    providers: ["dev"],
  },
  user_metadata: {
    dev_mode: true,
  },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Mock session data for development
 */
export const DEV_SESSION: Session = {
  access_token: "dev-access-token",
  refresh_token: "dev-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: DEV_USER,
};

/**
 * Get mock user for development or null if dev mode is disabled
 */
export function getDevUser(): User | null {
  return isDevMode() ? DEV_USER : null;
}

/**
 * Get mock session for development or null if dev mode is disabled
 */
export function getDevSession(): Session | null {
  return isDevMode() ? DEV_SESSION : null;
}

/**
 * Log developer mode status (useful for debugging)
 */
export function logDevModeStatus(): void {
  if (isDevMode()) {
    console.log(
      "%c🔧 Developer Mode Active",
      "background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;",
      "\nAuthentication is bypassed. Using mock user:",
      DEV_USER.email
    );
  }
}
