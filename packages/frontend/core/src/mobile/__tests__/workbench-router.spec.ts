/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

import { workbenchRoutes } from '../workbench-router';

describe('mobile workbenchRoutes', () => {
  const HUB_ROUTES = [
    '/chat',
    '/boards',
    '/calendar',
    '/weekly-reports',
    '/habits',
    '/streaks',
  ] as const;

  it('contains all 6 hub routes', () => {
    const routePaths = workbenchRoutes.map(r => r.path);
    for (const hubRoute of HUB_ROUTES) {
      expect(routePaths).toContain(hubRoute);
    }
  });

  it('each hub route defines a lazy loader function', () => {
    for (const hubRoute of HUB_ROUTES) {
      const route = workbenchRoutes.find(r => r.path === hubRoute);
      expect(route).toBeDefined();
      expect(typeof route?.lazy).toBe('function');
    }
  });

  it('hub routes appear before /:pageId and * wildcards', () => {
    const pageIdIndex = workbenchRoutes.findIndex(r => r.path === '/:pageId');
    const wildcardIndex = workbenchRoutes.findIndex(r => r.path === '*');

    expect(pageIdIndex).toBeGreaterThan(-1);
    expect(wildcardIndex).toBeGreaterThan(-1);

    for (const hubRoute of HUB_ROUTES) {
      const routeIndex = workbenchRoutes.findIndex(r => r.path === hubRoute);
      expect(routeIndex).toBeGreaterThan(-1);
      expect(routeIndex).toBeLessThan(pageIdIndex);
      expect(routeIndex).toBeLessThan(wildcardIndex);
    }
  });

  it('resolving lazy loaders returns a module with Component', async () => {
    for (const hubRoute of HUB_ROUTES) {
      const route = workbenchRoutes.find(r => r.path === hubRoute);
      expect(route?.lazy).toBeDefined();
      const loaded = await route!.lazy!();
      expect(loaded).toBeDefined();
      expect(loaded).toHaveProperty('Component');
      expect(typeof (loaded as { Component: unknown }).Component).toBe(
        'function'
      );
    }
  });
});
