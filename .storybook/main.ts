import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: '@storybook/react-vite',
  core: { disableTelemetry: true },
  // Storybook loads vite.config.ts, which carries the installable app's
  // plugin. Stories are not an app: no worker, no manifest, and the precache
  // step would look for a build manifest Storybook never writes.
  viteFinal(config) {
    const isPwa = (p: unknown) =>
      !!p &&
      typeof p === 'object' &&
      'name' in p &&
      /^(vite-plugin-pwa|para:contribute-worker)/.test(String(p.name));
    config.plugins = (config.plugins ?? []).flat().filter((p) => !isPwa(p));
    // No Turnstile key in stories: the build would read the live one from .env.production, which
    // Cloudflare refuses off Para's own hostnames, and the forms that wait for its token would never
    // send. A story that shows the widget passes its own key (turnstile.stories.tsx).
    config.define = { ...config.define, 'import.meta.env.VITE_TURNSTILE_SITE_KEY': 'undefined' };
    return config;
  },
};

export default config;
