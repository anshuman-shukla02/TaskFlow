/**
 * Returns the auth token for the currently active role session in this tab.
 *
 * KEY DESIGN:
 * - `sessionStorage["activeRole"]` → per-tab, isolated, not shared between tabs
 * - `localStorage["token_${role}"]` → persists across refreshes within the same role
 */
export function getToken() {
  // sessionStorage is per-tab — each tab has its own activeRole
  const activeRole = sessionStorage.getItem("activeRole");
  if (activeRole) {
    return localStorage.getItem(`token_${activeRole}`);
  }
  // Fallback to legacy key for backward compatibility
  return localStorage.getItem("token");
}

/**
 * Returns the user object for the currently active role session in this tab.
 */
export function getUser() {
  const activeRole = sessionStorage.getItem("activeRole");
  if (activeRole) {
    const raw = localStorage.getItem(`user_${activeRole}`);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { return null; }
    }
  }
  // Fallback to legacy key
  const raw = localStorage.getItem("user");
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  return null;
}
