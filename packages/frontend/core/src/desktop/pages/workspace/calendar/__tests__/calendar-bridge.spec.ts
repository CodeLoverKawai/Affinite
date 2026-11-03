import { describe, expect, test } from 'vitest';
import {
  buildCalendarProxyUrl,
  CalendarBridgeError,
  isCorsSafeUrl,
  normalizeCalendarFeedUrl,
  unwrapGoogleResult,
  unwrapIcsResult,
  withTokenRefresh,
} from '../calendar-bridge';

describe('calendar-bridge', () => {
  test('ICS: acepta string crudo (fallback web)', () => {
    expect(unwrapIcsResult('BEGIN:VCALENDAR')).toBe('BEGIN:VCALENDAR');
  });
  test('ICS: extrae content de {ok:true}', () => {
    expect(unwrapIcsResult({ ok: true, content: 'BEGIN:VCALENDAR' })).toBe('BEGIN:VCALENDAR');
  });
  test('ICS: lanza con el error del handler', () => {
    expect(() => unwrapIcsResult({ ok: false, status: 404, error: 'HTTP 404: Not Found' }))
      .toThrow(CalendarBridgeError);
  });
  test('Google: extrae data de {ok:true}', () => {
    expect(unwrapGoogleResult({ ok: true, data: { items: [1] } })).toEqual({ items: [1] });
  });
  test('Google: objeto crudo con items pasa tal cual (fallback fetch)', () => {
    expect(unwrapGoogleResult({ items: [1] })).toEqual({ items: [1] });
  });
  test('Google: propaga status y mensaje', () => {
    try {
      unwrapGoogleResult({ ok: false, status: 401, error: 'Invalid Credentials' });
      throw new Error('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(CalendarBridgeError);
      expect((e as CalendarBridgeError).status).toBe(401);
      expect((e as CalendarBridgeError).message).toBe('Invalid Credentials');
    }
  });
  test('Google: valores no-objeto o falsy retornan {} defensivamente', () => {
    expect(unwrapGoogleResult(null)).toEqual({});
    expect(unwrapGoogleResult(undefined)).toEqual({});
    expect(unwrapGoogleResult(123)).toEqual({});
    expect(unwrapGoogleResult('raw-string')).toEqual({});
    expect(unwrapGoogleResult(true)).toEqual({});
    expect(unwrapGoogleResult(false)).toEqual({});
  });
  test('withTokenRefresh reintenta una vez tras 401 con token nuevo', async () => {
    const calls: string[] = [];
    const result = await withTokenRefresh({
      token: 'old',
      request: async t => {
        calls.push(t);
        if (t === 'old') throw new CalendarBridgeError('x', 401);
        return { ok: true };
      },
      refresh: async () => 'new',
    });
    expect(calls).toEqual(['old', 'new']);
    expect(result).toEqual({ ok: true });
  });
  test('withTokenRefresh no reintenta errores != 401', async () => {
    await expect(
      withTokenRefresh({
        token: 'old',
        request: async () => {
          throw new CalendarBridgeError('x', 500);
        },
        refresh: async () => 'new',
      })
    ).rejects.toThrow('x');
  });
  test('withTokenRefresh propaga error original si refresh retorna null', async () => {
    await expect(
      withTokenRefresh({
        token: 'old',
        request: async () => {
          throw new CalendarBridgeError('unauthorized', 401);
        },
        refresh: async () => null,
      })
    ).rejects.toThrow('unauthorized');
  });

  describe('normalizeCalendarFeedUrl', () => {
    test('convierte webcal:// a https://', () => {
      expect(normalizeCalendarFeedUrl('webcal://example.com/cal.ics')).toBe('https://example.com/cal.ics');
    });

    test('soporta esquema webcal insensible a mayúsculas y espacios en blanco', () => {
      expect(normalizeCalendarFeedUrl('   WEBCAL://example.com/cal.ics  ')).toBe('https://example.com/cal.ics');
    });

    test('mantiene https:// sin alterar salvo trim', () => {
      expect(normalizeCalendarFeedUrl('  https://example.com/cal.ics ')).toBe('https://example.com/cal.ics');
    });
  });

  describe('isCorsSafeUrl', () => {
    test('retorna false para url vacía o nula', () => {
      expect(isCorsSafeUrl('')).toBe(false);
      expect(isCorsSafeUrl(null as unknown as string)).toBe(false);
    });

    test('identifica rutas relativas como seguras', () => {
      expect(isCorsSafeUrl('/feed.ics')).toBe(true);
      expect(isCorsSafeUrl('/api/calendar/v1')).toBe(true);
    });

    test('rechaza URLs relativas al protocolo //', () => {
      expect(isCorsSafeUrl('//example.com/feed.ics')).toBe(false);
    });

    test('acepta URLs del mismo origen cuando coincide currentOrigin', () => {
      expect(isCorsSafeUrl('https://app.affine.pro/feed.ics', 'https://app.affine.pro')).toBe(true);
    });

    test('rechaza URLs de distinto origen', () => {
      expect(isCorsSafeUrl('https://calendar.google.com/feed.ics', 'https://app.affine.pro')).toBe(false);
    });

    test('retorna false para URLs malformadas que no son rutas relativas', () => {
      expect(isCorsSafeUrl('ht!tp://:::invalid')).toBe(false);
    });
  });

  describe('buildCalendarProxyUrl', () => {
    test('sin proxy devuelve la URL normalizada', () => {
      expect(buildCalendarProxyUrl('webcal://example.com/cal.ics')).toBe('https://example.com/cal.ics');
      expect(buildCalendarProxyUrl('https://example.com/cal.ics', '')).toBe('https://example.com/cal.ics');
    });

    test('con proxy envuelve URL externa codificada', () => {
      expect(buildCalendarProxyUrl('https://google.com/cal.ics', '/api/calendar/proxy')).toBe(
        '/api/calendar/proxy?url=https%3A%2F%2Fgoogle.com%2Fcal.ics'
      );
    });

    test('con proxy normaliza webcal:// antes de codificar', () => {
      expect(buildCalendarProxyUrl('webcal://google.com/cal.ics', '/api/calendar/proxy')).toBe(
        '/api/calendar/proxy?url=https%3A%2F%2Fgoogle.com%2Fcal.ics'
      );
    });

    test('no envuelve URLs relativas o seguras', () => {
      expect(buildCalendarProxyUrl('/feed.ics', '/api/calendar/proxy')).toBe('/feed.ics');
    });

    test('maneja proxyEndpoint con query params existentes usando &', () => {
      expect(buildCalendarProxyUrl('https://google.com/cal.ics', '/api/proxy?type=ics')).toBe(
        '/api/proxy?type=ics&url=https%3A%2F%2Fgoogle.com%2Fcal.ics'
      );
    });
  });
});

