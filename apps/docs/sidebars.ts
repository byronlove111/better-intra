import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  devSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Start here',
      collapsed: false,
      items: ['getting-started', 'architecture', 'frontend-cookbook'],
    },
    {
      type: 'category',
      label: 'API guides',
      collapsed: false,
      items: [
        'auth',
        'users-profiles',
        'friends-presence',
        'intra-proxy',
        'events',
        'public-api',
        'chat-realtime',
        'notifications',
        'analytics',
      ],
    },
  ],
};

export default sidebars;
