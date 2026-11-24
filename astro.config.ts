import { defineConfig } from 'astro/config';
import lotus from '@prosefly/astro-theme-lotus';

export default defineConfig({
  integrations: [
    lotus({
      components: {
        PageHeader: './src/components/lotus/PageHeader.astro',
      },
    }),
  ],
});
