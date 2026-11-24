import { defineCollection } from 'astro:content';
import { docsLoader, docsSchema } from '@prosefly/astro-theme-lotus/content';

const docs = defineCollection({
  loader: docsLoader({ pattern: '**/*.mdx' }),
  schema: docsSchema(),
});

export const collections = { docs };
