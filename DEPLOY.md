# 围棋闯关 · 上线部署报告

> 生成日期：2026-08-01
> 项目路径：`D:/online-go.com-main/go-game`
> 目标平台：腾讯 EdgeOne Pages（首选） / Cloudflare Pages（备选）

---

## 一、项目概况

| 项目 | 值 |
| --- | --- |
| 名称 | 围棋闯关（go-game） |
| 类型 | 单页应用（SPA）+ 可选边缘函数（BOSS AI，`functions/api/ai-move.ts`） |
| 技术栈 | React 19 + TypeScript 5.9 + Vite 7 |
| 关卡规模 | 3564 关 / 8 章（青铜 → 王者 → 终极 BOSS） |
| 棋盘引擎 | goban（vendored in `src/vendor/goban/`） |
| 持久化 | localStorage（进度、语言、音效、BGM） |
| 路由方式 | 内存 view 状态机 + `location.hash`（`#level=...`） |
| 音频 | Web Audio API 实时合成（无音频文件） |

**关键事实**：
- 没有使用 history 路由，所有 URL 都落在 `/`，**不需要任何 SPA fallback 重写规则**。
- 主体是纯静态前端；唯一可选的服务端能力是 **BOSS 关 AI**：`functions/api/ai-move.ts`（Edge Function，调用 DeepSeek 大模型决定 AI 落子），依赖环境变量 `DEEPSEEK_API_KEY`。
- **该 Edge Function 是可选增强**：不部署时，前端自动降级为本地贪心 AI（`src/game/ai/goAI.ts`），关卡照常可玩，只是 AI 较弱。
- 构建产物（`dist/`）本身可直接丢到任意静态文件服务器；若要完整 AI 体验，再单独部署 Functions 目录。

### 环境变量一览（仅部署 BOSS AI 时需要）

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | ✅ | DeepSeek 开放平台的 API Key；缺失时函数返回 503，前端降级为本地贪心 AI |
| `DEEPSEEK_BASE_URL` | 否 | DeepSeek 兼容接口地址，默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 否 | 模型名，默认 `deepseek-flash` |

同一份变量两处使用：**本地开发**放 `.env.local`（`vite.config.ts` 的 dev 中间件读取）；**线上部署（EdgeOne）**把 `cp .env.local .env` 后重新部署即可——CLI 打包器构建时从 `.env` 烘焙进函数产物（见第四节路径 B 第 3 步）。注意 `.env` / `.env.local` **绝不能提交进 Git**（见第四节方式 B 的 `.gitignore`）。

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

   注意：`.gitignore` 应包含（**务必包含 `.env` 系列，防止把 `DEEPSEEK_API_KEY` 提交进仓库**）：
   ```
   node_modules
   dist
   .playwright-mcp
   *.log
   .env
   .env.local
   .env.*.local
   ```
   （`.env.example` 只含变量名不含密钥，可以正常提交。）

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

### 部署 BOSS 关 AI（可选，Edge Function）

`functions/api/ai-move.ts` 是一个 Edge Function：前端 POST 棋盘序列化数据，服务端调用 DeepSeek 大模型，返回 `{ move, react, review, comment }`（落子点 + 表情 + 对玩家落子的点评 + AI 落子理由）。**不部署它不影响游戏运行**——前端自动降级为本地贪心 AI（`src/game/ai/goAI.ts`），只是 AI 较弱、没有毒舌点评。

**同源约束**：前端用同源 `fetch` 调 `/api/ai-move`，所以函数**必须和站点部署在同一个域名下**，不能把函数放在另一个平台。

**本地 vs 生产**：
- 本地开发：`vite.config.ts` 内置 `/api/ai-move` 的 dev 中间件，复用同一个 `onRequest` 逻辑，从 `.env.local` 读密钥。`cp .env.example .env.local` 填好 key 后 `npm run dev` 即有完整 DeepSeek。**该中间件只活在 dev server，部署时不包含。**
- 生产：函数由平台的 Functions 运行时托管。

**平台差异（重要，务必核对）**：当前函数按 **Cloudflare Pages Functions 约定**编写（`functions/` 目录、named export `onRequest({ request, env })`、`env.DEEPSEEK_API_KEY`）。

| 平台 | 目录 | 导出 / 环境变量 | 当前文件是否开箱即用 |
| --- | --- | --- | --- |
| Cloudflare Pages | `functions/` | named `onRequest` + `context.env` | ✅ 是 |
| EdgeOne Pages / Makers | 按官方文档（`edge-functions/` 等） | 以 default export、全局环境变量为主 | ⚠️ 需适配 |

**推荐路径 A：Cloudflare Pages —— 开箱即用，完整 AI 体验**
站点 + `functions/` 一起部署，函数自动路由到 `/api/ai-move`：
1. Git 直连（见第五节方式 A）或 Wrangler 直传：
   ```bash
   npm run build
   wrangler pages deploy dist --project-name=go-game
   ```
   （Wrangler 会从项目根自动识别 `functions/` 目录；`functions/` 在仓库根，不在 `dist/` 里）
2. 控制台 **Settings → Environment variables** 添加 `DEEPSEEK_API_KEY`（及可选的 `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL`）。
3. 重新部署后 `/api/ai-move` 自动可用。

**推荐路径 B：EdgeOne Pages —— 国内速度快，AI 函数需适配（已验证可用）**
1. 静态站按方式 A/B/C 部署即可（只传 `dist/`），BOSS AI 未启用时走本地贪心兜底，可玩。
2. 若要启用 AI 函数：按 [EdgeOne 边缘函数文档](https://edgeone.ai/zh/document/162227908259442688) 适配 `functions/api/ai-move.ts`——目录名、导出方式（default export）与环境变量读取（全局作用域）可能与 Cloudflare 不同，需要相应修改。本项目已在仓库根放好适配版 `edge-functions/api/ai-move.js`，路由到 `/api/ai-move`。
3. **环境变量（关键）**：EdgeOne CLI 的 `edgeone makers env set` 实测不可靠（静默无操作）。**正确做法是把密钥写进仓库根的 `.env` 文件**——CLI 的 edge-functions 打包器在构建时读取 `.env`（不存在才回退 `.env.local`），用 esbuild `define` 把 `env.DEEPSEEK_*` 直接烘焙进函数产物。因此：
   ```bash
   cp .env.local .env   # 或手动写入 DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL / DEEPSEEK_MODEL
   PAGES_SOURCE=skills edgeone makers deploy -n go-game --json
   ```
   注意 `.env` 已被 `.gitignore` 覆盖，不会提交进仓库。
4. 重新部署后 `/api/ai-move` 即可用。

**验证函数是否生效**：进入 BOSS 关落一子，看棋盘上方是否出现「AI 表情 + 点评 + 落子理由」；若只有棋子没有点评，说明 `/api/ai-move` 未生效（走兜底）。

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
- [ ] 世界地图显示 8 个章节卡片（含「王者荣耀」），全部可从世界地图进入
- [ ] 进入"青铜" → 第 1 关 → 棋盘 canvas 正常渲染
- [ ] 下一手棋（或正确答案），出现绿色 `+xxx` 浮字，约 1 秒后自动跳到下一关
- [ ] 点齿轮 → 切换 English/中文，UI 即时切换
- [ ] 关 BGM 后立即静音，开 BGM 后有 138 BPM 的电子音乐
- [ ] 关音效后落子无声，开音效后恢复
- [ ] 重置进度 → 确认 → 回到世界地图，所有进度归零
- [ ] 刷新页面后停留在世界地图（按设计要求）
- [ ] 在手机浏览器打开，布局自适应、可点落子
- [ ] 断网状态下仍能继续玩（静态资源已缓存，关卡数据在 JS 里）
- [ ] 进入「王者荣耀」→ 第一关（7×7）初始即解锁，通关后解锁下一关（9×9→13×13→19×19），互不依赖前 7 章
- [ ] 进入 BOSS 关，黑棋落子后 AI（白）回击
- [ ] 棋盘上方出现「AI 表情 + 点评你的落子 + 落子理由」（毒舌风格）
- [ ] （若已部署 AI 函数）落子响应快、AI 棋形明显更像真人；未部署则本地贪心 AI 兜底可玩

---

## 七、风险与注意事项

1. **JS 包体积 2.27 MB**：桌面端 gzip 362 KB 可接受；
   移动端 3G 下首屏可能需要 5～10 秒。
   若需优化，按章做 code-split：`const chapter = await import('./chapters/bronze.ts')`，主包可降到 ~400 KB。
   当前阶段不阻塞上线。

2. **localStorage 配额**：单个游戏存档约 100～300 KB（3564 关状态）。
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

1. **现在**：用 EdgeOne CLI（方式 A）首次部署，10 分钟内拿到线上地址（BOSS AI 未启用时走兜底，仍可玩）。
2. **验证**：用手机和桌面浏览器各过一遍自检清单。
3. **完整 AI 体验**（二选一）：
   - 想省事：全站迁 **Cloudflare Pages**（站点 + `functions/` + 环境变量一体，函数开箱即用，见第四节路径 A）。
   - 想留在 EdgeOne：按第四节「部署 BOSS 关 AI」路径 B 适配 `edge-functions/` 后启用函数。
4. **稳定后**：把 `go-game/` 推到 GitHub，切换到 Git 直连（方式 B），获得自动部署能力。
5. **可选**：绑定自定义域名（如 `weiqi.yourdomain.com`）。

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
