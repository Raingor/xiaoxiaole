# 地铁消消乐 · Rail Pop

[在线试玩](https://raingor.github.io/xiaoxiaole/) · [GitHub 仓库](https://github.com/Raingor/xiaoxiaole)

一款可以直接在浏览器游玩的三消游戏。以「地铁快跑」六位角色为阵容，通过 Web 搜索官方 2D 参考并用内置 imagegen 重绘透明棋子：Joke Bear、吉伊、小八、乌萨奇、鼹鼠饼、老头狗。

## 启动

需要 Node.js 22.12+ 或 24+。

```bash
npm install
npm run dev
```

打开终端显示的本地地址（默认 http://localhost:5173）。生产构建：

```bash
npm run build
npm run preview
```

## 已实现

- 5×5 → 6×6 → 7×7 → 8×8 渐进棋盘；点击交换、鼠标拖动、手机滑动；无效交换复原且不耗步。
- 三连消除、重力掉落、自动补充、多轮连消；四连直线、L/T 型爆炸、五连彩虹。
- 直线 + 直线十字，直线 + 爆炸三行三列，双爆炸 5×5，彩虹 + 普通同色消除，彩虹 + 特效同色转换后连锁，双彩虹清屏。
- 12 个原创关卡：收集伙伴、分数目标、冰块与双层冰块、不规则棋盘。
- 胜负结算、最后一步胜利判定、星级最高分、下一关解锁、首通奖励。
- 小木锤、大洗牌、魔法棒、加五步、免费提示，无解时自动免费洗牌。
- 浏览器自动保存当前棋盘、步数、目标、道具、关卡、音效偏好；损坏存档安全回退。
- 关卡地图、六人图鉴、玩法说明、合成音效、粒子与消除动效。
- 响应式桌面和手机布局、键盘操作、减少动态效果偏好。

## 操作

点击一个棋子，再点击相邻棋子；也可以直接向相邻方向拖动或滑动。

键盘：Tab 聚焦棋子，方向键移动焦点，Enter 选中，Shift + 方向键交换，Esc 取消道具或关闭弹窗。

## 验证

```bash
npm test              # 24 项规则测试，含 12 关共 1,200 步模拟
npm run test:browser  # 启动开发服务后执行；需要本机 Google Chrome
npm run screenshots   # 桌面 / 手机截图输出至 artifacts/
```

浏览器测试使用独立临时上下文和本地夹具，不影响真实玩家存档。运行时默认地址为 http://localhost:5173，可通过 GAME_URL 设置浏览器测试地址。

## 角色素材

当前界面全部使用 `public/characters-2d/` 的重绘透明 PNG：六张头像和自嘲熊、乌萨奇的两张全身展示图。棋盘、关卡目标、图鉴、结算与首页统一使用 2D 黑色描边、纯色填充画风。

外观参考来自 [Chiikawa 动画官网](https://www.anime-chiikawa.jp/chara.html) 与 [Nagano 官方商店角色列表](https://nagano-market.jp/collections/)。下载的参考插画、逐一来源和完整生成提示词分别保存在 `references/characters/`、`sources.json`、`redraw-prompts.json` 中。生成方式为内置 image_gen，透明通道原样保留。

早期版本使用相邻 `railway-run` 的 3D 模型预渲染头像。旧模型 `src/characters/`、图片 `public/characters/` 和导出工具作为历史资源保留，不再用于游戏页面。`npm run portraits` 仅导出旧 3D 版本，不能覆盖新的 2D 图片。原 railway-run 项目未改动。字体随项目打包，运行时不依赖 WebGL 或外部字体服务。

## 主要文件

- `src/engine.ts`：纯规则引擎、关卡、存档验证。
- `src/main.ts`：界面、交互、动画、音效和进度。
- `src/style.css`：地铁晴日主题和自适应布局。
- `src/engine.test.ts`：规则与边界测试。
- `scripts/smoke.mjs`：浏览器完整流程测试。
- `task_plan.md`、`findings.md`、`progress.md`：计划与实施记录。

## GitHub Pages 自动部署

推送到 `main` 后，GitHub Actions 会安装依赖、运行规则测试、构建并发布到 https://raingor.github.io/xiaoxiaole/ 。工作流使用 Node.js 24，官方 Actions 固定到经过核验的提交。

本地开发仍使用根路径。验证 Pages 子路径构建：

```bash
PAGES_BASE=/xiaoxiaole/ npm run build
PAGES_BASE=/xiaoxiaole/ npm run preview
```

`vite.config.ts` 通过 `PAGES_BASE` 配置发布路径，图片与 favicon 同步使用 Vite 的 base 路径。部署只依赖 GitHub 自带的 `GITHUB_TOKEN`，无需在仓库内保存个人密钥。

## 新手关卡节奏

第一关仅25个棋子、三位角色，收集6个自嘲熊即可通关。总收集目标逐关为6、9、12、15、18、21、24、27、30、33、36、39；棋盘在第3、6、9关分别扩至6×6、7×7、8×8。乌萨奇第4关、鼹鼠饼第7关、老头狗第10关加入。第6关引入少量冰块，第11关才引入双层冰块。旧通关记录、最高分、道具保留，中途棋盘在更新后按新规则重开当前关卡。
