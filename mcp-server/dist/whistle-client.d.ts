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
    auth: string;
}
export declare class WhistleClient {
    private readonly config;
    constructor(config?: WhistleClientConfig);
    private getConnectionInfo;
    private request;
    private clientId;
    getRules(): Promise<any>;
    createRule(name: string): Promise<any>;
    updateRule(name: string, value: string): Promise<any>;
    renameRule(name: string, newName: string): Promise<any>;
    deleteRule(name: string): Promise<any>;
    selectRule(name: string): Promise<any>;
    unselectRule(name: string): Promise<any>;
    disableAllRules(disabled: boolean): Promise<any>;
    createGroup(name: string): Promise<any>;
    renameGroup(name: string, newName: string): Promise<any>;
    deleteGroup(name: string): Promise<any>;
    moveRuleToGroup(ruleName: string, groupName: string): Promise<any>;
    moveRuleOutOfGroup(ruleName: string): Promise<any>;
    getAllValues(): Promise<any[]>;
    getValueList(): Promise<{
        index: number;
        name: string;
    }[]>;
    getValue(name: string): Promise<any>;
    createValue(name: string): Promise<any>;
    updateValue(name: string, value: string): Promise<any>;
    renameValue(name: string, newName: string): Promise<any>;
    deleteValue(name: string): Promise<any>;
    createValueGroup(name: string): Promise<any>;
    renameValueGroup(name: string, newName: string): Promise<any>;
    deleteValueGroup(name: string): Promise<any>;
    moveValueToGroup(valueName: string, groupName: string): Promise<any>;
    moveValueOutOfGroup(valueName: string): Promise<any>;
    getStatus(): Promise<any>;
    toggleHttpsInterception(enabled: boolean): Promise<any>;
    toggleHttp2(enabled: boolean): Promise<any>;
    toggleMultiRuleMode(enabled: boolean): Promise<any>;
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
    private fetchDataPage;
    /**
     * 抓包概览查询：跨多页扫描最近的请求，按 host / path / app(User-Agent) / method / 状态码 / 时间窗口过滤，
     * 返回精简的概览列表（每条仅含关键字段，不含 body），适合 AI 快速浏览。完整内容用 getRequestDetail(id) 获取。
     */
    getInterceptData(options?: {
        url?: string;
        host?: string;
        path?: string;
        app?: string;
        method?: string;
        statusCode?: number;
        startTime?: number;
        endTime?: number;
        count?: number;
        scanLimit?: number;
    }): Promise<{
        total: number;
        scanned: number;
        summaries: any[];
    }>;
    /**
     * 解析抓包 URL 为 host / path。
     * 兼容三种形态：标准 URL（https://host/path）、CONNECT 隧道（host:443，无 scheme）、
     * 以及 whistle 内部的 tunnel:// 前缀。
     */
    private parseUrl;
    /** 把一条原始抓包 item 压缩成概览对象（无 body）。 */
    private toSummary;
    /** 概览级过滤：host / path / app / method / 状态码 / 时间窗口 / url 关键字（正则）。 */
    private matchSummary;
    /**
     * 按抓包 id 获取单条请求的完整详情（含请求/响应头、解码后的 body、计时信息）。
     * 用 get-data 的 ids= 参数直接按 id 取回完整 item（无 get-session 的就绪门槛限制）。
     */
    getRequestDetail(id: string, options?: {
        maxBodyLength?: number;
    }): Promise<any>;
    /**
     * 组装单侧（req/res）的 body 信息。在 decodeBody 之上补充 bodyOmitted 提示：
     * 当 size>0 却拿不到 body 时，多半是 body 超过了 whistle 自身的抓包留存上限（默认约 2MB，
     * 见 whistle/lib/inspectors/data.js 的 MAX_REQ_BODY_SIZE/MAX_RES_BODY_SIZE），whistle 只记录了
     * size 而未保留内容——此时 body 为空属正常，不代表请求真的没有内容。
     */
    private buildBodyInfo;
    /**
     * 解码抓包 body：base64 -> Buffer ->（按 content-encoding 解压）-> 文本。
     * 二进制内容（图片等）以 base64 形式返回，并标注 encoding=base64。
     */
    private decodeBody;
    /** 粗略判断 Buffer 是否为可读文本（无 content-type 时的兜底）。 */
    private isProbablyText;
    replayRequest(options: {
        url: string;
        method?: string;
        headers?: string;
        body?: string;
        useH2?: boolean;
    }): Promise<any>;
    getClientInfo(): PidInfo | null;
}
export {};
