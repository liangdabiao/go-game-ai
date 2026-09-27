# 围棋闯关 · Go Game

> 一个纯前端的单机围棋闯关游戏，从 [online-go.com](https://online-go.com) 的 LearningHub 教程中提取而成。
> 3564 个关卡，8 个章节，从零基础到高阶战术，最后是与大模型 AI 的终极对决。

![status](https://img.shields.io/badge/status-ready%20for%20launch-brightgreen)
![react](https://img.shields.io/badge/React-19-61dafb)
![typescript](https://img.shields.io/badge/TypeScript-5.9-3178c6)
![vite](https://img.shields.io/badge/Vite-7-646cff)
![license](https://img.shields.io/badge/license-AGPLv3-blue)

## 在线试玩

- EdgeOne Pages：<https://go-game.liangdabiao.com/> 

（若地址尚未配置，请参考 [DEPLOY.md](./DEPLOY.md) 自行部署）

## 特性

- **3564 个关卡**，分 8 个章节：青铜 → 白银 → 黄金 → 铂金 → 钻石 → 星耀 → 王者 → **终极 BOSS**
- **四种题型**：棋盘操作题、选择题、终局流程题（停一手 / 数子 / 完成）、**AI 对战**（与大模型对弈，先提 3 子者胜）
- **三星评分**：按错误次数评星，鼓励完美通关
- **世界地图 / 章节 / 关卡**三级导航，进度可视化
- **中文优先**，内置英文切换
- **音效**用 Web Audio API 实时合成，**背景音乐**播放内置 `aaa.mp3`
- **纯静态 SPA**，无后端，localStorage 存档，断网可玩
- **响应式**，桌面与手机浏览器自适应

## 快速开始

环境要求：**Node.js ≥ 18**。

```bash
# 安装依赖
npm install

# 启动开发服务器（http://localhost:5173）
npm run dev

# 类型检查
npm run type-check

# 生产构建
npm run build

# 本地预览生产产物
npm run preview
```

> 注：本项目虽源自一个使用 yarn 的仓库（online-go.com 主仓），但 `go-game/` 子项目独立管理依赖，用 npm 即可。
>
> 想让 BOSS 关的 AI 由 **DeepSeek 大模型**走子：把 `.env.example` 复制为 `.env.local`，填入 `DEEPSEEK_API_KEY`（DeepSeek 开放平台申请），再 `npm run dev`。未配置时 AI 走子降级为本地贪心算法，关卡仍可玩。

## 项目结构

```
go-game/
├── index.html                  # SPA 入口
├── vite.config.ts              # Vite 配置（含 goban 路径别名）
├── tsconfig.json
├── package.json
├── public/
│   ├── favicon.svg             # SVG 棋子图标
│   └── aaa.mp3                 # 背景音乐（循环播放）
├── scripts/                    # 关卡数据抽取与翻译脚本
│   ├── extract-levels.ts       # 从 OGS LearningHub 源码 AST 抽取关卡
│   ├── generate-chapter.ts     # 生成章节 TS 数据
│   └── translate-chapter.ts    # 调用 LLM 翻译中文章节标题
└── src/
    ├── main.tsx                # React 入口
    ├── App.tsx                 # view 状态机：worldmap / chapter / level
    ├── components/
    │   ├── Board/              # 棋盘组件（封装 vendored goban）
    │   ├── ChapterCard.tsx     # 世界地图章节卡片
    │   ├── Fireworks.tsx       # 过关 +points 浮字
    │   ├── LevelTile.tsx       # 关卡格子（锁定/解锁/三星）
    │   ├── SettingsDialog.tsx  # 设置：语言/音效/BGM/重置
    │   ├── StarRow.tsx         # 三星显示
    │   └── TopBar.tsx          # 顶部导航栏
    ├── screens/
    │   ├── WorldMapScreen.tsx
    │   ├── ChapterScreen.tsx
    │   ├── LevelScreen.tsx         # 棋盘操作题
    │   ├── MultipleChoiceScreen.tsx
    │   ├── EndingGameScreen.tsx    # 停一手 / 数子 / 完成
    │   └── AiGameScreen.tsx        # BOSS 关：与 DeepSeek 大模型 AI 对弈
    ├── game/
    │   ├── types.ts            # 核心类型定义
    │   ├── levels.ts           # 关卡索引与查询
    │   ├── progress.ts         # 存档与解锁逻辑（localStorage）
    │   ├── preferences.ts      # 语言 / 音效 / BGM 持久化
    │   ├── audio.ts            # Web Audio 音效合成
    │   ├── bgm.ts              # 背景音乐播放（public/aaa.mp3，默认开）
    │   ├── engine.ts           # 谜题判定引擎（正确/错误点）
    │   ├── moveTree.ts         # move_tree / marks 构造
    │   ├── chapters/           # 8 个章节的关卡数据（7 个自动生成 + BOSS 手写）
    │   └── ai/                 # BOSS 关 AI：规则校验、贪心兜底、DeepSeek 客户端
    └── functions/api/
        └── ai-move.ts          # Edge function：调用 DeepSeek 大模型生成 AI 落子
    ├── lib/
    │   └── gobanConfig.ts      # goban 全局配置
    ├── styles/
    │   └── globals.css
    └── vendor/
        └── goban/              # OGS goban 棋盘引擎（子模块裁剪版）
```

## 游戏机制

### 解锁规则

- 每章第 1 关初始即解锁，8 章全部可从世界地图进入（互不关联）
- 每完成一关，解锁本章下一关；已通关关卡可重玩以刷新星数
- 章节首关解锁 = 整个章节在世界地图上解锁

### 评分规则

| 错误次数 | 星数 | 得分 |
|---:|:---:|---:|
| 0 | ⭐⭐⭐ | 300 |
| 1 | ⭐⭐ | 200 |
| ≥ 2 | ⭐ | 100 |

### BOSS 关：与 DeepSeek 大模型 AI 对弈

第 8 章「王者荣耀」是手写的终极 BOSS 关，共 4 关，棋盘逐级增大，执黑先手，**先提掉对方 N 颗棋子者获胜**：

| 关卡 | 棋盘 | 目标提子数 | 步数上限 |
| --- | --- | ---: | ---: |
| 王者对决 · 终极 BOSS | 7×7 | 10 | 200 |
| 王座争锋 · 9×9 小局 | 9×9 | 20 | 400 |
| 宗师之战 · 13×13 中盘 | 13×13 | 30 | 600 |
| 传奇终局 · 19×19 满盘 | 19×19 | 40 | 800 |

- 你落子后，前端把棋盘序列化发给 `/api/ai-move`，由 **DeepSeek** 大模型决定 AI 落子。
- 每回合 DeepSeek 还会在棋盘上方给出**表情包 + 对你落子的点评 + 它自己落子的理由**（语言随界面设置 zh/en）。
- 本地只做**合法性校验**：`src/game/ai/goAI.ts` 提供纯函数规则引擎（提子、打劫、禁着点）+ 贪心兜底。
- **本地开发时 DeepSeek 直接可用**：`vite.config.ts` 内置了 `/api/ai-move` 的 dev 中间件，复用 `functions/api/ai-move.ts` 的逻辑，从 `.env.local` 读取 `DEEPSEEK_API_KEY`。把 `.env.example` 复制为 `.env.local` 填好密钥，`yarn dev` 后 BOSS 关的 AI 走子就是 DeepSeek 在决定。
- 生产部署时 `/api/ai-move` 由 Edge Function 提供（见 [DEPLOY.md](./DEPLOY.md)）；若无密钥 / 无网，才会降级为本地贪心 AI 兜底，保证离线可玩。
- 可「停一手 (Pass)」或「认输」；步数用尽或双方连停两次判负。

### 存档

所有进度存在浏览器 `localStorage`：

| Key | 用途 |
| --- | --- |
| `go-game:save` | 关卡完成状态、最佳星数、解锁进度 |
| `go-game:locale` | `zh` / `en` |
| `go-game:sound` | 音效开关（默认开） |
| `go-game:bgm` | BGM 开关（默认开） |

## 技术要点

- **Vendored goban**：`src/vendor/goban/` 是从 OGS 主仓 `submodules/goban/` 裁剪出来的纯棋盘引擎，只保留单机谜题模式需要的部分，去掉了 socket、对手、计时等在线逻辑。通过 `vite.config.ts` 的 `goban` 别名引入。
- **AST 抽取**：`scripts/extract-levels.ts` 用 TypeScript Compiler API 解析 LearningHub 的 `.tsx` 源码，识别 `<PuzzleConfig>`、`<div>` + `<label>` 等结构，输出 JSON 中间产物。
- **Web Audio 合成**：音效用 `OscillatorNode` / `GainNode` 实时合成，零音频资源；背景音乐播放 `public/aaa.mp3`（`HTMLAudioElement` 循环 + 渐入渐出）。
- **Hash 路由**：导航用 React 内存状态 + `location.hash`（`#level=<id>`），所以部署到任意静态主机都不需要配置 SPA fallback 重写规则。

## 部署

详见 [DEPLOY.md](./DEPLOY.md)。最简方式：

```bash
npm run build
npx edgeone makers deploy dist -n go-game
```

或推到 GitHub 后在 EdgeOne / Cloudflare Pages 控制台导入仓库，框架选 **Vite**，构建命令 `npm run build`，输出目录 `dist`。

> BOSS 关的 AI 落子依赖 `functions/api/ai-move.ts`（Edge Function），并配置环境变量 `DEEPSEEK_API_KEY`。函数按 **Cloudflare Pages** 约定编写（`functions/` + named `onRequest`）：**Cloudflare Pages 开箱即用**；**EdgeOne 需按官方文档适配**（目录 / 导出方式 / 环境变量不同）。不部署函数时前端自动降级为本地贪心 AI，关卡仍可玩。详见 [DEPLOY.md](./DEPLOY.md) 第四节。

## 开发说明

### 新增关卡

关卡数据由脚本自动生成，不建议手改 `src/game/chapters/*.ts`。如需新增题目，请修改 online-go.com LearningHub 源文件后重新运行抽取脚本（流程见 `scripts/` 目录注释）。

### 修改 BGM

把 `public/aaa.mp3` 替换成自己的音频文件即可换曲（默认循环播放、默认开启）。音量在 `src/game/bgm.ts` 顶部 `VOLUME` 常量调整。

### 调试单关

用 URL hash 直达任意关卡：

```
http://localhost:5173/#level=<level-id>
```

## 致谢

- 棋盘引擎与所有关卡内容源自 [online-go.com](https://github.com/online-go/online-go)，遵循 AGPLv3 协议。
- 本项目是其 LearningHub 模块的独立离线再发行版，致敬原作者们。

## License

[AGPL-3.0](./LICENSE)（与 online-go.com 主项目一致）。

感谢 https://linux.do 社区佬友