import { DEFAULT_LINK_PREVIEW_ENDPOINT } from '@blocksuite/affine/shared/consts';
import {
  LinkPreviewCacheIdentifier,
  type LinkPreviewCacheProvider,
  LinkPreviewService,
  LinkPreviewServiceIdentifier,
} from '@blocksuite/affine/shared/services';
import { type ExtensionType } from '@blocksuite/affine/store';
import type { Container } from '@blocksuite/global/di';
import type { FrameworkProvider } from '@toeverything/infra';

import { ServerService } from '../../../modules/cloud/services/server';

class AffineLinkPreviewService extends LinkPreviewService {
  constructor(endpoint: string, cache: LinkPreviewCacheProvider) {
    super(cache);
    this.setEndpoint(endpoint);
  }

  override query = async (
    url: string,
    signal?: AbortSignal
  ): Promise<any> => {
    if (url.includes('localhost:7337') || url.includes('localhost:1337') || url.includes('/boards/')) {
      const boardMatch = url.match(/\/boards\/([a-zA-Z0-9\-_]+)/);
      const cardMatch = url.match(/\/cards\/([a-zA-Z0-9\-_]+)/);

      if (cardMatch) {
        const cardId = cardMatch[1];
        return {
          title: `Planka Task #${cardId}`,
          description: 'Live Task Card from Planka Kanban Board',
          icon: 'https://raw.githubusercontent.com/planka-board/planka/master/client/public/favicon.ico',
          image: 'https://raw.githubusercontent.com/planka-board/planka/master/client/public/apple-touch-icon.png',
        };
      } else if (boardMatch) {
        const boardId = boardMatch[1];
        return {
          title: `Planka Project Board #${boardId}`,
          description: 'Interactive project task board',
          icon: 'https://raw.githubusercontent.com/planka-board/planka/master/client/public/favicon.ico',
          image: 'https://raw.githubusercontent.com/planka-board/planka/master/client/public/apple-touch-icon.png',
        };
      }
    }

    return super.query(url, signal);
  };
}

/**
 * Patch the link preview service, set the endpoint and cache
 * @param framework
 * @returns
 */
export function patchLinkPreviewService(
  framework: FrameworkProvider
): ExtensionType {
  // get link preview service endpoint from server and BUILD_CONFIG
  let linkPreviewUrl: string;
  try {
    const server = framework.get(ServerService).server;
    linkPreviewUrl = new URL(
      BUILD_CONFIG.linkPreviewUrl || '/',
      server.baseUrl
    ).toString();
  } catch (err) {
    console.error(
      'Invalid BUILD_CONFIG.linkPreviewUrl, falling back to default',
      err
    );
    linkPreviewUrl = DEFAULT_LINK_PREVIEW_ENDPOINT;
  }

  return {
    setup: (di: Container) => {
      di.override(LinkPreviewServiceIdentifier, provider => {
        return new AffineLinkPreviewService(
          linkPreviewUrl,
          provider.get(LinkPreviewCacheIdentifier)
        );
      });
    },
  };
}
