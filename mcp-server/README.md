# Whistle Client MCP Server

通过 MCP（Model Context Protocol）让 AI 助手直接操控 Whistle Client 代理服务器，实现规则管理、Mock 数据、抓包分析、请求重放等功能。

## 前置条件

- Node.js >= 18
- Whistle Client 桌面版（已安装并运行）

> 本 MCP server 自动从 `~/.whistle_client.pid` 读取连接信息和认证凭据，无需手动配置地址和密码。

## 安装

```bash
cd mcp-server
npm install
```

## Claude Code 配置

在 `~/.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "whistle": {
      "command": "npx",
      "args": ["tsx", "/path/to/whistle-client/mcp-server/src/index.ts"]
    }
  }
}
```

将 `/path/to/whistle-client` 替换为本仓库的实际路径。

### 环境变量（可选）

当自动检测不可用时，可通过环境变量指定连接信息：

```json
{
  "mcpServers": {
    "whistle": {
      "command": "npx",
      "args": ["tsx", "/path/to/whistle-client/mcp-server/src/index.ts"],
      "env": {
        "WHISTLE_HOST": "127.0.0.1",
        "WHISTLE_PORT": "8899",
        "WHISTLE_USERNAME": "Whistle",
        "WHISTLE_PASSWORD": "your-password"
      }
    }
  }
}
```

## 功能列表

### 规则管理

| Tool | 说明 |
|------|------|
| `getRules` | 获取所有规则和分组列表 |
| `createRule` | 创建新规则 |
| `updateRule` | 更新规则内容（同时启用） |
| `renameRule` | 重命名规则 |
| `deleteRule` | 删除规则 |
| `enableRule` | 启用规则 |
| `disableRule` | 禁用规则 |
| `setAllRulesState` | 批量启用/禁用所有规则 |

### 分组管理

| Tool | 说明 |
|------|------|
| `createGroup` | 创建规则分组 |
| `renameGroup` | 重命名分组 |
| `deleteGroup` | 删除分组 |
| `addRuleToGroup` | 将规则移入分组 |
| `removeRuleFromGroup` | 将规则移出分组 |

### Values 管理

| Tool | 说明 |
|------|------|
| `getValueList` | 获取值列表（仅名称） |
| `getValue` | 获取单个值的完整内容 |
| `createValue` | 创建新值 |
| `updateValue` | 更新值内容 |
| `renameValue` | 重命名值 |
| `deleteValue` | 删除值 |
| `createValuesGroup` | 创建值分组 |
| `renameValuesGroup` | 重命名值分组 |
| `deleteValuesGroup` | 删除值分组 |
| `addValueToGroup` | 将值移入分组 |
| `removeValueFromGroup` | 将值移出分组 |

### 代理控制

| Tool | 说明 |
|------|------|
| `getWhistleStatus` | 获取服务器状态 |
| `toggleHttpsInterception` | 启用/禁用 HTTPS 抓包 |
| `toggleHttp2` | 启用/禁用 HTTP/2 |
| `toggleMultiRuleMode` | 启用/禁用多规则模式 |

### 网络抓包

| Tool | 说明 |
|------|------|
| `getInterceptData` | 获取抓包数据（支持 URL 过滤） |
| `replayRequest` | 发送/重放 HTTP 请求 |
| `getCurrentTimestamp` | 获取当前时间戳（配合抓包使用） |

### 工具

| Tool | 说明 |
|------|------|
| `getClientProcessInfo` | 获取 Whistle Client 进程信息 |

## 使用示例

### Mock 接口

对话示例：

> 帮我 mock `https://api.example.com/user/info`，返回 `{"code":0,"data":{"name":"test"}}`

AI 执行步骤：
1. `createValue("mock-user-info")` — 创建值
2. `updateValue("mock-user-info", '{"code":0,"data":{"name":"test"}}')` — 写入 mock 数据
3. `updateRule("mock-user", "https://api.example.com/user/info resBody://{mock-user-info} resType://json")` — 创建规则并启用

验证：
```bash
curl -x http://127.0.0.1:8899 https://api.example.com/user/info -k
# 输出: {"code":0,"data":{"name":"test"}}
```

### 常用 Whistle 规则语法

```bash
# Mock JSON 响应
url resBody://{value-name} resType://json

# Mock 带状态码
url resBody://{value-name} replaceStatus://200

# 请求转发
url1 url2

# 修改请求头
url reqHeaders://{header-value}

# 修改响应头
url resHeaders://{header-value}

# 添加跨域头
url resCors://*

# 限速
url resSpeed://100

# 延迟响应
url resDelay://2000

# 直接返回文本
url resBody://hello

# 正则匹配
/api\/v[12]\/users/ resBody://{mock-users}
```

### 抓包分析

> 帮我看看最近有没有请求 `api.example.com`

AI 执行：
1. `getCurrentTimestamp()` — 获取时间参考
2. `getInterceptData({ url: "api.example.com", count: 10 })` — 过滤抓包数据

### 请求重放

> 帮我发一个 POST 请求到 `https://api.example.com/login`

AI 执行：
```
replayRequest({
  url: "https://api.example.com/login",
  method: "POST",
  headers: "Content-Type: application/json",
  body: '{"username":"test","password":"123456"}'
})
```

### 批量管理规则

> 把所有规则都禁用

AI 执行：`setAllRulesState({ disabled: true })`

> 只启用 "production" 这条规则

AI 执行：
1. `setAllRulesState({ disabled: true })` — 先全部禁用
2. `enableRule("production")` — 单独启用

## 开发

```bash
# 开发模式（热重载）
npm run dev

# 类型检查
npx tsc --noEmit

# 构建
npm run build
```

## 原理

```
Claude Code ←── stdio ──→ MCP Server ←── HTTP ──→ Whistle Client (localhost:8899)
                           (本项目)                  /cgi-bin/* API
```

MCP Server 启动时：
1. 读取 `~/.whistle_client.pid` 获取 Whistle 的端口和 Basic Auth 凭据
2. 通过 HTTP 调用 Whistle 的内部 CGI API（与 Web UI 使用同一套接口）
3. 通过 stdio 与 Claude Code 通信

## 注意事项

- 每次 Whistle Client 重启后认证凭据会变化，MCP Server 会自动重新读取（需重启 MCP 连接）
- 抓包数据需要先启用系统代理（客户端菜单 → Set As System Proxy）
- HTTPS 抓包需要先安装根证书（客户端菜单 → Install Root CA）
