# 围棋闯关 · 上线部署报告

> 生成日期：2026-08-01
> 项目路径：`D:/online-go.com-main/go-game`
> 目标平台：腾讯 EdgeOne Pages（首选） / Cloudflare Pages（备选）

---

## 一、项目概况

| 项目 | 值 |
| --- | --- |
| 名称 | 围棋闯关（go-game） |
| 类型 | 单页应用（SPA），纯静态，无后端 |
| 技术栈 | React 19 + TypeScript 5.9 + Vite 7 |
| 关卡规模 | 3563 关 / 7 章（青铜 → 王者） |
| 棋盘引擎 | goban（vendored in `src/vendor/goban/`） |
| 持久化 | localStorage（进度、语言、音效、BGM） |
| 路由方式 | 内存 view 状态机 + `location.hash`（`#level=...`） |
| 音频 | Web Audio API 实时合成（无音频文件） |

**关键事实**：
- 没有使用 history 路由，所有 URL 都落在 `/`，**不需要任何 SPA fallback 重写规则**。
- 没有服务端接口、没有环境变量、没有鉴权。
- 构建产物可直接丢到任意静态文件服务器。

---

## 二、上线前检查结果

| 检查项 | 命令 / 方法 | 结果 |
| --- | --- | --- |
| TypeScript 类型检查 | `npx tsc --noEmit --skipLibCheck` | ✅ 0 错误 |
| 生产构建 | `npx vite build` | ✅ 成功，2.64 s |
| Dev server 启动 | `curl http://localhost:5173/` | ✅ 200 |
| 世界地图加载 | Playwright 快照 | ✅ 7 章卡片、3563 关、总星数 |
| 章节 → 关卡 → 棋盘 | Playwright 点击链路 | ✅ 棋盘 canvas 550×550 正常渲染 |
| 浏览器控制台 | `console.messages(level=error)` | ✅ 0 错误 / 0 警告 |
| 设置面板 | 齿轮按钮 | ✅ 语言、音效、BGM、重置进度 |
| 过关反馈 | 通关后 | ✅ 绿色 `+points` 弹出，1 秒自动进入下一关 |
| BGM 自动启动 | 首次 pointerdown | ✅ 已修复（之前只创建 ctx 未 start） |

### 构建产物体积

```
dist/
├── favicon.svg                   0.28 KB
├── index.html                    0.53 KB │ gzip 0.35 KB
└── assets/
    ├── index-*.css              10.96 KB │ gzip 3.03 KB
    ├── index-*.js             2271.67 KB │ gzip 362.00 KB
    └── index-*.js.map         6221.04 KB
```

**体积说明**：JS 包 2.27 MB（gzip 362 KB）较大，原因是 3563 关数据 + goban 引擎一次性打进主包。
属于一次性下载，加载后完全离线可用，对小游戏可接受。
若后续需要优化，可用 `dynamic import()` 按章节拆分（非上线阻塞项）。

Source map 文件默认不会被浏览器加载（只有打开 devtools 才请求），可上传可不上传，不影响运行。

---

## 三、部署方案对比

| 维度 | EdgeOne Pages（首选） | Cloudflare Pages（备选） |
| --- | --- | --- |
| 国内访问速度 | ✅ 腾讯全球边缘节点，国内速度好 | ⚠️ 国内访问经常被干扰、延迟高 |
| 海外访问 | ✅ 有全球节点 | ✅ 全球节点最快 |
| 价格 | 免费额度对本项目完全够用 | 无限带宽、500 次构建/月，免费 |
| 接入方式 | Git 直连 / CLI / GitHub Actions | Git 直连 / Wrangler CLI |
| 自动 HTTPS | ✅ | ✅ |
| 自定义域名 | ✅ | ✅ |
| SPA fallback | 本项目不需要 | 本项目不需要 |
| 推荐场景 | **目标用户主要在国内** | 海外用户为主或已有 Cloudflare 账号 |

**结论**：本项目是面向中文围棋学习者的产品，用户主要在中国大陆，**选择 EdgeOne Pages**。

---

## 四、EdgeOne Pages 部署流程

提供三种方式，**任选其一**。首次上线推荐方式 A（CLI 直传，最快验证），正式迭代用方式 B（Git 自动部署）。

### 方式 A：CLI 一键上传（推荐首次上线，5 分钟）

无需 Git，无需配置仓库，直接把本地 `dist/` 推上去。

**步骤：**

1. **安装 CLI**（一次性）
   ```bash
   npm install -g edgeone
   ```

2. **登录授权**
   ```bash
   edgeone login
   ```
   浏览器会打开腾讯云授权页，扫码或登录后自动回调。如果没有腾讯云账号需先注册（实名认证按页面提示）。

3. **构建**
   ```bash
   cd D:/online-go.com-main/go-game
   npm run build
   ```
   确认 `dist/` 目录已生成。

4. **部署**
   ```bash
   edgeone makers deploy dist -n go-game
   ```
   `-n go-game` 是项目名（可自定义，全局唯一）。CLI 会创建项目并上传。

5. **拿到地址**
   部署成功后终端输出形如：
   ```
   EDGEONE_DEPLOY_URL=https://go-game.edgeone.app
   ```
   浏览器打开即可。

6. **后续更新**
   改完代码后重复步骤 3、4 即可。

---

### 方式 B：Git 仓库直连（推荐正式迭代）

每次 `git push` 自动构建部署，免手动。

**步骤：**

1. 把项目推到 GitHub / Gitee / GitLab / Bitbucket：
   ```bash
   cd D:/online-go.com-main/go-game
   git init
   git add .
   git commit -m "initial: go-game ready for launch"
   git branch -M main
   git remote add origin <你的仓库地址>
   git push -u origin main
   ```

   注意：`.gitignore` 应包含：
   ```
   node_modules
   dist
   .playwright-mcp
   *.log
   ```

2. 登录 [EdgeOne 控制台](https://console.tencentcloud.com/edgeone/makers)。

3. 点击 **新建项目 → 导入 Git 仓库**，授权对应平台，选择刚推的仓库。

4. 在构建设置中填写：
   | 字段 | 值 |
   | --- | --- |
   | 框架预设 | Vite |
   | 安装命令 | `npm install` |
   | 构建命令 | `npm run build` |
   | 输出目录 | `dist` |
   | Node 版本 | 18 或 22 |

5. 保存，平台自动开始首次构建。1～2 分钟后给出 `xxx.edgeone.app` 域名。

6. 后续任何 `git push origin main` 都会自动重新构建部署。PR 也会自动生成预览链接。

---

### 方式 C：GitHub Actions（已有 GitHub 仓库时）

如果仓库已经在 GitHub，且希望把 EdgeOne 部署纳入自己的 CI：

1. 在 EdgeOne 控制台生成一个 API Token（项目设置 → API Token）。

2. 在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 添加：
   - Name: `EDGEONE_API_TOKEN`
   - Value: 刚复制的 Token

3. 在项目中创建文件 `.github/workflows/deploy.yml`：
   ```yaml
   name: Build and Deploy to EdgeOne

   on:
     push:
       branches: [main]

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '22'

         - name: Install dependencies
           run: npm ci

         - name: Build
           run: npm run build

         - name: Deploy to EdgeOne Pages
           run: npx edgeone makers deploy dist -n go-game -t ${{ secrets.EDGEONE_API_TOKEN }}
   ```

4. 提交并 push，Actions 自动构建并上传。

---

### 绑定自定义域名（可选）

1. 在 EdgeOne 控制台 → 项目设置 → **自定义域名** → 添加域名，例如 `game.yourdomain.com`。
2. 按提示到域名 DNS 服务商添加一条 CNAME：
   ```
   game.yourdomain.com  CNAME  <edgeone 提供的接入域名>
   ```
3. 验证通过后 EdgeOne 自动签发 HTTPS 证书，等 1～5 分钟即可用 `https://game.yourdomain.com` 访问。

---

## 五、Cloudflare Pages 备选流程（若 EdgeOne 不可用）

仅在 EdgeOne 注册 / 支付 / 访问受限的情况下使用。

### 方式 A：Git 直连（推荐）

1. 项目推到 GitHub（步骤同 EdgeOne 方式 B）。
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages → Create → Pages → Connect to Git**。
3. 选择仓库，构建设置：
   | 字段 | 值 |
   | --- | --- |
   | Framework preset | **Vite** |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Node version | 22（环境变量 `NODE_VERSION=22`） |
4. 保存并部署，拿到 `https://<project>.pages.dev`。
5. 自定义域名在 Pages 项目 → Custom domains 添加。

### 方式 B：Wrangler CLI 直传

```bash
npm install -g wrangler
wrangler login
cd D:/online-go.com-main/go-game
npm run build
wrangler pages deploy dist --project-name=go-game
```

### SPA 路由说明

本项目用 hash 路由（`/#level=...`），Cloudflare 不会对带 hash 的请求做服务端路由匹配，所有请求都命中 `/` 返回 `index.html`，**不需要添加 `_redirects` 文件或 `not_found_handling` 配置**。如果以后改用 BrowserRouter，再在 `dist/` 放：
```
/*  /index.html  200
```

---

## 六、上线后自检清单

部署成功后，在浏览器打开线上地址，按顺序确认：

- [ ] 页面正常加载，标题为"围棋闯关"，favicon 显示
- [ ] 世界地图显示 7 个章节卡片，"青铜"可点击，其余锁定
- [ ] 进入"青铜" → 第 1 关 → 棋盘 canvas 正常渲染
- [ ] 下一手棋（或正确答案），出现绿色 `+xxx` 浮字，约 1 秒后自动跳到下一关
- [ ] 点齿轮 → 切换 English/中文，UI 即时切换
- [ ] 关 BGM 后立即静音，开 BGM 后有 138 BPM 的电子音乐
- [ ] 关音效后落子无声，开音效后恢复
- [ ] 重置进度 → 确认 → 回到世界地图，所有进度归零
- [ ] 刷新页面后停留在世界地图（按设计要求）
- [ ] 在手机浏览器打开，布局自适应、可点落子
- [ ] 断网状态下仍能继续玩（静态资源已缓存，关卡数据在 JS 里）

---

## 七、风险与注意事项

1. **JS 包体积 2.27 MB**：桌面端 gzip 362 KB 可接受；
   移动端 3G 下首屏可能需要 5～10 秒。
   若需优化，按章做 code-split：`const chapter = await import('./chapters/bronze.ts')`，主包可降到 ~400 KB。
   当前阶段不阻塞上线。

2. **localStorage 配额**：单个游戏存档约 100～300 KB（3563 关状态）。
   主流浏览器 5 MB 配额绰绰有余，但 Safari 私密模式下 localStorage 可能被禁用。
   代码中所有 localStorage 写入都包了 try/catch，禁用时游戏仍可玩，只是进度不保存。

3. **AudioContext 自动播放策略**：Chrome / Safari / iOS 都要求用户首次手势后才能启动音频。
   已在 `App.tsx` 用 `pointerdown` / `keydown` once 监听器统一 unlock 音效和 BGM。
   如果用户进页面后一直不操作，BGM 不会响（这是浏览器规范要求，正常现象）。

4. **go-game 不是独立 git 仓库**：目前 `D:/online-go.com-main/go-game/` 在外层仓库里。
   如果要用 Git 方式部署，建议把 `go-game/` 初始化为独立仓库或用 `git subtree push`，
   避免把整个 online-go.com 主仓库（含 submodules）推上去。
   CLI 直传（方式 A）没有这个问题。

5. **EdgeOne 实名认证**：腾讯云 EdgeOne 需要完成实名认证（个人即可，免费）。
   这是中国大陆云服务的统一要求，不是 EdgeOne 独有。
   介意可改用 Cloudflare。

---

## 八、推荐执行路径

1. **现在**：用 EdgeOne CLI（方式 A）首次部署，10 分钟内拿到线上地址。
2. **验证**：用手机和桌面浏览器各过一遍自检清单。
3. **稳定后**：把 `go-game/` 推到 GitHub，切换到 Git 直连（方式 B），获得自动部署能力。
4. **可选**：绑定自定义域名（如 `weiqi.yourdomain.com`）。

---

## 附：常用命令速查

```bash
# 本地开发
npm run dev

# 类型检查
npm run type-check

# 生产构建
npm run build

# 本地预览生产产物
npm run preview

# EdgeOne CLI 登录
edgeone login

# EdgeOne 部署
edgeone makers deploy dist -n go-game

# Cloudflare Wrangler 登录
wrangler login

# Cloudflare 部署
wrangler pages deploy dist --project-name=go-game
```
