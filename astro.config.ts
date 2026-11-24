import { defineConfig } from 'astro/config';
import lotus from '@prosefly/astro-theme-lotus';

// GitHub Pages 项目页：https://canvay.github.io/tvbox_coach/
// base 与主题补丁（patches/@prosefly__astro-theme-lotus.patch）配套，勿单独修改。
export default defineConfig({
  site: 'https://canvay.github.io',
  base: '/tvbox_coach',
  integrations: [
    lotus({
      components: {
        PageHeader: './src/components/lotus/PageHeader.astro',
      },
    }),
  ],
});
