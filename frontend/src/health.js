const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' && window.REACT_APP_BACKEND_URL) || "http://localhost:4000";

export async function healthAPI() {
  const res = await fetch(`${BACKEND_BASE}/api/health`);
  try {
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
