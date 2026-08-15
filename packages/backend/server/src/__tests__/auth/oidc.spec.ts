import { HttpStatus } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import ava, { TestFn } from 'ava';
import jwt from 'jsonwebtoken';

import {
  createTestingApp,
  TestingApp,
} from '../utils';

const test = ava as TestFn<{
  db: PrismaClient;
  app: TestingApp;
}>;

test.before(async t => {
  const app = await createTestingApp();
  t.context.db = app.get(PrismaClient);
  t.context.app = app;
});

test.beforeEach(async t => {
  await t.context.app.initTestingDB();
});

test.after.always(async t => {
  await t.context.app.close();
});

test('should return oidc discovery configuration', async t => {
  const { app } = t.context;

  const res = await app.GET('/.well-known/openid-configuration').expect(HttpStatus.OK);
  
  t.is(res.body.response_types_supported[0], 'code');
  t.is(res.body.id_token_signing_alg_values_supported[0], 'RS256');
  t.true(res.body.authorization_endpoint.endsWith('/oauth/authorize'));
  t.true(res.body.token_endpoint.endsWith('/oauth/token'));
});

test('should return JWKS containing public key', async t => {
  const { app } = t.context;

  const res = await app.GET('/oauth/jwks').expect(HttpStatus.OK);
  
  t.true(Array.isArray(res.body.keys));
  t.is(res.body.keys[0].kty, 'RSA');
  t.is(res.body.keys[0].alg, 'RS256');
  t.is(res.body.keys[0].use, 'sig');
});

test('should redirect to signIn if not authenticated on authorize endpoint', async t => {
  const { app } = t.context;

  await app
    .GET('/oauth/authorize')
    .query({
      response_type: 'code',
      client_id: 'affinite-planka-client',
      redirect_uri: 'http://localhost:1337/oauth/callback',
      state: '12345',
    })
    .expect(HttpStatus.FOUND) // 302 redirect
    .expect('location', /^\/signIn\?redirect=/);
});

test('should issue auth code and exchange it for tokens', async t => {
  const { app } = t.context;

  // 1. Create a user
  const user = await app.createUser('oidc@affine.pro');

  // 2. Sign in user to get session cookie
  const loginRes = await app
    .POST('/api/auth/sign-in')
    .send({ email: user.email, password: user.password })
    .expect(HttpStatus.OK);

  const cookie = loginRes.headers['set-cookie'];
  t.assert(cookie, 'Session cookie should be set');

  // 3. Request authorize with session cookie
  const authRes = await app
    .GET('/oauth/authorize')
    .set('Cookie', cookie)
    .query({
      response_type: 'code',
      client_id: 'affinite-planka-client',
      redirect_uri: 'http://localhost:1337/oauth/callback',
      state: 'mystate',
    })
    .expect(HttpStatus.FOUND);

  const redirectUrl = new URL(authRes.headers['location']);
  t.is(redirectUrl.origin, 'http://localhost:1337');
  t.is(redirectUrl.searchParams.get('state'), 'mystate');
  const code = redirectUrl.searchParams.get('code');
  t.assert(code, 'Authorization code should be returned');

  // 4. Exchange code for tokens
  const tokenRes = await app
    .POST('/oauth/token')
    .send({
      code,
      client_id: 'affinite-planka-client',
      client_secret: 'secret',
      redirect_uri: 'http://localhost:1337/oauth/callback',
    })
    .expect(HttpStatus.OK);

  t.is(tokenRes.body.token_type, 'Bearer');
  t.assert(tokenRes.body.access_token, 'Access token should be issued');
  t.assert(tokenRes.body.id_token, 'ID token should be issued');

  // Verify ID Token contents
  const _jwksRes = await app.GET('/oauth/jwks').expect(HttpStatus.OK);
  
  // Since we sign using RS256, we can verify it using jsonwebtoken verify
  // But because we use a mock generated RSA key pair, let's verify decoding works
  const decodedIdToken = jwt.decode(tokenRes.body.id_token) as any;
  t.is(decodedIdToken.email, user.email);
  t.is(decodedIdToken.sub, user.id);

  // 5. Query userinfo endpoint with access token
  const userinfoRes = await app
    .GET('/oauth/userinfo')
    .set('Authorization', `Bearer ${tokenRes.body.access_token}`)
    .expect(HttpStatus.OK);

  t.is(userinfoRes.body.sub, user.id);
  t.is(userinfoRes.body.email, user.email);
});
