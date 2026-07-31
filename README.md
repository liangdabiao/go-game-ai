# 围棋闯关 · Go Game

> 一个纯前端的单机围棋闯关游戏，从 [online-go.com](https://online-go.com) 的 LearningHub 教程中提取而成。
> 3563 个关卡，7 个段位章节，从零基础到高阶战术。

![status](https://img.shields.io/badge/status-ready%20for%20launch-brightgreen)
![react](https://img.shields.io/badge/React-19-61dafb)
![typescript](https://img.shields.io/badge/TypeScript-5.9-3178c6)
![vite](https://img.shields.io/badge/Vite-7-646cff)
![license](https://img.shields.io/badge/license-AGPLv3-blue)

## 在线试玩

- EdgeOne Pages：<https://go-game.edgeone.app>
- Cloudflare Pages：<https://go-game.pages.dev>

（若地址尚未配置，请参考 [DEPLOY.md](./DEPLOY.md) 自行部署）

## 特性

- **3563 个关卡**，分 7 个章节：青铜 → 白银 → 黄金 → 铂金 → 钻石 → 星耀 → 王者
- **三种题型**：棋盘操作题、选择题、终局流程题（停一手 / 数子 / 完成）
- **三星评分**：按错误次数评星，鼓励完美通关
- **世界地图 / 章节 / 关卡**三级导航，进度可视化
- **中文优先**，内置英文切换
- **音效与背景音乐**全部用 Web Audio API 实时合成（无音频文件）
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

## 项目结构

```
go-game/
├── index.html                  # SPA 入口
├── vite.config.ts              # Vite 配置（含 goban 路径别名）
├── tsconfig.json
├── package.json
├── public/
│   └── favicon.svg             # SVG 棋子图标
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
    │   └── EndingGameScreen.tsx    # 停一手 / 数子 / 完成
    ├── game/
    │   ├── types.ts            # 核心类型定义
    │   ├── levels.ts           # 关卡索引与查询
    │   ├── progress.ts         # 存档与解锁逻辑（localStorage）
    │   ├── preferences.ts      # 语言 / 音效 / BGM 持久化
    │   ├── audio.ts            # Web Audio 音效合成
    │   ├── bgm.ts              # Web Audio 电子背景音乐合成
    │   ├── engine.ts           # 谜题判定引擎（正确/错误点）
    │   ├── moveTree.ts         # move_tree / marks 构造
    │   └── chapters/           # 7 个章节的关卡数据（自动生成）
    ├── lib/
    │   └── gobanConfig.ts      # goban 全局配置
    ├── styles/
    │   └── globals.css
    └── vendor/
        └── goban/              # OGS goban 棋盘引擎（子模块裁剪版）
```

## 游戏机制

### 解锁规则

- 初始只有第 1 章第 1 关解锁
- 每完成一关，按章节顺序解锁下一关
- 章节首关解锁 = 整个章节在世界地图上解锁
- 已通关关卡可重玩以刷新星数

### 评分规则

| 错误次数 | 星数 | 得分 |
|---:|:---:|---:|
| 0 | ⭐⭐⭐ | 300 |
| 1 | ⭐⭐ | 200 |
| ≥ 2 | ⭐ | 100 |

### 存档

所有进度存在浏览器 `localStorage`：

| Key | 用途 |
| --- | --- |
| `go-game:save` | 关卡完成状态、最佳星数、解锁进度 |
| `go-game:locale` | `zh` / `en` |
| `go-game:sound` | 音效开关（默认开） |
| `go-game:bgm` | BGM 开关（默认关） |

## 技术要点

- **Vendored goban**：`src/vendor/goban/` 是从 OGS 主仓 `submodules/goban/` 裁剪出来的纯棋盘引擎，只保留单机谜题模式需要的部分，去掉了 socket、对手、计时等在线逻辑。通过 `vite.config.ts` 的 `goban` 别名引入。
- **AST 抽取**：`scripts/extract-levels.ts` 用 TypeScript Compiler API 解析 LearningHub 的 `.tsx` 源码，识别 `<PuzzleConfig>`、`<div>` + `<label>` 等结构，输出 JSON 中间产物。
- **Web Audio 合成**：音效和 138 BPM 电子 BGM 全部用 `OscillatorNode` / `GainNode` / 噪声缓冲实时合成，零音频资源。
- **Hash 路由**：导航用 React 内存状态 + `location.hash`（`#level=<id>`），所以部署到任意静态主机都不需要配置 SPA fallback 重写规则。

## 部署

详见 [DEPLOY.md](./DEPLOY.md)。最简方式：

```bash
npm run build
npx edgeone makers deploy dist -n go-game
```

或推到 GitHub 后在 EdgeOne / Cloudflare Pages 控制台导入仓库，框架选 **Vite**，构建命令 `npm run build`，输出目录 `dist`。

## 开发说明

### 新增关卡

关卡数据由脚本自动生成，不建议手改 `src/game/chapters/*.ts`。如需新增题目，请修改 online-go.com LearningHub 源文件后重新运行抽取脚本（流程见 `scripts/` 目录注释）。

### 修改 BGM

`src/game/bgm.ts` 顶部定义了 BPM、音阶表、旋律（`LEAD`）、贝斯（`BASS`）、镲片（`HAT`）三个数组，每个数组长度 32（对应 4 小节 × 8 个八分音符）。改数组即可换曲，无需音频文件。

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
