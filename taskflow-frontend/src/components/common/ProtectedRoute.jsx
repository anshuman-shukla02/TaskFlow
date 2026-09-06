import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute — guards dashboard routes by checking:
 * 1. A JWT token exists in localStorage for the required role
 * 2. The token has not expired (client-side decode of `exp` claim)
 * 3. The stored user's role matches the route's required role
 *
 * If any check fails the user is redirected to /auth.
 * If the user is authenticated but with a different role, they're
 * redirected to their own dashboard instead.
 */
function isTokenExpired(token) {
  try {
    // JWT structure: header.payload.signature — we only need the payload
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false; // no expiry claim → treat as valid
    // exp is in seconds, Date.now() is in ms
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true; // if we can't decode it, treat as expired
  }
}

function getRoleFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ role, children }) {
  const token = localStorage.getItem(`token_${role}`);

  // Case 1: No token for this role
  if (!token) {
    // Check if logged in as a different role — redirect to that dashboard
    const roles = ["student", "faculty", "admin"];
    for (const r of roles) {
      const otherToken = localStorage.getItem(`token_${r}`);
      if (otherToken && !isTokenExpired(otherToken)) {
        return <Navigate to={`/${r}`} replace />;
      }
    }
    // Not logged in at all
    return <Navigate to="/auth" replace />;
  }

  // Case 2: Token exists but expired
  if (isTokenExpired(token)) {
    // Clean up stale data
    localStorage.removeItem(`token_${role}`);
    localStorage.removeItem(`user_${role}`);
    sessionStorage.removeItem("activeRole");
    return <Navigate to="/auth" replace />;
  }

  // Case 3: Token exists, not expired — verify role matches
  const tokenRole = getRoleFromToken(token);
  if (tokenRole && tokenRole !== role) {
    return <Navigate to={`/${tokenRole}`} replace />;
  }

  // All checks passed — render the protected content
  return children;
}
