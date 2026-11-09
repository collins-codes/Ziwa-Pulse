const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalBase44Backend() {
  const configuredUrl = import.meta.env.VITE_BASE44_APP_BASE_URL;
  if (!configuredUrl) return false;

  try {
    return LOCAL_HOSTS.has(new URL(configuredUrl).hostname);
  } catch {
    return false;
  }
}

export const LOCAL_BACKEND_REQUIRED =
  "Saving is disabled unless this app is connected to the local Base44 dev backend. Start it with `npx base44 dev`.";
