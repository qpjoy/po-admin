# PO Proxy Admin

PO Proxy 管理后台 - 基于 Vue3 + Arco Design 的供应商和SSH密钥管理系统

## 功能特性

### 1. 供应商管理
- ✅ 创建/编辑/删除供应商
- ✅ 供应商ID作为SSH用户名 (例如: `/home/wuxi/.ssh/authorized_keys`)
- ✅ 查看供应商的SSH密钥数量
- ✅ 快速跳转到密钥管理页面

### 2. SSH密钥管理
- ✅ 生成新的SSH密钥对 (RSA 4096位)
- ✅ 支持三种角色:
  - **leader**: 领导/VIP用户
  - **employee**: 普通员工
  - **common**: 通用密钥 (当客户端keyId不匹配时使用)
- ✅ 查看公钥内容并复制
- ✅ 密钥轮换 (重新生成)
- ✅ 删除密钥
- ✅ 服务器部署指南

### 3. 发布管理
- ✅ 创建新版本发布
- ✅ 字段级更新 (Tunnels, Routing, SSH Keys, Tokens)
- ✅ 更新策略:
  - **graceful**: 友好更新 (询问用户)
  - **immediate**: 立即更新 (自动应用)
- ✅ 目标角色选择 (全部/leader/employee/common)
- ✅ 强制更新/强制重启/仅通知选项
- ✅ 版本回滚功能
- ✅ 查看发布详情

### 4. 统计面板
- ✅ 总客户端数统计
- ✅ 版本分布图表
- ✅ 活跃隧道数量
- ✅ 更新覆盖率
- ✅ 客户端详情列表
- ✅ 隧道状态监控
- ✅ 最近更新记录

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Arco Design Vue** - 企业级 UI 组件库
- **Vue Router** - 官方路由管理器
- **Axios** - HTTP 客户端
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 下一代前端构建工具

## 快速开始

### 前置要求

- Node.js >= 16
- pnpm >= 8

### 安装依赖

```bash
cd po-admin
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

应用将在 http://localhost:3001 启动

### 构建生产版本

```bash
pnpm build
```

构建产物将输出到 `dist/` 目录

### 预览生产构建

```bash
pnpm preview
```

## 项目结构

```
po-admin/
├── src/
│   ├── api/              # API 请求封装
│   │   └── index.ts      # 所有 API 方法
│   ├── pages/            # 页面组件
│   │   ├── ProviderManagement.vue      # 供应商管理
│   │   ├── SSHKeyManagement.vue        # SSH密钥管理
│   │   ├── ReleaseManagement.vue       # 发布列表
│   │   ├── CreateRelease.vue           # 创建发布
│   │   └── StatisticsDashboard.vue     # 统计面板
│   ├── router/           # 路由配置
│   │   └── index.ts
│   ├── types/            # TypeScript 类型定义
│   │   └── index.ts
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口文件
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 配置说明

### 后端 API 代理

Vite 配置了代理，将 `/api` 请求转发到 `http://localhost:3000`:

```typescript
// vite.config.ts
server: {
  port: 3001,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

### 修改后端地址

如需连接到其他后端服务器，修改 `vite.config.ts` 中的 `target` 地址。

## 使用流程

### 1. 添加供应商

1. 进入"供应商管理"页面
2. 点击"添加供应商"按钮
3. 填写供应商信息:
   - **供应商ID**: 例如 `wuxi` (将作为SSH用户名)
   - **供应商名称**: 例如 `无锡代理`
   - **描述**: 可选
4. 点击"确定"保存

### 2. 生成SSH密钥

1. 在供应商列表中，点击"管理密钥"按钮
2. 点击"生成新密钥"按钮
3. 填写密钥信息:
   - **密钥ID**: 例如 `leader` (将用于客户端 .env 配置)
   - **角色**: 选择 `leader`, `employee`, 或 `common`
4. 点击"确定"生成
5. 系统将显示生成的公钥，复制到服务器的 `authorized_keys`

### 3. 部署公钥到服务器

```bash
# SSH登录到服务器
ssh root@your-server

# 切换到供应商用户 (例如: wuxi)
su - wuxi

# 编辑 authorized_keys
nano ~/.ssh/authorized_keys

# 粘贴公钥到文件末尾，保存退出

# 设置权限
chmod 600 ~/.ssh/authorized_keys
```

### 4. 创建发布

1. 进入"发布管理"页面
2. 点击"创建发布"按钮
3. 填写发布信息:
   - **供应商**: 选择供应商
   - **版本号**: 例如 `0.0.4`
   - **发布描述**: 描述本次更新内容
4. 配置更新策略:
   - **策略类型**: 友好更新 or 立即更新
   - **目标角色**: 选择目标用户角色
   - **强制更新/强制重启/仅通知**: 根据需要勾选
5. 配置更新字段:
   - **Tunnels**: 添加/修改/删除隧道配置
   - **Routing**: 添加/修改/删除路由规则
   - **SSH Keys**: 添加/修改/删除SSH密钥
6. 点击"创建发布"

### 5. 查看统计数据

1. 进入"统计面板"页面
2. 选择供应商查看统计信息:
   - 总客户端数
   - 最新版本
   - 活跃隧道数
   - 更新覆盖率
   - 版本分布
   - 客户端详情

## 与 po-backend 集成

本管理后台需要配合 po-backend 使用，确保后端服务已启动:

```bash
cd ../po-backend
export DB_PATH=src/db/db-test.json
export PORT=3000
pnpm dev
```

## API 端点

所有请求通过代理转发到 `http://localhost:3000/api`:

### 供应商 API
- `GET /api/admin/providers` - 获取供应商列表
- `POST /api/admin/providers` - 创建供应商
- `PUT /api/admin/providers/:id` - 更新供应商
- `DELETE /api/admin/providers/:id` - 删除供应商

### SSH 密钥 API
- `GET /api/admin/providers/:id/keys` - 获取密钥列表
- `POST /api/admin/providers/:id/keys` - 生成新密钥
- `DELETE /api/admin/providers/:id/keys/:keyId` - 删除密钥
- `POST /api/admin/providers/:id/keys/:keyId/rotate` - 轮换密钥

### 发布 API
- `GET /api/admin/releases` - 获取发布列表
- `POST /api/admin/releases` - 创建发布
- `POST /api/admin/releases/rollback` - 回滚版本
- `GET /api/admin/releases/latest` - 获取最新版本

### 统计 API
- `GET /api/admin/stats/:providerId/version-distribution` - 版本分布
- `GET /api/admin/stats/:providerId/clients` - 客户端统计

## 注意事项

1. **供应商ID = SSH用户名**: 供应商ID将直接用作服务器上的SSH用户名，例如 `wuxi` 对应 `/home/wuxi/.ssh/authorized_keys`

2. **密钥ID = 客户端配置**: 密钥ID将用于客户端的 `.env` 配置中的 `SSH_KEY_ID` 字段

3. **角色系统**:
   - `leader`: 高优先级用户
   - `employee`: 普通用户
   - `common`: 通用密钥，当客户端的 `SSH_KEY_ID` 不匹配时作为fallback

4. **公钥部署**: 生成密钥后，必须手动将公钥部署到服务器的 `authorized_keys` 文件中

5. **版本管理**: 版本号采用语义化版本 (Semantic Versioning)，例如 `0.0.4`

## 故障排除

### 连接后端失败

1. 确认后端服务已启动 (`http://localhost:3000`)
2. 检查 Vite 代理配置是否正确
3. 查看浏览器控制台的网络请求

### 无法生成SSH密钥

1. 确认后端已安装 `ssh-keygen` 命令
2. 检查后端日志是否有错误信息

### 客户端无法连接隧道

1. 确认公钥已正确部署到服务器
2. 检查客户端 `.env` 配置中的 `SSH_KEY_ID` 是否正确
3. 验证服务器的 `authorized_keys` 权限 (应为 600)

## 开发计划

- [ ] 批量导入供应商
- [ ] SSH密钥使用情况统计
- [ ] 发布审批流程
- [ ] 用户权限管理
- [ ] 操作日志记录
- [ ] 邮件/Webhook通知

## 许可证

MIT

## 联系我们

如有问题或建议，请联系开发团队。
