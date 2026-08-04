import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'BetterIntra',
  tagline: 'Developer documentation for the BetterIntra API',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.betterintra.local',
  baseUrl: '/',

  organizationName: 'byronlove111',
  projectName: 'better-intra',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../../docs/dev',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/byronlove111/better-intra/tree/main/docs/dev/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'BetterIntra',
      logo: {
        alt: 'BetterIntra',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'devSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'http://localhost:8000/docs',
          label: 'Swagger',
          position: 'right',
        },
        {
          href: 'https://github.com/byronlove111/better-intra',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Getting started', to: '/getting-started'},
            {label: 'Frontend cookbook', to: '/frontend-cookbook'},
            {label: 'Architecture', to: '/architecture'},
          ],
        },
        {
          title: 'API',
          items: [
            {label: 'Swagger (local)', href: 'http://localhost:8000/docs'},
            {label: 'Auth', to: '/auth'},
            {label: 'Chat & realtime', to: '/chat-realtime'},
          ],
        },
        {
          title: 'Repo',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/byronlove111/better-intra',
            },
            {
              label: 'Cahier des charges',
              href: 'https://github.com/byronlove111/better-intra/blob/main/docs/cahier-des-charges.md',
            },
          ],
        },
      ],
      copyright: `BetterIntra · docs built with Docusaurus · ${new Date().getFullYear()}`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'http', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
