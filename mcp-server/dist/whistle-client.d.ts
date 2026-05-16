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
    getInterceptData(options?: {
        startTime?: string;
        count?: number;
        lastRowId?: string;
    }): Promise<any>;
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
