export type NormalizeUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: "invalid_url" };

const PROTOCOL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

export function normalizeUrl(input: string): NormalizeUrlResult {
  const raw = input.trim();
  if (!raw) {
    return { ok: false, error: "invalid_url" };
  }

  const withProtocol = PROTOCOL_PATTERN.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ok: false, error: "invalid_url" };
    }
    return { ok: true, url: parsed.toString() };
  } catch {
    return { ok: false, error: "invalid_url" };
  }
}
