import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { gunzipSync, inflateSync, brotliDecompressSync } from "zlib";
const PID_FILE = join(homedir(), ".whistle_client.pid");
function readPidFile() {
    try {
        const content = readFileSync(PID_FILE, "utf-8").trim();
        try {
            return JSON.parse(content);
        }
        catch {
            // Fallback: legacy comma-separated format
            const parts = content.split(",");
            return {
                pid: +parts[0],
                host: parts[1],
                port: +parts[2],
                auth: parts[4] || "",
            };
        }
    }
    catch {
        return null;
    }
}
export class WhistleClient {
    config;
    constructor(config = {}) {
        this.config = config;
    }
    getConnectionInfo() {
        const pidInfo = readPidFile();
        const host = this.config.host || pidInfo?.host || "127.0.0.1";
        const port = this.config.port || pidInfo?.port || 8899;
        const baseUrl = `http://${host}:${port}`;
        let authHeader;
        if (this.config.username) {
            const credentials = Buffer.from(`${this.config.username}:${this.config.password || ""}`).toString("base64");
            authHeader = `Basic ${credentials}`;
        }
        else if (pidInfo?.auth) {
            authHeader = `Basic ${pidInfo.auth}`;
        }
        return { baseUrl, authHeader };
    }
    async request(path, options = {}) {
        const { method = "GET", body, params } = options;
        const { baseUrl, authHeader } = this.getConnectionInfo();
        let url = `${baseUrl}${path}`;
        if (params) {
            url += `?${new URLSearchParams(params).toString()}`;
        }
        const headers = {
            Accept: "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "Cache-Control": "no-cache",
        };
        if (authHeader) {
            headers["Authorization"] = authHeader;
        }
        if (body) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
        const res = await fetch(url, {
            method,
            headers,
            body: body?.toString(),
        });
        if (!res.ok) {
            throw new Error(`Whistle API error: ${res.status} ${res.statusText}`);
        }
        const text = await res.text();
        try {
            return JSON.parse(text);
        }
        catch {
            return text;
        }
    }
    clientId() {
        return `${Date.now()}-${Math.floor(Math.random() * 100)}`;
    }
    // ===== Rules =====
    async getRules() {
        return this.request("/cgi-bin/rules/list");
    }
    async createRule(name) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("name", name);
        return this.request("/cgi-bin/rules/add", { method: "POST", body: form });
    }
    async updateRule(name, value) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("name", name);
        form.append("value", value);
        form.append("selected", "true");
        form.append("active", "true");
        const isDefault = name.toLowerCase() === "default";
        const endpoint = isDefault
            ? "/cgi-bin/rules/enable-default"
            : "/cgi-bin/rules/select";
        return this.request(endpoint, { method: "POST", body: form });
    }
    async renameRule(name, newName) {
        if (name.toLowerCase() === "default") {
            throw new Error("Cannot rename the 'Default' rule");
        }
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("name", name);
        form.append("newName", newName);
        return this.request("/cgi-bin/rules/rename", {
            method: "POST",
            body: form,
        });
    }
    async deleteRule(name) {
        const form = new URLSearchParams();
        form.append("list[]", name);
        return this.request("/cgi-bin/rules/remove", {
            method: "POST",
            body: form,
        });
    }
    async selectRule(name) {
        const rules = await this.getRules();
        const isDefault = name.toLowerCase() === "default";
        let value = "";
        if (isDefault) {
            value = rules.defaultRules || "";
        }
        else {
            const rule = rules.list?.find((r) => r.name === name);
            if (!rule)
                throw new Error(`Rule '${name}' not found`);
            value = rule.data || "";
        }
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("name", name);
        form.append("value", value);
        form.append("selected", "true");
        const endpoint = isDefault
            ? "/cgi-bin/rules/enable-default"
            : "/cgi-bin/rules/select";
        return this.request(endpoint, { method: "POST", body: form });
    }
    async unselectRule(name) {
        const rules = await this.getRules();
        const isDefault = name.toLowerCase() === "default";
        let value = "";
        if (isDefault) {
            value = rules.defaultRules || "";
        }
        else {
            const rule = rules.list?.find((r) => r.name === name);
            if (!rule)
                throw new Error(`Rule '${name}' not found`);
            value = rule.data || "";
        }
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("name", name);
        form.append("value", value);
        const endpoint = isDefault
            ? "/cgi-bin/rules/disable-default"
            : "/cgi-bin/rules/unselect";
        return this.request(endpoint, { method: "POST", body: form });
    }
    async disableAllRules(disabled) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("disabledAllRules", disabled ? "1" : "0");
        return this.request("/cgi-bin/rules/disable-all-rules", {
            method: "POST",
            body: form,
        });
    }
    // ===== Groups =====
    async createGroup(name) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("name", `\r${name}`);
        return this.request("/cgi-bin/rules/add", { method: "POST", body: form });
    }
    async renameGroup(name, newName) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("name", `\r${name}`);
        form.append("newName", `\r${newName}`);
        return this.request("/cgi-bin/rules/rename", {
            method: "POST",
            body: form,
        });
    }
    async deleteGroup(name) {
        const form = new URLSearchParams();
        form.append("list[]", `\r${name}`);
        return this.request("/cgi-bin/rules/remove", {
            method: "POST",
            body: form,
        });
    }
    async moveRuleToGroup(ruleName, groupName) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("from", ruleName);
        form.append("to", `\r${groupName}`);
        form.append("group", "false");
        return this.request("/cgi-bin/rules/move-to", {
            method: "POST",
            body: form,
        });
    }
    async moveRuleOutOfGroup(ruleName) {
        const rules = await this.getRules();
        const firstRule = rules.list?.[0]?.name;
        if (!firstRule)
            throw new Error("No rules exist");
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("from", ruleName);
        form.append("to", firstRule);
        form.append("group", "false");
        return this.request("/cgi-bin/rules/move-to", {
            method: "POST",
            body: form,
        });
    }
    // ===== Values =====
    async getAllValues() {
        const data = await this.request("/cgi-bin/init", {
            params: { _: String(Date.now()) },
        });
        return data?.values?.list || [];
    }
    async getValueList() {
        const list = await this.getAllValues();
        return list.map((item, i) => ({
            index: item.index ?? i,
            name: item.name,
        }));
    }
    async getValue(name) {
        const list = await this.getAllValues();
        const value = list.find((item) => item.name === name);
        if (!value)
            throw new Error(`Value '${name}' not found`);
        return value;
    }
    async createValue(name) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("name", name);
        return this.request("/cgi-bin/values/add", { method: "POST", body: form });
    }
    async updateValue(name, value) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("name", name);
        form.append("value", value);
        return this.request("/cgi-bin/values/add", { method: "POST", body: form });
    }
    async renameValue(name, newName) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("name", name);
        form.append("newName", newName);
        return this.request("/cgi-bin/values/rename", {
            method: "POST",
            body: form,
        });
    }
    async deleteValue(name) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("list[]", name);
        return this.request("/cgi-bin/values/remove", {
            method: "POST",
            body: form,
        });
    }
    async createValueGroup(name) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("name", `\r${name}`);
        return this.request("/cgi-bin/values/add", { method: "POST", body: form });
    }
    async renameValueGroup(name, newName) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("name", `\r${name}`);
        form.append("newName", `\r${newName}`);
        return this.request("/cgi-bin/values/rename", {
            method: "POST",
            body: form,
        });
    }
    async deleteValueGroup(name) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("list[]", `\r${name}`);
        return this.request("/cgi-bin/values/remove", {
            method: "POST",
            body: form,
        });
    }
    async moveValueToGroup(valueName, groupName) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("from", valueName);
        form.append("to", `\r${groupName}`);
        form.append("group", "false");
        return this.request("/cgi-bin/values/move-to", {
            method: "POST",
            body: form,
        });
    }
    async moveValueOutOfGroup(valueName) {
        const values = await this.getAllValues();
        const first = values[0]?.name;
        if (!first)
            throw new Error("No values exist");
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("from", valueName);
        form.append("to", first);
        form.append("group", "false");
        return this.request("/cgi-bin/values/move-to", {
            method: "POST",
            body: form,
        });
    }
    // ===== Proxy Control =====
    async getStatus() {
        const data = await this.request("/cgi-bin/init", {
            params: { _: String(Date.now()) },
        });
        const { rules, values, ...rest } = data;
        return rest;
    }
    async toggleHttpsInterception(enabled) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("interceptHttpsConnects", enabled ? "1" : "0");
        return this.request("/cgi-bin/intercept-https-connects", {
            method: "POST",
            body: form,
        });
    }
    async toggleHttp2(enabled) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("enableHttp2", enabled ? "1" : "0");
        return this.request("/cgi-bin/enable-http2", {
            method: "POST",
            body: form,
        });
    }
    async toggleMultiRuleMode(enabled) {
        const form = new URLSearchParams();
        form.append("clientId", this.clientId());
        form.append("allowMultipleChoice", enabled ? "1" : "0");
        return this.request("/cgi-bin/rules/allow-multiple-choice", {
            method: "POST",
            body: form,
        });
    }
    // ===== Network Intercept =====
    /**
     * 调用 whistle 的 /cgi-bin/get-data 拉取一页抓包数据。
     *
     * 该 CGI 的响应是三层嵌套：{ ec, ..., data: { ids, newIds, data: {真正的 items}, lastId, endId } }。
     * 旧实现只取了中间层（data.data），导致 items 与 ids/newIds 等元数据混在一起，过滤失效——这里取到最内层。
     *
     * 游标语义（见 whistle/lib/util/data-server.js#getIds）：
     *  - startTime 为空        → 返回最新的 count 条（ids.slice(-count)）
     *  - startTime = 某个 id   → 返回该 id 之后（更新）的 count 条，用于向前翻页
     *  - startTime = 0         → 返回最旧的 count 条
     */
    async fetchDataPage(options) {
        const now = Date.now();
        const params = {
            clientId: this.clientId(),
            startLogTime: "-2",
            startSvrLogTime: "-2",
            ids: "",
            dumpCount: "0",
            logId: "",
            count: String(options.count ?? 100),
            _: String(now),
        };
        // 仅在显式传入游标时才带上 startTime/lastRowId；留空表示“最新 N 条”。
        if (options.startTime) {
            params.startTime = options.startTime;
            params.lastRowId = options.startTime;
        }
        const resp = await this.request("/cgi-bin/get-data", { params });
        const inner = resp?.data || {};
        return {
            items: inner.data || {},
            lastId: inner.lastId || inner.endId,
            endId: inner.endId,
        };
    }
    /**
     * 抓包概览查询：跨多页扫描最近的请求，按 host / path / app(User-Agent) / method / 状态码 / 时间窗口过滤，
     * 返回精简的概览列表（每条仅含关键字段，不含 body），适合 AI 快速浏览。完整内容用 getRequestDetail(id) 获取。
     */
    async getInterceptData(options = {}) {
        const wanted = options.count ?? 20;
        // 最多扫描多少条原始抓包记录（whistle 单页上限 100），默认扫 1000 条足够覆盖近期流量。
        const scanLimit = Math.min(options.scanLimit ?? 1000, 5000);
        const matched = [];
        let scanned = 0;
        // get-data 的游标只支持“向更新方向”翻页（getIds 返回某 id/时间之后的数据）。
        // 有时间下界时，以其为起点逐页向新翻页；无下界时取最新一页即可覆盖近期流量。
        if (options.startTime) {
            // id 形如 "<ms>-<seq>"，可按字符串与时间戳比较，故用 "<ms>-000" 作为窗口下界游标。
            let cursor = `${options.startTime}-000`;
            let endId;
            while (scanned < scanLimit) {
                const page = await this.fetchDataPage({ startTime: cursor, count: 100 });
                const ids = Object.keys(page.items);
                if (endId === undefined)
                    endId = page.endId; // 记录起始时缓冲区的最新 id
                if (ids.length === 0)
                    break;
                for (const id of ids) {
                    scanned++;
                    const summary = this.toSummary(page.items[id]);
                    if (this.matchSummary(summary, options))
                        matched.push(summary);
                }
                const lastSeen = ids[ids.length - 1];
                if (endId && lastSeen === endId)
                    break; // 已追上最新
                cursor = lastSeen;
                if (ids.length < 100)
                    break; // 不足一页说明已到末尾
            }
        }
        else {
            const page = await this.fetchDataPage({ count: Math.min(scanLimit, 100) });
            for (const id of Object.keys(page.items)) {
                scanned++;
                const summary = this.toSummary(page.items[id]);
                if (this.matchSummary(summary, options))
                    matched.push(summary);
            }
        }
        // 概览默认按时间倒序（最新在前），并截断到 count。
        matched.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
        return {
            total: matched.length,
            scanned,
            summaries: matched.slice(0, wanted),
        };
    }
    /**
     * 解析抓包 URL 为 host / path。
     * 兼容三种形态：标准 URL（https://host/path）、CONNECT 隧道（host:443，无 scheme）、
     * 以及 whistle 内部的 tunnel:// 前缀。
     */
    parseUrl(url, fallbackHost) {
        if (!url)
            return { host: fallbackHost || "", path: "" };
        // 仅当存在 "://" 时才视为标准 URL；否则是 CONNECT 隧道地址，形如 "host:443[/...]"。
        // 注意：new URL("host:443") 会错误地把 "host:" 当成 scheme，故必须先判断 "://"。
        if (url.includes("://")) {
            try {
                const u = new URL(url);
                return { host: u.host, path: u.pathname + (u.search || "") };
            }
            catch {
                /* fall through */
            }
        }
        const slash = url.indexOf("/");
        const hostPart = slash === -1 ? url : url.slice(0, slash);
        const path = slash === -1 ? "" : url.slice(slash);
        return { host: hostPart || fallbackHost || "", path };
    }
    /** 把一条原始抓包 item 压缩成概览对象（无 body）。 */
    toSummary(item) {
        if (!item)
            return null;
        const req = item.req || {};
        const res = item.res || {};
        const headers = req.headers || {};
        const ua = headers["user-agent"] || "";
        const { host, path } = this.parseUrl(item.url, headers.host);
        const cost = item.endTime && item.startTime ? item.endTime - item.startTime : undefined;
        return {
            id: item.id,
            url: item.url,
            host,
            path,
            method: req.method || "GET",
            statusCode: res.statusCode,
            app: ua, // App 标识：移动端请求的 User-Agent 通常即 App 名/版本
            reqSize: req.size,
            resSize: res.size,
            contentType: (res.headers && res.headers["content-type"]) || undefined,
            startTime: item.startTime,
            endTime: item.endTime,
            costMs: cost,
            isHttps: !!item.isHttps || /^https:/.test(item.url || ""),
        };
    }
    /** 概览级过滤：host / path / app / method / 状态码 / 时间窗口 / url 关键字（正则）。 */
    matchSummary(s, f) {
        if (!s)
            return false;
        if (f.url) {
            let ok;
            try {
                ok = new RegExp(f.url, "i").test(s.url || "");
            }
            catch {
                ok = (s.url || "").toLowerCase().includes(f.url.toLowerCase());
            }
            if (!ok)
                return false;
        }
        if (f.host && !(s.host || "").toLowerCase().includes(f.host.toLowerCase()))
            return false;
        if (f.path && !(s.path || "").toLowerCase().includes(f.path.toLowerCase()))
            return false;
        if (f.app && !(s.app || "").toLowerCase().includes(f.app.toLowerCase()))
            return false;
        if (f.method && (s.method || "").toUpperCase() !== f.method.toUpperCase())
            return false;
        if (f.statusCode != null && s.statusCode !== f.statusCode)
            return false;
        if (f.startTime != null && (s.startTime || 0) < f.startTime)
            return false;
        if (f.endTime != null && (s.startTime || 0) > f.endTime)
            return false;
        return true;
    }
    /**
     * 按抓包 id 获取单条请求的完整详情（含请求/响应头、解码后的 body、计时信息）。
     * 用 get-data 的 ids= 参数直接按 id 取回完整 item（无 get-session 的就绪门槛限制）。
     */
    async getRequestDetail(id, options = {}) {
        const now = Date.now();
        const params = {
            clientId: this.clientId(),
            startLogTime: "-1",
            startSvrLogTime: "-2",
            ids: id,
            startTime: "-1",
            dumpCount: "0",
            count: "1",
            _: String(now),
        };
        const resp = await this.request("/cgi-bin/get-data", { params });
        const items = resp?.data?.data || {};
        const item = items[id];
        if (!item) {
            throw new Error(`Request '${id}' not found (可能已被缓冲区淘汰，请用 getInterceptData 重新获取最新 id)`);
        }
        const maxBody = options.maxBodyLength ?? 50000;
        const req = item.req || {};
        const res = item.res || {};
        const reqBody = this.buildBodyInfo(req, maxBody);
        const resBody = this.buildBodyInfo(res, maxBody);
        const { host, path } = this.parseUrl(item.url, req.headers && req.headers.host);
        return {
            id: item.id,
            url: item.url,
            host,
            path,
            isHttps: !!item.isHttps || /^https:/.test(item.url || ""),
            request: {
                method: req.method,
                httpVersion: req.httpVersion,
                clientIp: req.ip,
                headers: req.headers || {},
                size: req.size,
                ...reqBody,
            },
            response: {
                statusCode: res.statusCode,
                serverIp: res.ip,
                headers: res.headers || {},
                size: res.size,
                ...resBody,
            },
            timing: {
                startTime: item.startTime,
                dnsTime: item.dnsTime,
                requestTime: item.requestTime,
                responseTime: item.responseTime,
                endTime: item.endTime,
                costMs: item.endTime && item.startTime
                    ? item.endTime - item.startTime
                    : undefined,
            },
            rules: item.rules,
        };
    }
    /**
     * 组装单侧（req/res）的 body 信息。在 decodeBody 之上补充 bodyOmitted 提示：
     * 当 size>0 却拿不到 body 时，多半是 body 超过了 whistle 自身的抓包留存上限（默认约 2MB，
     * 见 whistle/lib/inspectors/data.js 的 MAX_REQ_BODY_SIZE/MAX_RES_BODY_SIZE），whistle 只记录了
     * size 而未保留内容——此时 body 为空属正常，不代表请求真的没有内容。
     */
    buildBodyInfo(part, maxLength) {
        const decoded = this.decodeBody(part, maxLength);
        const result = {
            body: decoded.text,
            bodyEncoding: decoded.encoding,
            bodyTruncated: decoded.truncated,
        };
        const size = part && part.size;
        if (!decoded.text && size > 0) {
            result.bodyOmitted = `body 内容未留存（实际大小约 ${size} 字节）。通常因为超过 whistle 抓包留存上限（默认约 2MB），仅保留 size 元数据；并非请求/响应真的为空。`;
        }
        return result;
    }
    /**
     * 解码抓包 body：base64 -> Buffer ->（按 content-encoding 解压）-> 文本。
     * 二进制内容（图片等）以 base64 形式返回，并标注 encoding=base64。
     */
    decodeBody(part, maxLength) {
        const b64 = part && part.base64;
        if (!b64)
            return { text: "", encoding: "none", truncated: false };
        let buf;
        try {
            buf = Buffer.from(b64, "base64");
        }
        catch {
            return { text: "", encoding: "none", truncated: false };
        }
        const ce = ((part.headers && part.headers["content-encoding"]) ||
            "").toLowerCase();
        try {
            if (ce.includes("br"))
                buf = brotliDecompressSync(buf);
            else if (ce.includes("gzip"))
                buf = gunzipSync(buf);
            else if (ce.includes("deflate"))
                buf = inflateSync(buf);
        }
        catch {
            // 解压失败则保留原始字节
        }
        const ct = ((part.headers && part.headers["content-type"]) ||
            "").toLowerCase();
        const looksText = /text\/|json|xml|javascript|x-www-form-urlencoded|html|csv/.test(ct) ||
            this.isProbablyText(buf);
        if (!looksText) {
            const truncated = buf.length > maxLength;
            return {
                text: buf.subarray(0, maxLength).toString("base64"),
                encoding: "base64",
                truncated,
            };
        }
        const truncated = buf.length > maxLength;
        return {
            text: buf.subarray(0, maxLength).toString("utf8"),
            encoding: "utf8",
            truncated,
        };
    }
    /** 粗略判断 Buffer 是否为可读文本（无 content-type 时的兜底）。 */
    isProbablyText(buf) {
        const len = Math.min(buf.length, 512);
        if (len === 0)
            return true;
        let nonText = 0;
        for (let i = 0; i < len; i++) {
            const c = buf[i];
            if (c === 9 || c === 10 || c === 13)
                continue; // tab/lf/cr
            if (c < 32 || c === 127)
                nonText++;
        }
        return nonText / len < 0.1;
    }
    // ===== Composer (Replay) =====
    async replayRequest(options) {
        const form = new URLSearchParams();
        form.append("useH2", options.useH2 ? "true" : "");
        form.append("url", options.url);
        form.append("method", options.method || "GET");
        if (options.headers)
            form.append("headers", options.headers);
        if (options.body)
            form.append("body", options.body);
        return this.request("/cgi-bin/composer", { method: "POST", body: form });
    }
    // ===== Client Info =====
    getClientInfo() {
        return readPidFile();
    }
}
