# VitePress 搭建笔记

> 2025-06-19  |  标签：VitePress、博客

## 为什么选 VitePress

我是前端，熟 Vue3 + Vite。VitePress 就是把这套技术栈拿来写博客：

- Markdown 写内容，零学习成本
- `.vitepress/config.ts` 配置，跟 vue-router 一样
- Markdown 里直接写 Vue 组件

## 搭建步骤

```bash
mkdir blog && cd blog
npm init -y
npm install vitepress vue
```

```ts
// .vitepress/config.ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "哲宇的博客",
  lang: "zh-CN",
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "文章", link: "/posts/" }
    ]
  }
})
```

```json
// package.json 加脚本
{
  "scripts": {
    "dev": "vitepress dev",
    "build": "vitepress build",
    "preview": "vitepress preview"
  }
}
```

## 遇到的问题

暂无，搭建过程很顺利。

## 下一步

接入 Cloudflare Tunnel 外网访问，再加 GitHub Pages 自动部署。
