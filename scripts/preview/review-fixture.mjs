import { createHmac } from 'node:crypto';

export const PREVIEW_USER_ID = '00000000-0000-0000-0000-0000000000e1';
// Public demo credential for a disposable database; never used by deployed ParaPo.
export const PREVIEW_JWT_SECRET = 'parapo-isolated-preview-only-signing-key-2026';
export function previewToken(role = 'authenticated') {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload = {
    role,
    aud: 'authenticated',
    sub: PREVIEW_USER_ID,
    email: 'preview@parapo.test',
    exp: Math.floor(Date.now() / 1000) + 86400,
  };
  const header = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`;
  return `${header}.${createHmac('sha256', PREVIEW_JWT_SECRET).update(header).digest('base64url')}`;
}
export function previewSession() {
  return {
    access_token: previewToken(),
    refresh_token: 'isolated-preview',
    token_type: 'bearer',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: {
      id: PREVIEW_USER_ID,
      email: 'preview@parapo.test',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: '2026-10-18T00:00:00Z',
    },
  };
}
