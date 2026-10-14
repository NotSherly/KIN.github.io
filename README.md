# 谱系 KIN · 可交互 Web App MVP

一个中文、蓝紫色关系网络的课程演示。React + Vite + TypeScript + React Flow + Tailwind CSS，完全在浏览器内运行。**全部人物与关系均为虚构**。算法只能发现连接，不能定义关系。

## 本地启动

需要 Node.js 22.12+（或 Node.js 24 LTS）和 npm。

```sh
npm install
npm run dev
```

打开终端显示的地址，默认是 `http://localhost:5173/KIN.github.io/`。

```sh
npm test           # 关系和授权的自动化测试
npm run build     # TypeScript 检查 + 生产构建
npm run preview   # 本机预览 dist，默认 http://localhost:4173/KIN.github.io/
```

使用 `package-lock.json` 固定依赖；CI 使用 `npm ci`。初次下载需要网络。

## 建议演示顺序

1. 以 **林知夏** 开始，在「个人谱系」点击 **周予安**：下一层出现 **陈见川**。点击林书禾可继续展开何听澜。切换正式、私人、候选层查看差异。
2. 打开「模拟碰一碰」，选择 **陈见川**，双方保留三种类型和 3 层、同意授权，点击开始。动态展示 `林知夏 → 周予安 → 陈见川`。该结果标注为系统推导，不自动创建直接关系。
3. 把任一方层数改为 **1**，或仅共享「朋友」，重新开始：没有可见路径。选择独立节点 **苏望野** 也没有路径。取消任一方同意后开始：拒绝授权，不进行寻路。
4. 恢复默认共享范围并寻路，点击「申请直接关系认领」进入关系管理，向陈见川发送申请（默认私密）。右上角切换为 **陈见川**，在「待我回应」中接受，单独选择接收方是否允许共享。
5. 切回林知夏：新关系有「双方确认」来源标签。双方都允许共享时才能参与寻路；任一方私密都会阻断该直接边。测试拒绝：向苏望野申请，再切换为苏望野点击拒绝；不会新增关系。
6. 在「关系生命周期」对自愿共同关系执行保持、单方淡化、权限变更或单方退出。「淡化」只影响自己的视图；「退出」终止该共同边，保留历史。林知夏与林书禾的客观关系不能退出删除，但可以关闭自己的共享许可。
7. 刷新查看关系及历史仍在。碰一碰会话只保存在内存，2 分钟到期或手动结束后清除；改权限、改范围或切换身份也会关闭旧会话。
8. 「重置演示数据」确认后清除认领和历史，恢复默认人物与关系。

## 数据和隐私规则

- **正式谱系**：客观关系，以及双方同意共享的直接确认关系。关闭客观关系的共享不会删除该事实，但它不再进入共享寻路。
- **私人谱系**：至少一方未授权共享的自愿直接关系。关系双方可在自己的视图查看，第三方不能沿此边展开。
- **候选谱系**：演示中的可申请人物推荐，以虚线呈现。不写入有效关系、不参与路径搜索、不自动确认。推荐只是示例列表，不是智能匹配服务。
- 每条关系独立保存双方共享权限；寻路使用**双方选中类型的交集**，并要求每条边原来的双方都允许共享。两人所选层数的较小值为本次**路径最大边数**（1 层就是 1 条边）。
- BFS 只在过滤后的有效图上运行。没有可见路径并不意味着现实中没有关系。
- 认领只建立自愿共同关系，不能凭表单认证或改变法定/客观身份。只能由申请接收方回应。已退出关系必须重新发起并接受申请才能建立新的共同边。
- `localStorage` 键 `kin-demo-v1` 保存关系、认领和演示总历史。损坏或不兼容的数据会恢复初始示例。存储不可用时页面提示无法持久保存。
- 当前模拟身份默认林知夏，界面选择和临时会话不持久化。演示总历史可查看所有模拟身份的操作。
- 这是单浏览器本地 MVP，不包含真实登录、真实 NFC、后端鉴权、多设备同步或法定身份核验。切换身份是演示功能，不是安全隔离机制。

## GitHub Pages 部署

- `vite.config.ts` 设置 `base: '/KIN.github.io/'`。
- `.github/workflows/deploy.yml` 在 `main` 分支 push 或手动 `workflow_dispatch` 时运行：`npm ci → npm test → npm run build → 上传 dist → Pages 部署`。
- 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
- 预期公开地址：`https://notsherly.github.io/KIN.github.io/`，只有代码推送且工作流成功后才会上线。
- 导航使用 hash，如 `/KIN.github.io/#tap`。刷新仍请求项目根目录，不产生 SPA 子路由 404；无需 404 重定向脚本。
- 工作流仅授予读取源码、写 Pages 和 OIDC 所需权限。Node.js 使用 22。

部署内容通过常规 Git 提交推送到 `main`；不需要上传本机的 `node_modules` 或 `dist`。

## 文件结构

| 文件                                                 | 用途                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `src/App.tsx`                                        | 页面导航、身份切换、认领、生命周期、会话计时和本地保存       |
| `src/Graph.tsx`                                      | React Flow 人物节点、分层图、动画路径和尺寸自适应            |
| `src/model.ts`                                       | 虚构数据、逐边授权、BFS、认领与生命周期规则、存储校验        |
| `src/model.test.ts`                                  | 授权交集、层数、拒绝、隐私、认领、退出、客观关系和持久化测试 |
| `src/styles.css`                                     | Tailwind CSS 与响应式界面样式                                |
| `src/main.tsx`, `index.html`                         | React 入口与中文页面信息                                     |
| `package.json`, `package-lock.json`, `tsconfig.json` | 依赖、命令和严格 TypeScript 配置                             |
| `vite.config.ts`                                     | Vite、React、Tailwind 插件和 Pages base                      |
| `.github/workflows/deploy.yml`                       | Pages 构建部署工作流                                         |
| `.gitignore`                                         | 排除依赖、构建产物与本机文件                                 |

## 本地验证记录

- `npm install` 成功；锁文件已生成。
- `npm test`：16 项逻辑测试全部通过。
- `npm run build`：TypeScript 与生产构建成功。第三方 Zod 注释提示和约 525 kB 的单包体积提示不阻断构建。
- 对生产预览完成桌面 1440px、手机 390px 浏览器验证：展开、三层切换、路径和层数限制、拒绝、无路径、认领接受/拒绝、个人权限、退出、客观关系保护、刷新保存、重置、2 分钟到期、hash 刷新。
- 手机页面没有横向溢出；窗口缩窄后全部图节点仍在画布内；没有浏览器运行错误。
- `npm audit`：0 个已知漏洞；`git diff --check` 通过。
- 上传后的构建及发布结果以仓库 Actions 中的 `Deploy KIN to GitHub Pages` 工作流为准。

## 实现依据

- [React Flow 文档](https://reactflow.dev/learn)
- [Tailwind CSS 的 Vite 集成](https://tailwindcss.com/docs/installation/using-vite)
- [Vite 的 GitHub Pages 部署说明](https://vite.dev/guide/static-deploy.html#github-pages)
