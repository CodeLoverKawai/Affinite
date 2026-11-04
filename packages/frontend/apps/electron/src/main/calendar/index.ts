import type { IpcMainInvokeEvent } from 'electron';

import { logger } from '../logger';
import type { NamespaceHandlers } from '../type';

const CALENDAR_USER_AGENT = 'AFFiNITe-Calendar/0.31.0';
const REQUEST_TIMEOUT_MS = 15_000;

export const calendarHandlers = {
  fetchIcsFeed: async (
    _: IpcMainInvokeEvent,
    rawUrl: string
  ): Promise<{
    ok: boolean;
    content?: string;
    status?: number;
    error?: string;
  }> => {
    const normalizedUrl = (rawUrl || '')
      .trim()
      .replace(/^webcals?:\/\//i, 'https://');

    if (!/^https?:\/\//i.test(normalizedUrl)) {
      return {
        ok: false,
        error:
          'Invalid calendar URL: must start with https://, http://, or webcal://',
      };
    }

    try {
      const res = await fetch(normalizedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': CALENDAR_USER_AGENT,
          Accept: 'text/calendar, text/plain, */*',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const content = await res.text();
      return {
        ok: true,
        content,
        status: res.status,
      };
    } catch (err) {
      logger.error('[calendar] fetchIcsFeed failed', err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  googleApiRequest: async (
    _: IpcMainInvokeEvent,
    params: {
      method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
      endpoint: string;
      accessToken: string;
      body?: unknown;
    }
  ): Promise<{
    ok: boolean;
    data?: any;
    status?: number;
    error?: string;
  }> => {
    if (!params?.endpoint || !params.endpoint.startsWith('/')) {
      return {
        ok: false,
        error: 'Invalid Google Calendar endpoint: must start with "/"',
      };
    }

    if (!params.accessToken?.trim()) {
      return {
        ok: false,
        error: 'Missing Google Calendar access token',
      };
    }

    const method = params.method ?? 'GET';
    const url = `https://www.googleapis.com/calendar/v3${params.endpoint}`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${params.accessToken.trim()}`,
          'Content-Type': 'application/json',
          'User-Agent': CALENDAR_USER_AGENT,
        },
        body:
          params.body !== undefined && method !== 'GET'
            ? JSON.stringify(params.body)
            : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const rawText = await res.text();
      let data: any = undefined;
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = rawText;
        }
      }

      if (!res.ok) {
        const apiError =
          typeof data === 'object' &&
          data !== null &&
          typeof data.error?.message === 'string'
            ? data.error.message
            : `HTTP ${res.status}: ${res.statusText}`;
        return {
          ok: false,
          status: res.status,
          data,
          error: apiError,
        };
      }

      return {
        ok: true,
        status: res.status,
        data,
      };
    } catch (err) {
      logger.error('[calendar] googleApiRequest failed', err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  refreshGoogleAccessToken: async (
    _: IpcMainInvokeEvent,
    params: {
      clientId: string;
      clientSecret?: string;
      refreshToken: string;
    }
  ): Promise<{
    ok: boolean;
    accessToken?: string;
    expiresIn?: number;
    error?: string;
  }> => {
    if (!params?.clientId?.trim() || !params?.refreshToken?.trim()) {
      return {
        ok: false,
        error: 'Missing clientId or refreshToken',
      };
    }

    const form = new URLSearchParams({
      client_id: params.clientId.trim(),
      refresh_token: params.refreshToken.trim(),
      grant_type: 'refresh_token',
    });

    if (params.clientSecret?.trim()) {
      form.set('client_secret', params.clientSecret.trim());
    }

    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': CALENDAR_USER_AGENT,
        },
        body: form.toString(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const data = (await res.json().catch(() => ({}))) as {
        access_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
      };

      if (!res.ok || !data.access_token) {
        return {
          ok: false,
          error:
            data.error_description ||
            data.error ||
            `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      return {
        ok: true,
        accessToken: data.access_token,
        expiresIn: data.expires_in,
      };
    } catch (err) {
      logger.error('[calendar] refreshGoogleAccessToken failed', err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
} satisfies NamespaceHandlers;
