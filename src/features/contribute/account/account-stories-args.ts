import { fn } from 'storybook/test';

import type { Captcha } from './use-captcha';

/** A bot check that has nothing to ask, so a story needs no Cloudflare script. */
export const NO_CAPTCHA: Captcha = {
  siteKey: null,
  round: 0,
  onToken: fn(),
  needsTap: false,
  onNeedsTap: fn(),
  isReady: true,
  takeToken: () => undefined,
};
