import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const PID_FILE = join(homedir(), ".whistle_client.pid");

interface WhistleClientConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

interface PidInfo {
  pid: number;
  host: string;
  port: number;
  auth: string; // base64(username:password)
}

function readPidFile(): PidInfo | null {
  try {
    const content = readFileSync(PID_FILE, "utf-8").trim();
    try {
      return JSON.parse(content) as PidInfo;
    } catch {
      // Fallback: legacy comma-separated format
      const parts = content.split(",");
      return {
        pid: +parts[0],
        host: parts[1],
        port: +parts[2],
        auth: parts[4] || "",
      };
    }
  } catch {
    return null;
  }
}

export class WhistleClient {
  private readonly config: WhistleClientConfig;

  constructor(config: WhistleClientConfig = {}) {
    this.config = config;
  }

  private getConnectionInfo(): { baseUrl: string; authHeader?: string } {
    const pidInfo = readPidFile();
    const host = this.config.host || pidInfo?.host || "127.0.0.1";
    const port = this.config.port || pidInfo?.port || 8899;
    const baseUrl = `http://${host}:${port}`;

    let authHeader: string | undefined;
    if (this.config.username) {
      const credentials = Buffer.from(
        `${this.config.username}:${this.config.password || ""}`
      ).toString("base64");
      authHeader = `Basic ${credentials}`;
    } else if (pidInfo?.auth) {
      authHeader = `Basic ${pidInfo.auth}`;
    }
    return { baseUrl, authHeader };
  }

  private async request(
    path: string,
    options: {
      method?: string;
      body?: URLSearchParams | string;
      params?: Record<string, string>;
    } = {}
  ): Promise<any> {
    const { method = "GET", body, params } = options;
    const { baseUrl, authHeader } = this.getConnectionInfo();
    let url = `${baseUrl}${path}`;
    if (params) {
      url += `?${new URLSearchParams(params).toString()}`;
    }

    const headers: Record<string, string> = {
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
    } catch {
      return text;
    }
  }

  private clientId(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 100)}`;
  }

  // ===== Rules =====

  async getRules(): Promise<any> {
    return this.request("/cgi-bin/rules/list");
  }

  async createRule(name: string): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("name", name);
    return this.request("/cgi-bin/rules/add", { method: "POST", body: form });
  }

  async updateRule(name: string, value: string): Promise<any> {
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

  async renameRule(name: string, newName: string): Promise<any> {
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

  async deleteRule(name: string): Promise<any> {
    const form = new URLSearchParams();
    form.append("list[]", name);
    return this.request("/cgi-bin/rules/remove", {
      method: "POST",
      body: form,
    });
  }

  async selectRule(name: string): Promise<any> {
    const rules = await this.getRules();
    const isDefault = name.toLowerCase() === "default";
    let value = "";
    if (isDefault) {
      value = rules.defaultRules || "";
    } else {
      const rule = rules.list?.find((r: any) => r.name === name);
      if (!rule) throw new Error(`Rule '${name}' not found`);
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

  async unselectRule(name: string): Promise<any> {
    const rules = await this.getRules();
    const isDefault = name.toLowerCase() === "default";
    let value = "";
    if (isDefault) {
      value = rules.defaultRules || "";
    } else {
      const rule = rules.list?.find((r: any) => r.name === name);
      if (!rule) throw new Error(`Rule '${name}' not found`);
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

  async disableAllRules(disabled: boolean): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("disabledAllRules", disabled ? "1" : "0");
    return this.request("/cgi-bin/rules/disable-all-rules", {
      method: "POST",
      body: form,
    });
  }

  // ===== Groups =====

  async createGroup(name: string): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("name", `\r${name}`);
    return this.request("/cgi-bin/rules/add", { method: "POST", body: form });
  }

  async renameGroup(name: string, newName: string): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("name", `\r${name}`);
    form.append("newName", `\r${newName}`);
    return this.request("/cgi-bin/rules/rename", {
      method: "POST",
      body: form,
    });
  }

  async deleteGroup(name: string): Promise<any> {
    const form = new URLSearchParams();
    form.append("list[]", `\r${name}`);
    return this.request("/cgi-bin/rules/remove", {
      method: "POST",
      body: form,
    });
  }

  async moveRuleToGroup(ruleName: string, groupName: string): Promise<any> {
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

  async moveRuleOutOfGroup(ruleName: string): Promise<any> {
    const rules = await this.getRules();
    const firstRule = rules.list?.[0]?.name;
    if (!firstRule) throw new Error("No rules exist");

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

  async getAllValues(): Promise<any[]> {
    const data = await this.request("/cgi-bin/init", {
      params: { _: String(Date.now()) },
    });
    return data?.values?.list || [];
  }

  async getValueList(): Promise<{ index: number; name: string }[]> {
    const list = await this.getAllValues();
    return list.map((item: any, i: number) => ({
      index: item.index ?? i,
      name: item.name,
    }));
  }

  async getValue(name: string): Promise<any> {
    const list = await this.getAllValues();
    const value = list.find((item: any) => item.name === name);
    if (!value) throw new Error(`Value '${name}' not found`);
    return value;
  }

  async createValue(name: string): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("name", name);
    return this.request("/cgi-bin/values/add", { method: "POST", body: form });
  }

  async updateValue(name: string, value: string): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("name", name);
    form.append("value", value);
    return this.request("/cgi-bin/values/add", { method: "POST", body: form });
  }

  async renameValue(name: string, newName: string): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("name", name);
    form.append("newName", newName);
    return this.request("/cgi-bin/values/rename", {
      method: "POST",
      body: form,
    });
  }

  async deleteValue(name: string): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("list[]", name);
    return this.request("/cgi-bin/values/remove", {
      method: "POST",
      body: form,
    });
  }

  async createValueGroup(name: string): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("name", `\r${name}`);
    return this.request("/cgi-bin/values/add", { method: "POST", body: form });
  }

  async renameValueGroup(name: string, newName: string): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("name", `\r${name}`);
    form.append("newName", `\r${newName}`);
    return this.request("/cgi-bin/values/rename", {
      method: "POST",
      body: form,
    });
  }

  async deleteValueGroup(name: string): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("list[]", `\r${name}`);
    return this.request("/cgi-bin/values/remove", {
      method: "POST",
      body: form,
    });
  }

  async moveValueToGroup(valueName: string, groupName: string): Promise<any> {
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

  async moveValueOutOfGroup(valueName: string): Promise<any> {
    const values = await this.getAllValues();
    const first = values[0]?.name;
    if (!first) throw new Error("No values exist");

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

  async getStatus(): Promise<any> {
    const data = await this.request("/cgi-bin/init", {
      params: { _: String(Date.now()) },
    });
    const { rules, values, ...rest } = data;
    return rest;
  }

  async toggleHttpsInterception(enabled: boolean): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("interceptHttpsConnects", enabled ? "1" : "0");
    return this.request("/cgi-bin/intercept-https-connects", {
      method: "POST",
      body: form,
    });
  }

  async toggleHttp2(enabled: boolean): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("enableHttp2", enabled ? "1" : "0");
    return this.request("/cgi-bin/enable-http2", {
      method: "POST",
      body: form,
    });
  }

  async toggleMultiRuleMode(enabled: boolean): Promise<any> {
    const form = new URLSearchParams();
    form.append("clientId", this.clientId());
    form.append("allowMultipleChoice", enabled ? "1" : "0");
    return this.request("/cgi-bin/rules/allow-multiple-choice", {
      method: "POST",
      body: form,
    });
  }

  // ===== Network Intercept =====

  async getInterceptData(
    options: {
      startTime?: string;
      count?: number;
      lastRowId?: string;
    } = {}
  ): Promise<any> {
    const now = Date.now();
    const params: Record<string, string> = {
      clientId: this.clientId(),
      startLogTime: "-2",
      startSvrLogTime: "-2",
      ids: "",
      startTime: options.startTime || `${now}-000`,
      dumpCount: "0",
      lastRowId: options.lastRowId || options.startTime || `${now}-000`,
      logId: "",
      count: String(options.count || 20),
      _: String(now),
    };
    const data = await this.request("/cgi-bin/get-data", { params });
    return data?.data || {};
  }

  // ===== Composer (Replay) =====

  async replayRequest(options: {
    url: string;
    method?: string;
    headers?: string;
    body?: string;
    useH2?: boolean;
  }): Promise<any> {
    const form = new URLSearchParams();
    form.append("useH2", options.useH2 ? "true" : "");
    form.append("url", options.url);
    form.append("method", options.method || "GET");
    if (options.headers) form.append("headers", options.headers);
    if (options.body) form.append("body", options.body);
    return this.request("/cgi-bin/composer", { method: "POST", body: form });
  }

  // ===== Client Info =====

  getClientInfo(): PidInfo | null {
    return readPidFile();
  }
}
