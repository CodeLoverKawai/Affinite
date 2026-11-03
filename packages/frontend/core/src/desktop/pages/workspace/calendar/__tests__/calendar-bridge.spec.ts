import { describe, expect, test } from 'vitest';
import {
  CalendarBridgeError,
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
});
