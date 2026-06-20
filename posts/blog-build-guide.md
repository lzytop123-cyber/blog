# 博客搭建全记录：VitePress + Cloudflare Tunnel + Giscus

> 2026-06-20 | 标签：VitePress、Cloudflare、GitHub、部署

从零到上线，一个前端用 VitePress 搭建个人技术博客的全过程。

---

## 技术选型

| 方案 | 选它 | 弃它 |
|---|---|---|
| **VitePress** | Vue3 + Vite 生态，Markdown 写文章，零学习成本 | Hexo — 模板不熟，定制受限 |
| **Cloudflare Tunnel** | 免费内网穿透，自带 HTTPS，域名绑定 | Nginx 反向代理 — 还要搞 SSL |
| **Giscus** | 基于 GitHub Discussions 的评论系统，无数据库 | Disqus — 广告多、加载慢 |
| **.xyz 域名** | 便宜、好记 | .top — 微信拦截风险 |

---

## 搭建步骤

### 1. 初始化 VitePress

```bash
mkdir blog && cd blog
npm init -y
npm install vitepress vue
```

在 `package.json` 加脚本：

```json
{
  "scripts": {
    "dev": "vitepress dev",
    "build": "vitepress build",
    "preview": "vitepress preview"
  }
}
```

### 2. 配置文件

`.vitepress/config.ts`：

```ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "哲宇的博客",
  description: "前端工程师 → AI Agent 开发",
  lang: "zh-CN",
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
            { text: "第一篇文章", link: "/posts/first" }
          ]
        }
      ]
    },
    search: {
      provider: "local"  // 本地搜索，无需数据库
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/lzytop123-cyber" }
    ]
  }
})
```

### 3. 写文章

文章放 `posts/` 目录，Markdown 格式。示例 `posts/first.md`：

```md
# 文章标题

> 日期 | 标签

内容...
```

`npm run dev` 启动本地预览 → `http://localhost:5173`

---

## 外网访问：Cloudflare Tunnel

### 为什么不用 GitHub Pages？

- GitHub Pages 部署要等 CI，改动不能秒生效
- Cloudflare Tunnel 直接穿透到本地开发服务器，改完即刷新

### 购买域名

在 [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) 购买 `islandspace.xyz`（¥7/年），自动管理 DNS。

### 创建 Tunnel

```bash
# 安装 cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
mv cloudflared ~/.local/bin/

# 登录 Cloudflare
cloudflared tunnel login

# 创建 tunnel
cloudflared tunnel create blog

# 绑定域名 → 本地端口
cloudflared tunnel route dns blog islandspace.xyz

# 启动
cloudflared tunnel run blog
```

配置文件 `~/.cloudflared/config-blog.yml`：

```yaml
tunnel: <tunnel-id>
credentials-file: /home/ubuntu/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: islandspace.xyz
    service: http://localhost:5173
  - service: http_status:404
```

启动后 `https://islandspace.xyz` 直接访问博客，CF 自动签发 SSL 证书。

---

## 代码托管：GitHub

```bash
cd blog
git init
git add -A
git commit -m "init blog"

# 在 GitHub 创建空仓库 blog，然后推送
git remote add origin https://github.com/lzytop123-cyber/blog.git
git push -u origin main
```

::: tip Token 认证
用 **Classic Token**（`ghp_` 开头），勾选 `repo` 权限。Fine-grained token 权限不够。
:::

---

## 评论系统：Giscus

### 1. 开 GitHub Discussions

仓库 Settings → General → Features → 勾选 **Discussions**

### 2. 安装 Giscus App

访问 [github.com/apps/giscus](https://github.com/apps/giscus) → Install → 选 `lzytop123-cyber/blog`

### 3. 获取配置

去 [giscus.app](https://giscus.app) 填仓库信息，得到 `data-repo-id` 和 `data-category-id`

### 4. 集成到 VitePress

创建 `.vitepress/theme/GiscusComments.vue`：

```vue
<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.setAttribute('data-repo', 'lzytop123-cyber/blog')
  script.setAttribute('data-repo-id', 'R_kgDOTAGdWw')
  script.setAttribute('data-category', 'Announcements')
  script.setAttribute('data-category-id', 'DIC_kwDOTAGdW84C_iFO')
  script.setAttribute('data-mapping', 'pathname')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-input-position', 'bottom')
  script.setAttribute('data-theme', 'preferred_color_scheme')
  script.setAttribute('data-lang', 'zh-CN')
  script.crossOrigin = 'anonymous'
  script.async = true
  document.getElementById('giscus-container')?.appendChild(script)
})
</script>

<template>
  <div class="giscus-wrapper">
    <div id="giscus-container"></div>
  </div>
</template>
```

注册全局组件 `.vitepress/theme/index.ts`：

```ts
import DefaultTheme from 'vitepress/theme'
import GiscusComments from './GiscusComments.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('GiscusComments', GiscusComments)
  }
}
```

文章中加一行引入评论：

```md
<GiscusComments />
```

---

## 踩坑记录

- **useData 报错**：自定义 Layout 里调 `useData()` 会报 `vitepress data not properly injected`。改用全局组件 + `enhanceApp` 模式解决。
- **Vite 拦截外网域名**：需在 `config.ts` 加 `allowedHosts` 白名单：`['islandspace.xyz']`
- **cf tunnel H2C error**：`npm run dev` 被杀后 tunnel 返回 502，重启 VitePress 即可。
- **GitHub push 认证失败**：必须用 Classic Token，不能用 Fine-grained token。

---

## 部署架构

```
用户浏览器
    │
    ▼
https://islandspace.xyz  ← Cloudflare（HTTPS + CDN）
    │
    ▼
Cloudflare Tunnel
    │
    ▼
localhost:5173  ← VitePress dev server（Ubuntu 服务器）
    │
    ▼
GitHub Discussions  ← Giscus 评论
```

---

## 总结

花了一下午，从零到上线：

- 💰 **花费**：域名 ¥7/年，其余全免费
- ⚡ **速度**：改 Markdown 即刷新，零等待
- 🔒 **安全**：CF 自动 HTTPS，不需配 Nginx
- 💬 **评论**：Giscus + GitHub，无数据库

<GiscusComments />
