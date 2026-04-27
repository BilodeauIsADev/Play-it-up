/**
 * Normalize a URL provided by an IPTV source. Many providers ship URLs
 * without an `http://` prefix (e.g. `host.example:8080/logo.png`), which
 * the browser then parses as `<scheme>:<path>` where `host.example`
 * becomes the scheme — failing CSP and breaking image loads.
 *
 * Rules:
 *   - empty / whitespace → undefined
 *   - already has http(s)/data/blob/file/ftp(s) scheme → unchanged
 *   - starts with `//` → prefix with `http:`
 *   - otherwise → prefix with `http://`
 */
export function normalizeUrl(input: string | undefined | null): string | undefined {
  if (input == null) return undefined;
  const trimmed = String(input).trim();
  if (!trimmed) return undefined;
  if (/^(https?|data|blob|file|ftps?):/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return "http:" + trimmed;
  return "http://" + trimmed.replace(/^\/+/, "");
}

/**
 * Normalize the server URL the user types into the Xtream form. Strips
 * trailing slashes, prepends `http://` if no scheme is present.
 */
export function normalizeServerUrl(input: string): string {
  const normalized = normalizeUrl(input) ?? "";
  return normalized.replace(/\/+$/, "");
}
