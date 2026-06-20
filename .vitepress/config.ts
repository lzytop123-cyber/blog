import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "哲宇的博客",
  description: "前端工程师 → AI Agent 开发 · 踩坑记录与解决方案",
  lang: "zh-CN",
  vite: {
    server: {
      allowedHosts: ['.trycloudflare.com', 'islandspace.xyz']
    }
  },
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "文章", link: "/posts/" },
      { text: "关于", link: "/about" }
    ],
    sidebar: {
      "/posts/": [
        {
          text: "文章列表",
          items: [
            { text: "博客搭建全记录", link: "/posts/blog-build-guide" },
            { text: "第一篇文章", link: "/posts/first" }
          ]
        }
      ]
    },
    search: {
      provider: "local"
    },
    socialLinks: [
      { icon: "github", link: "https://github.com" }
    ]
  }
})
