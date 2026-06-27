# 服务器仪表盘踩坑记：Homepage + Cloudflare 全家桶

> 2026-06-20 | 标签：Homepage、Cloudflare、Docker、Next.js、踩坑

搭了个服务器仪表盘 `dash.islandspace.xyz`，以为半小时搞定，结果踩了一整天坑。记录一下，下次别犯。

---

## 架构

```
dash.islandspace.xyz
    → Cloudflare CDN
    → Cloudflare Tunnel (blog tunnel)
    → Node.js proxy :3001 (剥缓存头)
    → Next.js :3000 (next start)
    → Docker socket (容器监控)
```

---

## 坑 1：页面无限循环刷新

**现象**：打开页面一直在刷，硬刷新也不行。

**根因链**：
1. `next build` 用了 `output: "standalone"` 模式
2. standalone 构建**不复制** `.next/static/` 到 standalone 目录
3. 浏览器加载 JS 全部 404
4. React 报错 → 触发重载 → 循环

**解决**：去掉 `output: "standalone"`，用 `next start` 启动。

---

## 坑 2：Cloudflare 缓存旧 HTML

**现象**：页面刷新但 JS 报 404，Build ID 对不上。

**根因**：SSG 页面响应头 `s-maxage=31536000`（一年），Cloudflare 缓存了旧版 HTML，里面引用的 JS 文件早已被新构建替换。

**解决**：
- `next.config.js` 加 `expireTime: 0`
- 写了个 Node.js 代理 `proxy.js`，剥离 HTML 响应的 `Cache-Control` 头
- Cloudflare 不再缓存 → `cf-cache-status: DYNAMIC`

```js
// proxy.js 核心逻辑
const isHtml = (headers['content-type'] || '').includes('html');
if (isHtml) {
  delete headers['cache-control'];
}
```

---

## 坑 3：ICMP Ping 永远 Down

**现象**：Ping 监控三个服务全部显示 Down。

**根因**：Cloudflare CDN **不响应 ICMP**，ping 包到不了源站。这是 Cloudflare 天生限制，不是 bug。

**解决**：换成 `siteMonitor`，走 HTTP HEAD 请求检测存活，完整穿过 Cloudflare → Tunnel → 本地链。

```yaml
# services.yaml
- 网站:
    - 博客:
        href: https://islandspace.xyz
        siteMonitor: https://islandspace.xyz  # 替换 ping: true
```

---

## 坑 4：Docker 监控显示 SHA

**现象**：Docker 组件显示容器 ID 哈希，不显示名称。

**根因**：容器没有 `homepage.*` 标签，Homepage 无法识别。

**解决**：
```bash
docker run -d \
  --name nginx-proxy \
  -l homepage.group=基础设施 \
  -l homepage.name=Nginx \
  -l homepage.icon=nginx.png \
  -l homepage.href=https://islandspace.xyz \
  -l homepage.description=反向代理 \
  --add-host host.docker.internal:host-gateway \
  nginx:alpine
```

注意：`host.docker.internal` 在新容器里解析不了，必须加 `--add-host`。

---

## 坑 5：配置路径不对

**现象**：改了 `services.yaml` 但不生效。

**根因**：`next start` 从 `$CWD/config/` 读配置，不是 `~/homepage/config/`。两个目录各有一套文件。

**解决**：统一用 `/tmp/homepage/config/`，源目录改完就 `cp` 过去。

---

## 坑 6：浏览器扩展火上浇油

**现象**：所有后端问题修完，还在偶尔刷新。

**根因**：淘宝/1688 扩展（`FloatingAssistant`、`批量铺货组件`）注入脚本，与 React 冲突。

**解决**：无痕模式打开测试，确认不是后端问题就不用管。

---

## 部署流程（踩完这些坑后的标准流程）

### 1. 克隆 + 装依赖

```bash
git clone https://github.com/gethomepage/homepage.git /tmp/homepage
cd /tmp/homepage
npm install
```

### 2. 写配置

三个文件都在 `config/` 目录下：

**`settings.yaml`** — 标题、语言、主题等：
```yaml
title: 哲宇的服务器
language: zh-CN
```

**`services.yaml`** — 服务监控（注意：Ping 替换为 siteMonitor）：
```yaml
- 服务:
    - 博客:
        icon: /icons/vitepress.png
        href: https://islandspace.xyz
        type: siteMonitor
        url: https://islandspace.xyz
    - 仪表盘:
        icon: /icons/homepage.png
        href: https://dash.islandspace.xyz
        type: siteMonitor
        url: https://dash.islandspace.xyz
    - 文件共享:
        icon: /icons/files.png
        href: https://chicken-mill-immediate-cute.trycloudflare.com
        type: siteMonitor
        url: https://chicken-mill-immediate-cute.trycloudflare.com
```

**`widgets.yaml`** — 页面组件：
```yaml
- resources:
    cpu: true
    memory: true
    disk: /
- search:
    provider: google
- docker:
    socket: /var/run/docker.sock
```

### 3. 导入图标

把自定义图标放到 `public/icons/`：

```bash
mkdir -p /tmp/homepage/public/icons
cp ~/homepage/icons/*.png /tmp/homepage/public/icons/
```

### 4. 构建

```bash
cd /tmp/homepage
npx next build
```

注意：**不要**用 `output: "standalone"`，后面直接用 `next start`。

### 5. 启动 Next.js

```bash
cd /tmp/homepage
HOMEPAGE_ALLOWED_HOSTS=dash.islandspace.xyz,localhost:3000 \
npx next start -p 3000
```

### 6. 代理剥缓存头（关键！）

Cloudflare 会缓存 SSG 页面的 `s-maxage`，必须用代理剥离：

`proxy.js`：
```js
const http = require('http');

const TARGET = { hostname: 'localhost', port: 3000 };

const server = http.createServer((clientReq, clientRes) => {
  const opts = {
    hostname: TARGET.hostname,
    port: TARGET.port,
    path: clientReq.url,
    method: clientReq.method,
    headers: { ...clientReq.headers, host: 'dash.islandspace.xyz' }
  };

  const proxyReq = http.request(opts, (proxiedRes) => {
    const isHtml = (proxiedRes.headers['content-type'] || '').includes('html');
    if (isHtml) delete proxiedRes.headers['cache-control'];

    clientRes.writeHead(proxiedRes.statusCode, proxiedRes.headers);
    proxiedRes.pipe(clientRes);
  });

  clientReq.pipe(proxyReq);
});

server.listen(3001, () => console.log('Proxy :3001 → :3000'));
```

启动：`node proxy.js &`

### 7. 配 Cloudflare Tunnel

```bash
cloudflared tunnel route dns <tunnel-name> dash.islandspace.xyz
cloudflared tunnel run <tunnel-name>
```

隧道配置 (`~/.cloudflared/config.yml`)：
```yaml
tunnel: <tunnel-id>
credentials-file: /home/ubuntu/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: dash.islandspace.xyz
    service: http://localhost:3001   # 指到代理，不指 Next.js
  - service: http_status:404
```

### 8. 验证

```bash
# 确认链路上每个环节都通
curl -sI http://localhost:3000 | head -1          # Next.js
curl -sI http://localhost:3001 | head -1          # Proxy
curl -sI https://dash.islandspace.xyz | head -1   # 外网
```

检查 Cloudflare 缓存状态应为 `DYNAMIC`：
```bash
curl -sI https://dash.islandspace.xyz | grep cf-cache-status
# → cf-cache-status: DYNAMIC
```

### 最终架构

```
dash.islandspace.xyz
  → Cloudflare (橙色云朵)
  → Cloudflare Tunnel
  → proxy.js :3001 (剥 Cache-Control)
  → next start :3000
```

---

## 最终效果

| 组件 | 状态 |
|---|---|
| CPU / 内存 / 磁盘 | ✅ 实时数据 |
| 搜索栏 | ✅ Google 搜索 |
| Docker 监控 | ✅ Nginx running |
| HTTP 存活检测 | ✅ 博客/仪表盘/文件共享 200 OK |

---

## 教训

1. **Next.js standalone ≠ 省心**。静态文件不自动复制，不如 `next start`
2. **Cloudflare 前面先想缓存**。SSG 页面的 `s-maxage` 是定时炸弹
3. **ICMP 监控在 CDN 后面废了**，用 HTTP 检测代替
4. **Docker 标签是给 Homepage 看的**，不给标签就不认
5. **配置文件路径要对**，两个 config 目录各管各的
