import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { WhistleClient } from "./whistle-client.js";
const host = process.env.WHISTLE_HOST;
const port = process.env.WHISTLE_PORT
    ? parseInt(process.env.WHISTLE_PORT, 10)
    : undefined;
const username = process.env.WHISTLE_USERNAME;
const password = process.env.WHISTLE_PASSWORD;
const client = new WhistleClient({ host, port, username, password });
const server = new McpServer({
    name: "whistle-client-mcp",
    version: "1.0.0",
});
// ===== Rules =====
server.tool("getRules", "获取所有规则和分组列表", {}, async () => {
    const rules = await client.getRules();
    return { content: [{ type: "text", text: JSON.stringify(rules, null, 2) }] };
});
server.tool("createRule", "创建新规则", { name: z.string().describe("规则名称") }, async ({ name }) => {
    const result = await client.createRule(name);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("updateRule", "更新规则内容（同时启用该规则）", {
    name: z.string().describe("规则名称"),
    value: z.string().describe("规则内容（whistle 规则语法）"),
}, async ({ name, value }) => {
    const result = await client.updateRule(name, value);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("renameRule", "重命名规则", {
    name: z.string().describe("规则现有名称"),
    newName: z.string().describe("规则的新名称"),
}, async ({ name, newName }) => {
    const result = await client.renameRule(name, newName);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("deleteRule", "删除规则", { name: z.string().describe("要删除的规则名称") }, async ({ name }) => {
    const result = await client.deleteRule(name);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("enableRule", "启用规则", { name: z.string().describe("规则名称") }, async ({ name }) => {
    const result = await client.selectRule(name);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("disableRule", "禁用规则", { name: z.string().describe("规则名称") }, async ({ name }) => {
    const result = await client.unselectRule(name);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("setAllRulesState", "启用或禁用所有规则", { disabled: z.boolean().describe("true=禁用所有规则, false=启用所有规则") }, async ({ disabled }) => {
    const result = await client.disableAllRules(disabled);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
// ===== Groups =====
server.tool("createGroup", "创建新的规则分组", { name: z.string().describe("分组名称") }, async ({ name }) => {
    const result = await client.createGroup(name);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("renameGroup", "重命名规则分组", {
    name: z.string().describe("分组现有名称"),
    newName: z.string().describe("分组的新名称"),
}, async ({ name, newName }) => {
    const result = await client.renameGroup(name, newName);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("deleteGroup", "删除规则分组", { name: z.string().describe("分组名称") }, async ({ name }) => {
    const result = await client.deleteGroup(name);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("addRuleToGroup", "将规则移动到指定分组", {
    ruleName: z.string().describe("规则名称"),
    groupName: z.string().describe("目标分组名称"),
}, async ({ ruleName, groupName }) => {
    const result = await client.moveRuleToGroup(ruleName, groupName);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("removeRuleFromGroup", "将规则移出分组（移到顶层）", { ruleName: z.string().describe("规则名称") }, async ({ ruleName }) => {
    const result = await client.moveRuleOutOfGroup(ruleName);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
// ===== Values =====
server.tool("getValueList", "获取值列表（仅名称，不含数据内容）", {}, async () => {
    const list = await client.getValueList();
    return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
});
server.tool("getValue", "获取单个值的完整内容", { name: z.string().describe("值名称") }, async ({ name }) => {
    const value = await client.getValue(name);
    return {
        content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    };
});
server.tool("createValue", "创建新的值", { name: z.string().describe("值名称") }, async ({ name }) => {
    const result = await client.createValue(name);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("updateValue", "更新值内容", {
    name: z.string().describe("值名称"),
    value: z.string().describe("新的值内容"),
}, async ({ name, value }) => {
    const result = await client.updateValue(name, value);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("renameValue", "重命名值", {
    name: z.string().describe("值现有名称"),
    newName: z.string().describe("值的新名称"),
}, async ({ name, newName }) => {
    const result = await client.renameValue(name, newName);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("deleteValue", "删除值", { name: z.string().describe("值名称") }, async ({ name }) => {
    const result = await client.deleteValue(name);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("createValuesGroup", "创建新的值分组", { name: z.string().describe("分组名称") }, async ({ name }) => {
    const result = await client.createValueGroup(name);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("renameValuesGroup", "重命名值分组", {
    name: z.string().describe("分组现有名称"),
    newName: z.string().describe("分组的新名称"),
}, async ({ name, newName }) => {
    const result = await client.renameValueGroup(name, newName);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("deleteValuesGroup", "删除值分组", { name: z.string().describe("分组名称") }, async ({ name }) => {
    const result = await client.deleteValueGroup(name);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("addValueToGroup", "将值移动到指定分组", {
    valueName: z.string().describe("值名称"),
    groupName: z.string().describe("目标分组名称"),
}, async ({ valueName, groupName }) => {
    const result = await client.moveValueToGroup(valueName, groupName);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("removeValueFromGroup", "将值移出分组（移到顶层）", { valueName: z.string().describe("值名称") }, async ({ valueName }) => {
    const result = await client.moveValueOutOfGroup(valueName);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
// ===== Proxy Control =====
server.tool("getWhistleStatus", "获取 Whistle 服务器当前状态", {}, async () => {
    const status = await client.getStatus();
    return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
    };
});
server.tool("toggleHttpsInterception", "启用或禁用 HTTPS 拦截（抓包）", { enabled: z.boolean().describe("是否启用 HTTPS 拦截") }, async ({ enabled }) => {
    const result = await client.toggleHttpsInterception(enabled);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("toggleHttp2", "启用或禁用 HTTP/2", { enabled: z.boolean().describe("是否启用 HTTP/2") }, async ({ enabled }) => {
    const result = await client.toggleHttp2(enabled);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
server.tool("toggleMultiRuleMode", "启用或禁用多规则模式（允许同时启用多条规则）", { enabled: z.boolean().describe("是否启用多规则模式") }, async ({ enabled }) => {
    const result = await client.toggleMultiRuleMode(enabled);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
// ===== Network Intercept =====
server.tool("getInterceptData", "获取抓包概览列表（捕获的网络请求，每条仅含关键字段，不含 body）。支持按 host/path/app/method/状态码/时间窗口过滤。需要完整内容时用返回的 id 调用 getRequestDetail。", {
    url: z
        .string()
        .optional()
        .describe("按完整 URL 过滤（支持正则表达式，大小写不敏感）"),
    host: z
        .string()
        .optional()
        .describe("按域名过滤（子串匹配，如 api.example.com）"),
    path: z
        .string()
        .optional()
        .describe("按路径过滤（子串匹配，如 /user/info）"),
    app: z
        .string()
        .optional()
        .describe("按发起请求的 App 过滤（匹配 User-Agent 子串，移动端 UA 通常即 App 名/版本）"),
    method: z
        .string()
        .optional()
        .describe("按请求方法过滤（GET/POST/PUT/...）"),
    statusCode: z
        .number()
        .optional()
        .describe("按响应状态码精确过滤（如 200、404、503）"),
    startTime: z
        .number()
        .optional()
        .describe("起始时间戳(ms)，只返回该时间之后的请求；不传则取缓冲区最新的一页"),
    endTime: z
        .number()
        .optional()
        .describe("结束时间戳(ms)，只返回该时间之前的请求"),
    count: z.number().optional().describe("返回概览条数，默认20条"),
    scanLimit: z
        .number()
        .optional()
        .describe("最多扫描多少条原始抓包记录用于过滤，默认1000，上限5000（仅在指定 startTime 时分页生效）"),
}, async (args) => {
    const result = await client.getInterceptData(args);
    return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
});
server.tool("getRequestDetail", "通过抓包 id 获取单条请求的完整详情：请求/响应头、解码后的 body（自动 gunzip/brotli/deflate 解压；二进制以 base64 返回）、计时与命中规则。id 来自 getInterceptData 返回的概览。\n注意 body 有两层上限：(1) whistle 自身抓包留存上限默认约 2MB，超过则不保留 body 内容、仅记录 size——此时返回中 body 为空但带 bodyOmitted 说明，不代表请求真的没有内容；(2) 本工具的 maxBodyLength 截断，超出会标记 bodyTruncated=true，调大该参数即可取回更多（上限仍受 whistle 的 2MB 约束）。", {
    id: z.string().describe("抓包 id（getInterceptData 概览中的 id 字段）"),
    maxBodyLength: z
        .number()
        .optional()
        .describe("请求/响应 body 的最大返回长度（字符/字节），默认 50000，超出会截断并标记 bodyTruncated。whistle 留存的 body 最大约 2MB，可据此调大"),
}, async ({ id, maxBodyLength }) => {
    const detail = await client.getRequestDetail(id, { maxBodyLength });
    return {
        content: [{ type: "text", text: JSON.stringify(detail, null, 2) }],
    };
});
// ===== Composer =====
server.tool("replayRequest", "发送/重放 HTTP 请求（通过 Whistle Composer，请求会经过代理规则处理）", {
    url: z.string().describe("请求 URL"),
    method: z.string().optional().describe("请求方法，默认 GET"),
    headers: z
        .string()
        .optional()
        .describe("请求头（每行一个 Header: Value 格式）"),
    body: z.string().optional().describe("请求体"),
    useH2: z.boolean().optional().describe("是否使用 HTTP/2"),
}, async ({ url, method, headers, body, useH2 }) => {
    const result = await client.replayRequest({
        url,
        method,
        headers,
        body,
        useH2,
    });
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
// ===== Utility =====
server.tool("getCurrentTimestamp", "获取当前本地时间戳（用于 getInterceptData 的 startTime 参数）", {}, async () => {
    return {
        content: [{ type: "text", text: JSON.stringify({ timestamp: Date.now() }) }],
    };
});
server.tool("getClientProcessInfo", "获取 Whistle Client 进程信息（PID、监听地址）", {}, async () => {
    const info = client.getClientInfo();
    const { auth: _, ...safe } = info || {};
    return { content: [{ type: "text", text: JSON.stringify(safe) }] };
});
// ===== Start =====
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
});
