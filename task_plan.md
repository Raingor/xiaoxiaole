# 地铁消消乐实施计划

## 目标
在 xiaoxiaole 项目完成可试玩的角色主题三消游戏，复用 railway-run 的角色素材，支持交换消除、连消、特效、关卡目标、道具和进度保存。

## 阶段
1. [complete] 检查工作区、角色素材、现有技术栈与玩法需求。
2. [complete] 实现三消规则、关卡与存档。
3. [complete] 完成地铁街头主题界面、角色和动效。
4. [complete] 构建、规则验证和浏览器实测，修复问题。
5. [complete] 完成交付说明并记录 pi-hermes-memory。

## 追加阶段：2D 角色重绘（2026-10-25）
6. [complete] Web 搜索六位角色的 2D 参考，记录外观依据和来源。
7. [complete] 用 imagegen 重绘统一平面画风透明素材，替换所有角色展示。
8. [complete] 检查棋盘辨识度、桌面/手机效果和构建，记录项目记忆。

## 追加阶段：GitHub 与 Pages 部署
9. [complete] 检查认证与源码，适配 Pages 子路径，准备自动部署。
10. [in_progress] 创建 GitHub 仓库，提交并推送源码，启用 Pages。
11. [pending] 等待自动部署并验证线上游戏，记录仓库和站点地址。

## 决策
- 先沿用现有项目技术栈；空目录采用轻量可运行 Web 项目。
- 复用本地 railway-run 角色，保持原项目文件不变。

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
| Chrome DevTools 浏览器配置被另一个实例占用 | 1 | 改用独立 Playwright Chromium 上下文，不干扰现有浏览器 |
| 掉落测试首次失败 | 1 | 测试误清除了缺口 56，改为清除有效格 48 后验证真实掉落 |
| 头像再生成触发 Vite 优化器重载 | 1 | 将头像导出与界面截图拆成独立脚本，避免测试中临时引入 Three.js 模块 |
| 项目记忆首次写入 ENOENT | 1 | 初始化项目记忆目录与空 MEMORY.md 后重试连接器写入 |
| 匿名查询 GitHub Actions 提交遇到 API 限流 | 1 | 改用已验证的用户凭据读取官方 Action 版本 |

## 交付结果
- 本地可玩预览：http://localhost:5173（开发服务保持运行）。
- 22 项规则测试、33 项浏览器检查、生产构建与生产交互验证全部通过；npm audit 零漏洞。
- README 与截图、浏览器报告保存在项目中；已成功写入项目 pi-hermes-memory。

## 2D 重绘交付
- 八张透明 2D 图片已接入全部角色展示，旧 3D 图不再加载。
- 生产构建、桌面/手机视觉检查、六人图鉴与八张透明通道检查、实际交换得分验证通过，无浏览器异常。
- 来源和完整提示词已存档，更新已成功写入 pi-hermes-memory。
