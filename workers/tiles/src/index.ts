import { createApp } from './app';
import type { Env, ExecutionContext } from './types';

const handle = createApp();

// The Workers runtime requires a default export.
export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> =>
    handle(request, env, ctx),
};
