import { describe, expect, test } from 'vitest';
import {
  CalendarBridgeError,
  unwrapGoogleResult,
  unwrapIcsResult,
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
    }
  });
});
