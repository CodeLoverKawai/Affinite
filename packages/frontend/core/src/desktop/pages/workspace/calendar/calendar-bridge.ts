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
  const r = (result ?? {}) as Wrapped & { data?: unknown };
  if (typeof r.ok === 'boolean') {
    if (!r.ok) throw new CalendarBridgeError(r.error ?? 'Google API request failed', r.status);
    return (r.data && typeof r.data === 'object' ? r.data : {}) as Record<string, unknown>;
  }
  return r as Record<string, unknown>;
}
