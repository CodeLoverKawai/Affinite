import { generateKeyPairSync, createPublicKey } from 'node:crypto';

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { Config } from '../../base';
import { Models } from '../../models';
import { Public } from './guard';
import { CurrentUser } from './session';

@Controller()
export class OidcController {
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly kid = 'affinite-oidc-key-1';

  constructor(
    private readonly models: Models,
    private readonly config: Config
  ) {
    // Generate RSA key pair on startup
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  // 1. Discovery Configuration
  @Public()
  @Get('/.well-known/openid-configuration')
  getDiscovery(@Req() req: Request) {
    const issuer = `${req.protocol}://${req.get('host')}`;
    return {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      userinfo_endpoint: `${issuer}/oauth/userinfo`,
      jwks_uri: `${issuer}/oauth/jwks`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'email', 'profile'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      claims_supported: ['sub', 'email', 'name', 'username'],
    };
  }

  // 2. JWKS Public Keys
  @Public()
  @Get('/oauth/jwks')
  getJwks() {
    const keyObject = createPublicKey(this.publicKey);
    const jwk = keyObject.export({ format: 'jwk' });

    return {
      keys: [
        {
          ...jwk,
          kid: this.kid,
          use: 'sig',
          alg: 'RS256',
        },
      ],
    };
  }

  // 3. Authorization Endpoint
  @Public()
  @Get('/oauth/authorize')
  async authorize(
    @Query('response_type') responseType: string,
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() user?: CurrentUser
  ) {
    if (!user) {
      // Redirect to the login page of AFFiNITe
      const loginUrl = `/signIn?redirect=${encodeURIComponent(req.originalUrl)}`;
      return res.redirect(loginUrl);
    }

    if (responseType !== 'code') {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'unsupported_response_type' });
    }

    // Generate stateless auth code signed as JWT
    const codePayload = {
      sub: user.id,
      client_id: clientId,
      redirect_uri: redirectUri,
      type: 'auth_code',
    };

    // Sign code using private key (expires in 5 minutes)
    const code = jwt.sign(codePayload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: '5m',
      keyid: this.kid,
    });

    // Redirect back to Planka callback
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', code);
    if (state) {
      callbackUrl.searchParams.set('state', state);
    }

    return res.redirect(callbackUrl.toString());
  }

  // 4. Token Exchange Endpoint
  @Public()
  @Post('/oauth/token')
  @HttpCode(HttpStatus.OK)
  async token(
    @Req() req: Request,
    @Res() res: Response
  ) {
    let clientId = req.body.client_id;
    let _clientSecret = req.body.client_secret;
    const code = req.body.code;
    const _redirectUri = req.body.redirect_uri;

    // Parse basic auth if body doesn't contain credentials
    if (!clientId && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Basic ')) {
        const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('ascii');
        const parts = credentials.split(':');
        clientId = parts[0];
        _clientSecret = parts[1];
      }
    }

    if (!code) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'invalid_request', error_description: 'Code is required' });
    }

    try {
      // Verify authorization code
      const decoded = jwt.verify(code, this.publicKey, { algorithms: ['RS256'] }) as any;

      if (decoded.type !== 'auth_code') {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'invalid_grant', error_description: 'Invalid code type' });
      }

      // Fetch user from database to get fresh email and name
      const dbUser = await this.models.user.getUserById(decoded.sub);
      if (!dbUser) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'invalid_grant', error_description: 'User not found' });
      }

      const email = dbUser.email;
      const name = dbUser.name || email.split('@')[0];

      // Sign id_token (JWT valid for 1 hour)
      const issuer = `${req.protocol}://${req.get('host')}`;
      const idTokenPayload = {
        iss: issuer,
        sub: dbUser.id,
        aud: decoded.client_id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email,
        name,
        username: dbUser.name || email.split('@')[0],
      };

      const id_token = jwt.sign(idTokenPayload, this.privateKey, {
        algorithm: 'RS256',
        keyid: this.kid,
      });

      // Sign access_token (JWT valid for 1 hour)
      const accessTokenPayload = {
        sub: dbUser.id,
        client_id: decoded.client_id,
        type: 'access_token',
      };

      const access_token = jwt.sign(accessTokenPayload, this.privateKey, {
        algorithm: 'RS256',
        expiresIn: '1h',
        keyid: this.kid,
      });

      return res.json({
        access_token,
        token_type: 'Bearer',
        expires_in: 3600,
        id_token,
      });
    } catch {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'invalid_grant', error_description: 'Code verification failed' });
    }
  }

  // 5. Userinfo Claims Endpoint
  @Public()
  @Get('/oauth/userinfo')
  async userinfo(@Req() req: Request, @Res() res: Response) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'invalid_token' });
    }

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, this.publicKey, { algorithms: ['RS256'] }) as any;
      if (decoded.type !== 'access_token') {
        return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'invalid_token' });
      }

      const dbUser = await this.models.user.getUserById(decoded.sub);
      if (!dbUser) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'invalid_token' });
      }

      const email = dbUser.email;
      const name = dbUser.name || email.split('@')[0];

      return res.json({
        sub: dbUser.id,
        email,
        name,
        username: dbUser.name || email.split('@')[0],
      });
    } catch {
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'invalid_token' });
    }
  }
}
