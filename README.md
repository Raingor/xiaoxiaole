# 地铁消消乐 · Rail Pop

## 2026-10-30 新增10个身份

新增栗子馒头（第19站）、飞鼠（21）、海獭（23）、狮萨（25）、古本屋（27），以及草莓熊（29）、青蛙熊（31）、太空熊（33）、厨师熊（35）、海盗熊（37）。每两站加入一个新身份，主线扩至38站，每关最多6种，角色和造型各自独立匹配。

五位伙伴参考来自 [Chiikawa Market 官方角色目录](https://chiikawamarket.jp/collections)，下载依据在 `references/characters/expansion-sources.json`。10张独立透明PNG使用内置image_gen制作，位于 `public/characters-2d/`；完整提示词和原始生成路径在 `references/characters/expansion-prompts.json`。原9个身份索引、旧18关和RP2挑战逻辑保留，旧存档收集计数自动补齐19种。

首屏只等待当前阵容及欢迎插画；未来角色在实际显示时加载。新增20张站点贴纸与对应故事，收集册总数44张。已通关旧终点第18站的玩家会自动解锁第19站，无需重复通关。新增规则检查在 `src/expansion.test.ts`，角色扩展浏览器检查执行 `node scripts/expansion.mjs`（先启动开发服务）。

目前共有38关、19种独立角色/造型。43项规则测试覆盖38关共3,800步模拟，以及救援、列车、主题目标、种子棋盘与挑战码。

三款新造型PNG使用内置image_gen生成，保存在 `public/characters-2d/bear-raincoat.png`、`bear-pajama.png`、`bear-ninja.png`，完整提示词见 `references/characters/bear-outfit-prompts.json`。熊形炸弹独立生成因连接失败，最终使用现有熊头像与原生UI/SVG导火线组合，游戏无需额外炸弹图片文件。

熊熊炸弹从第3关开始少量预置，L/T型匹配也能生成。炸弹清除周围3×3并连锁其他特效；左下角小头像提示它原本的匹配身份。双炸弹清5×5，炸弹+直线清三行三列。

雨衣熊、睡衣熊、忍者熊分别在第13、15、17关加入，与普通熊不能混消。后期关卡轮换阵容，每关最多6种棋子。

## 扩充角色与造型

将透明2D头像放入 `public/characters-2d/<id>.png`，在 `src/catalog.ts` 的 `CHARACTERS` 末尾追加身份，填写id、名字、颜色、介绍和解锁关卡。造型额外设置baseId；现有顺序对应存档kind编号，请勿重排。

在新关卡的 `roster` 中填写参与角色索引，并添加收集目标，保持kinds与阵容长度一致。图鉴、素材加载和收集计数随目录扩充；地图、解锁上限和下一关随关卡表扩充。更多Chiikawa伙伴可以沿用同一流程，当前并未添加未经绘制的新角色。

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
- 38 个原创关卡：收集伙伴、分数目标、冰块与双层冰块、不规则棋盘。
- 胜负结算、最后一步胜利判定、星级最高分、下一关解锁、首通奖励。
- 小木锤、大洗牌、魔法棒、加五步、免费提示，无解时自动免费洗牌。
- 浏览器自动保存当前棋盘、步数、目标、道具、关卡、音效偏好；损坏存档安全回退。
- 关卡地图、19身份图鉴、玩法说明、合成音效、粒子与消除动效。
- 响应式桌面和手机布局、键盘操作、减少动态效果偏好。

## 操作

点击一个棋子，再点击相邻棋子；也可以直接向相邻方向拖动或滑动。

键盘：Tab 聚焦棋子，方向键移动焦点，Enter 选中，Shift + 方向键交换，Esc 取消道具或关闭弹窗。

## 验证

```bash
npm test              # 43 项规则测试，含 38 关共 3,800 步模拟
npm run test:browser  # 启动开发服务后执行；需要本机 Google Chrome
npm run test:features # 七项新玩法端到端检查；先启动开发服务
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

第一关仅25个棋子、三位角色，收集6个自嘲熊即可通关。基础收集目标逐关增加，救援关额外增加2—3位伙伴；棋盘在第3、6、9关分别扩至6×6、7×7、8×8。乌萨奇第4关、鼹鼠饼第7关、老头狗第10关加入。第6关引入少量冰块，第11关才引入双层冰块。旧通关记录、最高分、道具保留，当前规则2的中途棋盘可继续恢复；更早规则的中途棋盘重开同关。

## 趣味玩法与挑战

- **连消欢呼**：3连消鼓掌、5连消双熊跳舞、8连消稀有狂欢。使用网上现成GIF，来源见 `references/characters/combo-sources.json` 和 `celebration-source.json`，游戏内收集册也有来源链接。
- **救援伙伴**：第5/8/11/18站有救援箱；箱子格或上下左右邻格一次消除会松动一层，每波最多一次，两层全部打开救出伙伴。箱子固定在棋格上，不阻挡交换和掉落。
- **贴纸收集册**：38张过关贴纸与6张连消/救援/列车/每日成就贴纸，共44张。已收藏的贴纸展示角色与小故事；重复通关不重复发贴纸。第13/15/17站依旧解锁对应熊造型。
- **惊喜列车**：第8站起，每消除36个棋子能量集满，当前消除稳定后发车，每次操作最多一次，交替赠送熊炸弹、清除一行。列车不耗步；过关时优先结算。
- **主题旅程**：1—6晴日、7—12野餐、13—14雨天、15—18睡衣派对。指定野餐/夜间站点有点心/星星目标，消除标记格即可收集；雨天水洼沿用冰块规则。
- **每日挑战**：按上海时区每天生成固定种子棋盘，轮换积分/熊弹/五连消任务。每日最佳以通关步数更少优先，同步数比较分数；成绩保存在当前浏览器，可重复挑战。
- **好友挑战码**：挑战入口创建指定站点全新同棋盘，或粘贴朋友的RP2挑战码/链接。初始棋盘与补充顺序一致，支持分享通关成绩；没有服务器排行榜，朋友比较链接附带的成绩。旧版本代码不混用，损坏码会提示重试。

挑战模式免费提示，不使用道具，不发主线首通奖励或解锁主线。进入挑战会保留主线当前棋盘，点击「返回主线」原样继续；挑战和主线都支持刷新恢复。代码中 `src/activities.ts` 管理每日种子、挑战码和收集册，`src/features.css` 管理相关界面。
