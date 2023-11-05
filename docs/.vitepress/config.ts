import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Joey's blog",

  ignoreDeadLinks: true,
  // base: '/',
  // srcDir: 'src',
  // cleanUrls: true,
  // lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],

    logo: "/portrait.jpg",

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'TextView', link: '/TextView' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Joeljt' }
    ],
    footer: {
      copyright: 'Copyright © 2020-PRESENT Joseph_L',
    },
  }
})
