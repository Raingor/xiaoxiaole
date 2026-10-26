# 发现与设计依据

- 用户要求开心消消乐的核心玩法，角色来自本地 railway-run 项目。
- 当前尚无历史计划文件。

- xiaoxiaole 是空目录；railway-run 为 Three.js + TypeScript + Vite 项目。
- 角色不是现成图片：由 JokeBear.ts、BearGeometry.ts 和服装模块生成 3D 模型。已有 ShopPortraits.ts 可参考离屏渲染实际角色。
- 玩法资料确认核心：相邻交换、三连消除、四连直线、L/T 爆炸、五连彩虹、特效组合、限定步数和障碍。参考 https://game.xiaomi.com/viewpoint/64855802_1638970416099_13 。
- 计划使用本地真实 3D 模型生成透明头像缓存，棋盘使用轻量 DOM 动画。

- 确认六种本地角色：经典 Joke Bear、吉伊、小八、乌萨奇、鼹鼠饼、老头狗。已将角色模型及其本地依赖复制到 src/characters，原项目未改动。
- 视觉方向：奶油色与薄荷绿的晴天地铁站、手绘感轨道地图、立体角色棋子，宽屏三栏，手机优先保留棋盘。

- 首次浏览器实测：1440px 桌面与 390px 手机均无横向溢出，64 个角色棋子加载正常；已从原始 3D 模型导出 12 张透明头像/全身图。
- 后续改为读取静态角色图，避免用户每次进站需要 WebGL 渲染，并降低主包大小。
- 初始继承技术栈的旧 Vite/Vitest 依赖有 audit 告警，已开始升级开发依赖至当前修复版本。

- 视觉检查发现目标卡片 HTML 少一个闭合标签，导致两个目标嵌套而纵向挤压，已修复。
- 桌面棋盘收紧至 520px，保留三栏完整体验；头像生成工具与截图检查拆分，运行时不加载 Three.js。

- 最终验证：22 项规则测试与 33 项浏览器检查全部通过；生产 JS 36.68KB（gzip 14.72KB）；静态生产页面零第三方网络请求、零浏览器异常；项目记忆写入成功。

## 2D 角色重绘依据
- 用户明确要求更换此前 3D 头像，改为从网络参考重新绘制的 2D 角色。
- 已检索到 Chiikawa 动画官网 https://www.anime-chiikawa.jp/ 作为三小只的主要外观参考。

- 官方参考来源：Chiikawa 动画官网的角色页 https://www.anime-chiikawa.jp/chara.html 与 Nagano 官方商店角色列表 https://nagano-market.jp/ 。
- 检索确认“老头狗”对应巴哥犬 パグ；“鼹鼠饼”对应 もぐらコロッケ。避免按旧 3D 模型误画成普通黑耳白狗或小黄熊。

- 已从 Nagano 官方商店角色列表取得六位角色的 2D 分类插画，保存至 references/characters/；来源逐一记录在 sources.json。仅作为绘制参照，游戏资源使用重绘产物。

- 已目视检查官方六张头像：吉伊白圆脸+腮红斜线；小八蓝色八字花纹；乌萨奇奶黄长耳+弯眉；自嘲熊极简豆眼鼻嘴且无腮红；鼹鼠饼橙杏色无耳圆饼+扁嘴；老头狗黑折耳、双道额纹、灰色口鼻区。
- 输出计划：六张独立重绘透明头像，另为首页制作自嘲熊和乌萨奇的平面全身图；所有资源使用内置 imagegen。

- 内置 imagegen 已生成并检查八张 2D 透明 PNG：六张棋子头像 + 自嘲熊/乌萨奇两张全身展示，原图保留在 generated_images，项目副本位于 public/characters-2d。完整提示词和来源路径见 references/characters/redraw-prompts.json。
- 角色加载器改为只加载八张 2D 素材，不再预加载未使用的旧 3D 全身图片。

- 最终视觉检查：桌面与手机棋盘角色均为平面线稿；首页两张全身图统一画风；图鉴包含全部六位重绘角色。

## GitHub Pages 部署依据
- 当前项目尚无 Git 仓库；用户提供的凭据已通过 GitHub /user 验证为 Raingor，具备 repo 与 workflow 权限。密钥内容不写入项目、日志或 Git 配置。
- GitHub 连接器没有创建仓库与配置 Pages 的工具，因此使用 GitHub CLI/API 与本地 Git 完成。
- Vite 项目站点必须适配 /仓库名/ 子路径，角色加载器已支持 BASE_URL，favicon 还需同步适配。
- 参考官方部署文档：https://vite.dev/guide/static-deploy.html 与 https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages 。

- Raingor/xiaoxiaole 当前不存在，可以安全创建新仓库。
- 部署工作流采用 Node 24，官方 Actions 版本通过 GitHub API 核验并固定 SHA；发布路径为 /xiaoxiaole/。
- 已适配 favicon 的 BASE_URL，并忽略生成截图、依赖、构建产物及环境变量文件。

- GitHub Pages 的 workflow 模式与 HTTPS 均已验证启用。线上实际交换和存档恢复通过，/xiaoxiaole/ 子路径资源无 404。

## 方向箭头优化
- 横竖特效与说明栏使用 Unicode ↔/↕，受字体字形影响，现有角标为拥挤的小方块。改用原生 SVG 圆角双向箭头与奶油金胶囊徽标，横竖方向分别使用扁长/竖长比例，保持角色脸部可读。

## 渐进关卡
- 用户反馈开局数量与角色过多。按棋盘棋子数量、目标收集数量、角色种类三方面同时调整，避免只降低目标而棋盘仍然拥挤。
- 保留8×8内部坐标，通过关卡size与外圈holes实现5/6/7/8棋盘；渲染只显示活动正方形。角色数3→4→5→6，首次加入关卡1/4/7/10。
