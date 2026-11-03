export class CalendarBridgeError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'CalendarBridgeError';
  }
}

interface Wrapped {
  ok?: boolean;
  status?: number;
  error?: string;
}

export function unwrapIcsResult(result: unknown): string {
  if (typeof result === 'string') return result;
  const r = (result ?? {}) as Wrapped & { content?: string };
  if (r.ok && typeof r.content === 'string') return r.content;
  throw new CalendarBridgeError(r.error ?? 'ICS feed request failed', r.status);
}

export function unwrapGoogleResult(result: unknown): Record<string, unknown> {
  if (!result || typeof result !== 'object') return {};
  const r = result as Wrapped & { data?: unknown };
  if (typeof r.ok === 'boolean') {
    if (!r.ok) throw new CalendarBridgeError(r.error ?? 'Google API request failed', r.status);
    return (r.data && typeof r.data === 'object' ? r.data : {}) as Record<string, unknown>;
  }
  return r as Record<string, unknown>;
}

export async function withTokenRefresh<T>(opts: {
  token: string;
  request: (token: string) => Promise<T>;
  refresh: () => Promise<string | null>;
}): Promise<T> {
  try {
    return await opts.request(opts.token);
  } catch (e) {
    if (!(e instanceof CalendarBridgeError) || e.status !== 401) throw e;
    const fresh = await opts.refresh();
    if (!fresh) throw e;
    return opts.request(fresh);
  }
}

export function normalizeCalendarFeedUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/^webcal:\/\//i, 'https://');
}

export function isCorsSafeUrl(url: string, currentOrigin?: string): boolean {
  if (!url) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    const parsed = new URL(url);
    const origin = currentOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
    return Boolean(origin && parsed.origin === origin);
  } catch {
    return false;
  }
}

export function buildCalendarProxyUrl(targetUrl: string, proxyEndpoint?: string): string {
  const normalized = normalizeCalendarFeedUrl(targetUrl);
  if (!proxyEndpoint || isCorsSafeUrl(normalized)) {
    return normalized;
  }
  const separator = proxyEndpoint.includes('?') ? '&' : '?';
  return `${proxyEndpoint}${separator}url=${encodeURIComponent(normalized)}`;
}

