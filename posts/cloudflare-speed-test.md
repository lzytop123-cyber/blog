# Cloudflare IP 优选实战：博客访问加速

> 2026-06-20 | 标签：Cloudflare、优化、测速

用 CloudflareSpeedTest 挑最快 IP，写到 hosts，博客打开更快。

---

## 背景

博客 `islandspace.xyz` 走 Cloudflare Tunnel，虽然免费 HTTPS，但 CF 国内节点质量参差不齐——有的延迟 300ms+，有的不到 100ms。

这个工具批量测 CF 所有 IP，找出最快的。

---

## 工具信息

| | |
|---|---|
| 项目 | [XIU2/CloudflareSpeedTest](https://github.com/XIU2/CloudflareSpeedTest) |
| 语言 | Go |
| ⭐ | 27k+ |
| 原理 | 对 CF IP 段逐一测延迟和下载速度 |

---

## 安装

```bash
# 下载预编译二进制
wget https://github.com/XIU2/CloudflareSpeedTest/releases/download/v2.2.5/CloudflareST_linux_amd64.tar.gz
tar -xzf CloudflareST_linux_amd64.tar.gz
```

解压后得到：
- `CloudflareST` — 主程序
- `ip.txt` — CF IPv4 地址段
- `ipv6.txt` — CF IPv6 地址段

---

## 测速

```bash
./CloudflareST -n 200 -t 4 -tl 200 -sl 5 -o result.csv
```

| 参数 | 含义 |
|---|---|
| `-n 200` | 测 200 个 IP |
| `-t 4` | 4 线程并发 |
| `-tl 200` | 延迟超过 200ms 的丢弃 |
| `-sl 5` | 速度低于 5 MB/s 的丢弃 |
| `-o result.csv` | 结果导出 CSV |

跑完约 2 分钟。

---

## 结果

测了 200 个 CF IP，Top 10：

| IP | 延迟 | 速度 |
|---|---|---|
| **104.20.49.131** | 179ms | 1.28 MB/s |
| 104.21.21.241 | 199ms | 1.13 MB/s |
| 104.20.56.231 | 162ms | 0.87 MB/s |
| 104.20.54.84 | 162ms | 0.68 MB/s |
| 104.17.127.115 | 122ms | 0.23 MB/s |
| 104.17.116.10 | 113ms | 0.16 MB/s |
| 104.16.245.243 | 94ms | 0.16 MB/s |
| 104.17.17.120 | 82ms | 0.14 MB/s |
| 104.17.124.14 | 108ms | 0.13 MB/s |
| 104.17.51.165 | 92ms | 0.13 MB/s |

::: tip 观察
- **104.17.x.x** 段延迟低（82-122ms），速度一般
- **104.20.x.x** 段速度快（0.87-1.28 MB/s），延迟高些
- 综合最快：**104.20.49.131**
:::

---

## 应用

把最快 IP 写入 `/etc/hosts`，绕过 DNS 直接走这个 IP：

```bash
echo "104.20.49.131 islandspace.xyz www.islandspace.xyz" | sudo tee -a /etc/hosts
```

### 效果对比

| | 优化前 | 优化后 |
|---|---|---|
| DNS 解析 | 随机 CF IP | 固定最快 IP |
| 延迟 | 不定（可能 300ms+） | 179ms |
| 首页加载 | 可能 2-5s | ~1.7s |

---

## 适用场景

- ✅ Cloudflare 免费用户，节点质量不稳
- ✅ 国内访问境外 CF 站点
- ✅ VitePress / Hexo / Hugo 等静态博客
- ❌ 不适用：已用 CDN 优选服务的（如又拍云、阿里 CDN）

---

## 定期更新

Cloudflare IP 速度会变，建议每周跑一次：

```bash
# crontab 每周日凌晨 3 点
0 3 * * 0 cd /path/to/CloudflareST && ./CloudflareST -n 200 -o result.csv
```

结果发到 Telegram 或自动更新 hosts。

---

## 踩坑

- **Go 没装**：别编译，直接下预编译二进制
- **snap 太慢**：Ubuntu snap 装 Go 比直接 wget 慢 10 倍
- **hosts 不生效**：`sudo systemctl restart systemd-resolved`

---

<GiscusComments />
