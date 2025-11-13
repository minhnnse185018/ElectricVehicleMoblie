import AsyncStorage from '@react-native-async-storage/async-storage';

// Read JWT from storage
export async function getToken() {
  try {
    const token = await AsyncStorage.getItem('auth.token');
    return token || '';
  } catch {
    return '';
  }
}

// Decode a JWT payload safely (no signature verification)
export function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    let jsonStr = '';
    // Prefer Buffer when available
    if (typeof Buffer !== 'undefined' && Buffer?.from) {
      jsonStr = Buffer.from(base64, 'base64').toString('utf8');
    } else if (typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function') {
      // Fallback to atob if Buffer is unavailable
      const ascii = globalThis.atob(base64);
      try {
        jsonStr = decodeURIComponent(escape(ascii));
      } catch {
        jsonStr = ascii;
      }
    }
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// Convenience: get current user's id (sub) from JWT
export async function getCurrentUserId() {
  const token = await getToken();
  const payload = decodeJwt(token);
  const sub = payload?.sub || payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
  return sub || '';
}
